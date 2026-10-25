(()=>{
// The market machine: a pastel vending machine, an ice-block stall at the school fair, a supply and demand graph,
// and a values continuum for a social inquiry. Needs and wants, scarcity, opportunity cost, producers and consumers, perspectives.
const fmt=(x,d=0)=>{let v=Number(x);if(Math.abs(v)<0.5*Math.pow(10,-d))v=0;return v.toLocaleString("en-NZ",{maximumFractionDigits:d,minimumFractionDigits:d})};
const $$=v=>"$"+fmt(v,2);
const RM=matchMedia("(prefers-reduced-motion: reduce)").matches;
// the bench figure look (StudyKit.fig): a frosted peach acrylic vending machine and stall, product colours for the goods, navy ink
const F=StudyKit.fig,PAL=F.palette,PEACH=PAL.case.peach,PD=F.deep(PEACH),AXIS="#8F9BAA",OL="#5B5F7E";
const INK="#262E5C",ROSE="#6E6A86",PINK=PAL.product.strawberry,PINKD="#B5466F",BLUSH=PAL.case.blush,MINT=PAL.product.lime,MINTD="#2A7D63",LILAC=PAL.case.lavender,LILACD="#6A50BE",SUN=PAL.product.butter,SUND="#D9A932",SKY=PAL.product.blueberry,SKYD="#3A6FB8",CREAM=PAL.paper,CORAL=PAL.product.peach;
const SKIN=["#F2D0B4","#D9A47E","#B07650","#E8B48A","#8D5A3B"];
// ---------- sound: kit sounds after a tap, plus a tiny coin clink
let gest=false;["pointerdown","keydown"].forEach(e=>addEventListener(e,()=>{gest=true},{capture:true}));
const muted=()=>{try{return localStorage.getItem("studysound")==="off"}catch(e){return false}};
const sfx=n=>{if(!gest)return;try{window.StudyKit&&StudyKit.sfx&&StudyKit.sfx(n)}catch(e){}};
let AC=null;
function blip(f,d=.06,type="sine",vol=.04,f2,when=0){if(!gest||muted())return;try{if(window.StudyKit&&StudyKit.tone)return StudyKit.tone(f,d,type,vol,when,f2);AC=AC||new(window.AudioContext||window.webkitAudioContext)();if(AC.state==="suspended")AC.resume();
  const t=AC.currentTime+when,o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(AC.destination);o.start(t);o.stop(t+d+.03)}catch(e){}}
const clink=()=>{blip(2400,.08,"triangle",.025);blip(3100,.12,"sine",.018,null,.06)};
// ---------- text styles that grow on phones
const st=document.createElement("style");st.textContent=`
.mk-s{font:500 11px var(--mono);letter-spacing:.03em}.mk-l{font:600 12.5px var(--mono);letter-spacing:.04em}.mk-t{font:600 15px var(--mono)}.mk-b{font:600 22px var(--display);letter-spacing:-.01em}.mk-m{font:500 14px var(--display)}
@media (max-width:820px){.mk-s{font-size:16px}.mk-l{font-size:17px}.mk-t{font-size:20px}.mk-b{font-size:28px}.mk-m{font-size:20px}.mk-desk{display:none}}
@media (min-width:821px){.mk-phone{display:none}}`;document.head.appendChild(st);
// ---------- the vending machine's stock
const ITEMS=[
 {id:"water",n:"Water bottle",p:3,need:true,why:"Water: your body can't survive without it."},
 {id:"lolly",n:"Lollies",p:3,need:false,why:"Tasty, but you can live without them."},
 {id:"sand",n:"Sandwich",p:6,need:true,why:"Food: you need it for energy and to grow."},
 {id:"game",n:"Game credit",p:10,need:false,why:"Fun, but not needed to survive."},
 {id:"jacket",n:"Rain jacket",p:25,need:true,why:"Clothing: it protects you from the weather."},
 {id:"tea",n:"Bubble tea",p:7,need:false,why:"A treat. You'd survive fine without it."},
 {id:"aid",n:"Plasters",p:4,need:true,why:"Health care: keeping cuts clean keeps you well."},
 {id:"phones",n:"Headphones",p:30,need:false,why:"A want, even when it feels like a need!"}];
const IDX=Object.fromEntries(ITEMS.map((x,i)=>[x.id,i]));
// ---------- the market for ice blocks: Qd = 120 + 20d − 40P, Qs = −20 + 20s + 40P (per hour)
const Qd=(P,d=s.dS)=>Math.max(0,120+20*d-40*P),Qs=(P,u=s.sS)=>Math.max(0,-20+20*u+40*P);
const eqP=()=>(140+20*s.dS-20*s.sS)/80,eqQ=()=>Qd(eqP());
const COST=0.5,FEE=10;const demandAt=P=>Math.max(0,120-40*P),profit=P=>(P-COST)*demandAt(P)-FEE;
// ---------- the inquiry: fictional people, a fictional reserve
const PEOPLE=[
 {id:"grace",n:"Grace",who:"bird-count volunteer",st:-1.8,row:0,c:MINT,q:"Kererū and tūī nest in that bush. New trails and noise would disturb them.",v:["protecting native species","the environment"],because:"she values protecting native species and thinks trails and noise would disturb the kererū and tūī nesting there"},
 {id:"peter",n:"Peter",who:"lives next to the reserve",st:-1.15,row:1,c:SKY,q:"It's a quiet place now. I'm worried about noise and cars parked up my street every weekend.",v:["peace and quiet","safety"],because:"he values peace and quiet and is worried about noise and traffic in his street"},
 {id:"huia",n:"Huia",who:"environment lead for the local hapū",st:-0.35,row:0,c:SUN,q:"The reserve and its stream matter to our hapū. Talk with us from the start, protect the stream, and we could support it.",v:["kaitiakitanga (guardianship)","partnership"],because:"she values kaitiakitanga and partnership, so she wants the hapū involved from the start and the stream protected"},
 {id:"plan",n:"Planner",who:"council planner",st:0.05,row:1,c:"#D9CFD3",q:"It would cost ratepayers about $400 000. We need to hear from everyone before deciding.",v:["fairness","careful spending"],because:"they value fairness and careful spending of ratepayers' money"},
 {id:"tavita",n:"Tavita",who:"parent of two",st:0.6,row:0,c:CORAL,q:"My kids would love it, as long as walkers and riders have separate paths.",v:["family wellbeing","safety"],because:"he values his family's wellbeing, as long as the paths are safe for everyone"},
 {id:"lena",n:"Lena",who:"runs the café in town",st:1.2,row:1,c:LILAC,q:"Riders from out of town would stop for coffee and lunch. That means more jobs here.",v:["economic growth","community"],because:"she values economic growth and thinks visitors would bring business and jobs to the town"},
 {id:"sam",n:"Sam, 14",who:"mountain biker",st:1.8,row:0,c:PINK,q:"There's nowhere safe to ride near here. A bike park would get heaps of us outside.",v:["health and wellbeing","fun and recreation"],because:"he values young people's health and wellbeing and says there's nowhere safe to ride nearby"}];
const PX=st=>400+st*172,PY=row=>row?236:178;
// ---------- state
const s={sort:ITEMS.map(()=>0),last:-1,rank:[IDX.tea,IDX.game,IDX.sand,IDX.lolly],budget:20,sp:1.25,P:1.25,dS:0,sS:0,settle:false,setT:0,sel:"grace",you:0,tool:"persp",t:0,view:"needs",bump:{},sale:0};
// what the wallet buys: go down your ranking and buy each thing you can still afford
function shop(){let m=s.budget;const got=[],skip=[];s.rank.forEach(i=>{if(ITEMS[i].p<=m){m-=ITEMS[i].p;got.push(i)}else skip.push(i)});return{got,skip,left:m,oc:skip.length?skip[0]:-1}}
const sortScore=()=>{let done=0,right=0;s.sort.forEach((v,i)=>{if(v){done++;if((v===1)===ITEMS[i].need)right++}});return{done,right}};
// ---------- icons (centred on x,y, about 44 px)
function icon(id,x,y,k=1){const g=`<g transform="translate(${x},${y}) scale(${k})">`;let o="";
  if(id==="water")o=`<rect x="-9" y="-14" width="18" height="32" rx="6" fill="${SKY}" stroke="${OL}" stroke-width="1.5"/><rect x="-5" y="-21" width="10" height="7" rx="2" fill="${SKYD}" stroke="${OL}" stroke-width="1.2"/><path d="M-9,0 h18" stroke="#fff" stroke-width="3" opacity=".7"/>`;
  if(id==="lolly")o=`<path d="M-20,-6 l9,6 l-9,6z M20,-6 l-9,6 l9,6z" fill="${PINK}" stroke="${OL}" stroke-width="1.2"/><circle r="10" fill="${SUN}" stroke="${OL}" stroke-width="1.5"/><path d="M-6,-5 q6,10 12,0" fill="none" stroke="#fff" stroke-width="2"/><circle cx="12" cy="13" r="5" fill="${MINT}" stroke="${OL}" stroke-width="1"/>`;
  if(id==="sand")o=`<path d="M-18,12 L0,-16 L18,12z" fill="#F5DDA8" stroke="${OL}" stroke-width="1.5" stroke-linejoin="round"/><path d="M-13,5 L13,5" stroke="${MINTD}" stroke-width="4"/><path d="M-10,1 L10,1" stroke="${PINK}" stroke-width="3"/>`;
  if(id==="game")o=`<path d="M-19,-2 q0,-10 10,-10 h18 q10,0 10,10 l3,10 q2,8 -6,8 q-5,0 -9,-6 h-14 q-4,6 -9,6 q-8,0 -6,-8z" fill="${LILAC}" stroke="${OL}" stroke-width="1.5"/><path d="M-11,-2 h8 M-7,-6 v8" stroke="${OL}" stroke-width="2"/><circle cx="8" cy="-4" r="2.3" fill="${PINK}"/><circle cx="13" cy="0" r="2.3" fill="${MINTD}"/>`;
  if(id==="jacket")o=`<path d="M-8,-17 h16 l12,8 l-4,10 l-5,-3 v22 h-22 v-22 l-5,3 l-4,-10z" fill="${SUN}" stroke="${OL}" stroke-width="1.5" stroke-linejoin="round"/><path d="M0,-17 v37" stroke="${OL}" stroke-width="1.2"/><path d="M-6,-17 q6,8 12,0" fill="#F9D995" stroke="${OL}" stroke-width="1.2"/>`;
  if(id==="tea")o=`<path d="M-12,-10 h24 l-3,28 h-18z" fill="#F3D9C2" stroke="${OL}" stroke-width="1.5"/><path d="M-14,-12 h28" stroke="${OL}" stroke-width="2.4" stroke-linecap="round"/><path d="M3,-12 l5,-12" stroke="${PINK}" stroke-width="3" stroke-linecap="round"/>${[[-5,12],[0,9],[5,13],[-2,15],[4,7]].map(([a,b])=>`<circle cx="${a}" cy="${b}" r="2.4" fill="${INK}"/>`).join("")}`;
  if(id==="aid")o=`<rect x="-16" y="-12" width="32" height="26" rx="5" fill="#fff" stroke="${OL}" stroke-width="1.5"/><path d="M-6,-12 v-4 h12 v4" fill="none" stroke="${OL}" stroke-width="1.5"/><path d="M0,-6 v14 M-7,1 h14" stroke="${PINK}" stroke-width="4.5"/>`;
  if(id==="phones")o=`<path d="M-15,8 v-6 a15,15 0 0 1 30,0 v6" fill="none" stroke="${OL}" stroke-width="3"/><rect x="-19" y="2" width="9" height="15" rx="4" fill="${MINT}" stroke="${OL}" stroke-width="1.5"/><rect x="10" y="2" width="9" height="15" rx="4" fill="${MINT}" stroke="${OL}" stroke-width="1.5"/>`;
  return g+`<ellipse cx="4" cy="22" rx="16" ry="3" fill="${PAL.shadow}" opacity=".12"/>`+o+"</g>"}
function person(x,y,c,k=1,face="smile",hold=false){// a simple painted figure: head, hoodie, legs (no face)
  const m=F.mat("painted",c),sk=SKIN[[...String(c)].reduce((a,ch)=>a+ch.charCodeAt(0),0)%SKIN.length];
  return `<g transform="translate(${x},${y}) scale(${k})"><ellipse cx="7" cy="43" rx="15" ry="3.2" fill="${PAL.shadow}" opacity=".16"/><path d="M-5,33 v8 M5,33 v8" stroke="#4E4868" stroke-width="3.6" stroke-linecap="round"/><path d="M-14,35 v-9 q0,-12 14,-12 q14,0 14,12 v9z" fill="${c}" stroke="${m.stroke}" stroke-width="1.2"/><path d="M-9,27 q1,-6 6,-8" stroke="#fff" stroke-opacity=".55" stroke-width="2.2" fill="none" stroke-linecap="round"/><circle cx="0" cy="0" r="10.5" fill="${sk}" stroke="#A9805F" stroke-width="1"/><path d="M-10.5,-1 a10.5,10.5 0 0 1 21,0 q-10.5,-5 -21,0z" fill="#4E4868"/>${hold?`<g transform="translate(15,18)"><rect x="-3" y="-14" width="7" height="13" rx="3" fill="${PINK}" stroke="${PINKD}" stroke-width="1"/><line x1="0.5" y1="-1" x2="0.5" y2="5" stroke="#C9A97E" stroke-width="2"/></g>`:""}</g>`}
function iceblock(x,y,c,k=1,melt=0){const m=F.mat("painted",c);return `<g transform="translate(${x},${y}) scale(${k})"><rect x="-7" y="-20" width="14" height="22" rx="6" fill="${c}" stroke="${m.stroke}" stroke-width="1.1"/><path d="M-3.5,-15 v11" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".6"/>${melt?`<path d="M-4,2 q0,${4+melt*4} 2,${6+melt*4}" fill="none" stroke="${c}" stroke-width="2.5" stroke-linecap="round"/><ellipse cx="0" cy="${12+melt*2}" rx="${6+melt*4}" ry="2" fill="${c}" opacity=".7"/>`:""}<rect x="-1.5" y="2" width="3" height="9" rx="1" fill="#C9A97E"/></g>`}
// depth for a flat card drawn by the caller: lit top, shaded side, floor shadow
function slab(x,y,w,h,c,d=8,r=0,sh=true){const m=F.mat("plastic",c),i=Math.min(r*0.35,w/4),dy=-0.55*d,st=F.mat("plastic",c==="#FFFFFF"?"#D9DEE8":c).stroke;
  return (sh?F.shadow(x+i,y+h,w-i+d,{opacity:.12,len:Math.min(26,Math.max(12,h*0.3))}):"")+`<path d="M${x+i},${y} l${d},${dy} h${w-2*i} l${-d},${-dy}z" fill="${m.hi}" stroke="${st}" stroke-opacity=".6" stroke-linejoin="round"/><path d="M${x+w},${y+i} l${d},${dy} v${Math.max(0,h-2*i)} l${-d},${-dy}z" fill="${c==="#FFFFFF"?"#E3E8F0":m.shade}" stroke="${st}" stroke-opacity=".6" stroke-linejoin="round"/>`}
const IB=[PINK,MINT,SUN,LILAC,SKY,CORAL];
// ---------- the vending machine
const slot=i=>({x:84+(i%4)*62,y:118+Math.floor(i/4)*124});
function machine(mode){// a frosted peach acrylic vending machine on steel feet, its works visible through the case
  let o=F.shadow(26,412,392,{len:130,opacity:.2})+F.box(46,406,40,6,{colour:PAL.steel,kind:"metal",d:10,shadow:false})+F.box(330,406,40,6,{colour:PAL.steel,kind:"metal",d:10,shadow:false});
  o+=F.acrylic(26,16,370,392,{tint:PEACH,d:22,r:24,shadow:false,opacity:.5});
  o+=`<path d="M26,62 V40 a24,24 0 0 1 24,-24 h322 a24,24 0 0 1 24,24 v22z" fill="${PEACH}" stroke="${PD}" stroke-width="1.3"/><path d="M50,24 h140" stroke="#fff" stroke-opacity=".85" stroke-width="2.4" stroke-linecap="round"/>`;
  o+=`<rect x="114" y="27" width="194" height="26" rx="9" fill="#fff" fill-opacity=".9" stroke="${PD}" stroke-width="1.2"/><text class="mk-l" x="211" y="46" text-anchor="middle" style="fill:${INK}">THE CHOICE MACHINE</text>`;
  o+=`<rect x="46" y="72" width="256" height="252" rx="12" fill="#fff" fill-opacity=".62" stroke="${PD}" stroke-width="1.4"/><path d="M58,82 h96" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>`;
  for(let r=0;r<2;r++)o+=F.box(50,188+r*124,244,4,{colour:PAL.steel,kind:"metal",d:6,shadow:false});
  const sh=shop();
  ITEMS.forEach((it,i)=>{const p=slot(i),bm=s.bump[i]?Math.max(0,1-(performance.now()-s.bump[i])/450):0,k=1+0.25*Math.sin(bm*Math.PI);
    let dim=false,badge="";
    if(mode==="needs"){const v=s.sort[i];if(v)badge=`<rect x="${p.x-25}" y="${p.y-46}" width="50" height="18" rx="9" fill="${v===1?MINT:LILAC}" stroke="${F.deep(v===1?MINT:LILAC)}"/><text class="mk-s" x="${p.x}" y="${p.y-33}" text-anchor="middle" style="fill:${INK}">${v===1?"NEED":"WANT"}</text>`}
    if(mode==="choice"){const r=s.rank.indexOf(i);if(r>=0){const got=sh.got.includes(i),oc=sh.oc===i;badge=`<circle cx="${p.x+22}" cy="${p.y-30}" r="12" fill="${oc?SUN:got?MINT:"#fff"}" stroke="${oc?F.deep(SUN):got?F.deep(MINT):"#B9B3CF"}" stroke-width="1.4"/><text class="mk-l" x="${p.x+22}" y="${p.y-25.5}" text-anchor="middle" style="fill:${INK}">${r+1}</text>`;dim=got}}
    const lab=mode==="needs"?`${it.n}, $${it.p}, ${s.sort[i]===1?"sorted as a need":s.sort[i]===2?"sorted as a want":"not sorted yet"}. Press to sort.`:`${it.n}, $${it.p}${s.rank.indexOf(i)>=0?`, ranked ${s.rank.indexOf(i)+1}`:", not ranked"}. Press to rank or unrank.`;
    o+=`<g tabindex="0" role="button" data-tap="${p.x},${p.y}" aria-label="${lab}"><rect x="${p.x-30}" y="${p.y-50}" width="60" height="108" rx="10" fill="transparent"/>`;
    o+=`<path d="M${p.x-24},${p.y+30} ${[0,1,2,3,4,5].map(k=>`q4,-6 8,0`).join(" ")}" fill="none" stroke="${F.mat("metal",PAL.copper).stroke}" stroke-width="3.2"/><path d="M${p.x-24},${p.y+30} ${[0,1,2,3,4,5].map(k=>`q4,-6 8,0`).join(" ")}" fill="none" stroke="${PAL.copper}" stroke-width="1.8"/>`;
    o+=`<g opacity="${dim?.28:1}">${icon(it.id,p.x,p.y,k)}</g>${badge}`;
    o+=`<rect x="${p.x-20}" y="${p.y+38}" width="40" height="18" rx="5" fill="#fff" stroke="${PD}" stroke-opacity=".7"/><text class="mk-s" x="${p.x}" y="${p.y+51}" text-anchor="middle" style="fill:${INK}">$${it.p}</text></g>`});
  // the works: a mint-plastic housing with a screen, keypad, coin slot and a small circuit board
  o+=F.box(310,66,72,254,{colour:PAL.mintPlastic,kind:"plastic",d:8,r:8,shadow:false});
  o+=`<rect x="314" y="72" width="64" height="40" rx="6" fill="${INK}"/><text class="mk-l" x="346" y="98" text-anchor="middle" style="fill:${SUN}">${mode==="choice"?"$"+sh.left:"$"+s.budget}</text>`;
  for(let r=0;r<4;r++)for(let c=0;c<3;c++)o+=`<circle cx="${328+c*18}" cy="${134+r*20}" r="6.5" fill="#9DB5A8"/><circle cx="${328+c*18}" cy="${132+r*20}" r="6.5" fill="#fff" stroke="#7FA392" stroke-width="1"/>`;
  o+=F.box(330,222,32,44,{colour:PAL.steel,kind:"metal",d:5,r:6,shadow:false})+`<rect x="344" y="230" width="4" height="26" rx="2" fill="${INK}"/>`;
  o+=`<rect x="320" y="282" width="52" height="28" rx="3" fill="${PAL.pcb}" stroke="#3F7A55"/><rect x="328" y="288" width="14" height="10" rx="1.5" fill="#2F3B4A"/><rect x="348" y="290" width="16" height="6" rx="1.5" fill="#2F3B4A"/><path d="M326,304 h40" stroke="${PAL.copper}" stroke-width="1.4"/>`;
  o+=`<rect x="46" y="338" width="256" height="48" rx="10" fill="${PAL.steel}" stroke="${PAL.steelDark}" stroke-width="1.4"/><rect x="54" y="344" width="214" height="36" rx="7" fill="#AEB8C5" stroke="${PAL.steelDark}"/><path d="M58,348 h120" stroke="#fff" stroke-opacity=".6" stroke-width="2" stroke-linecap="round"/><text class="mk-s" x="290" y="367" text-anchor="end" style="fill:${INK}">PUSH</text>`;
  if(mode==="choice")sh.got.forEach((i,n)=>{o+=icon(ITEMS[i].id,72+n*44,362,0.62)});
  return o}
function needsSide(){const sc=sortScore(),all=sc.done===ITEMS.length;let o="";
  [["NEEDS",1,MINT,430],["WANTS",2,LILAC,618]].forEach(([n,v,c,x])=>{o+=F.acrylic(x,118,166,282,{tint:PEACH,d:12,r:16,opacity:.4})+`<path d="M${x},160 V134 a16,16 0 0 1 16,-16 h134 a16,16 0 0 1 16,16 V160z" fill="${c}" stroke="${F.deep(c)}" stroke-width="1.2"/><path d="M${x+14},126 h70" stroke="#fff" stroke-opacity=".7" stroke-width="2.2" stroke-linecap="round"/><text class="mk-t" x="${x+83}" y="146" text-anchor="middle" style="fill:${INK}">${n}</text>`;
    const list=ITEMS.map((it,i)=>i).filter(i=>s.sort[i]===v);list.forEach((i,n)=>{const cx=x+44+(n%2)*78,cy=200+Math.floor(n/2)*58,bm=s.bump[i]?Math.max(0,1-(performance.now()-s.bump[i])/450):0;
      o+=icon(ITEMS[i].id,cx,cy-(bm>0?Math.sin(bm*Math.PI)*16:0),0.85);
      if(all){const ok=(v===1)===ITEMS[i].need;o+=`<circle cx="${cx+22}" cy="${cy-18}" r="10" fill="${ok?MINTD:"#C25E45"}"/><text class="mk-s" x="${cx+22}" y="${cy-14}" text-anchor="middle" style="fill:#fff">${ok?"✓":"✗"}</text>`}})});
  o+=all?`<text class="mk-l" x="430" y="40" style="fill:${ROSE}">YOUR SORT</text>`:`<text class="mk-l mk-desk" x="430" y="40" style="fill:${ROSE}">TAP AN ITEM: ONCE = NEED, TWICE = WANT</text><text class="mk-l mk-phone" x="430" y="40" style="fill:${ROSE}">TAP: 1× NEED, 2× WANT</text>`;
  o+=`<text class="mk-b" x="430" y="80" style="fill:${INK}">${all?`${sc.right} of ${ITEMS.length} right`:`${sc.done} of ${ITEMS.length} sorted`}</text>`;
  if(all&&sc.right<ITEMS.length)o+=`<text class="mk-s" x="430" y="104" style="fill:${ROSE}">Tap a ✗ item to move it</text>`;
  return o}
function choiceSide(){const sh=shop();let o=`<text class="mk-l" x="430" y="40" style="fill:${ROSE}">WALLET</text><text class="mk-b" x="430" y="74" style="fill:${INK}">$${s.budget} to spend</text>`;
  o+=F.shadow(430,104+Math.max(4,s.rank.length)*40+60,346,{len:22,opacity:.1})+`<path d="M430,92 h346 v${Math.max(4,s.rank.length)*40+60} l-12,8 l-12,-8 l-12,8 l-12,-8 l-12,8 l-12,-8 l-12,8 l-12,-8 l-12,8 l-12,-8 l-12,8 l-12,-8 l-12,8 l-12,-8 l-12,8 l-12,-8 l-12,8 l-12,-8 l-12,8 l-12,-8 l-12,8 l-12,-8 l-12,8 l-12,-8 l-12,8 l-12,-8 l-10,6 z" fill="#fff" stroke="${INK}" stroke-opacity=".35"/>`;
  if(!s.rank.length)o+=`<text class="mk-m" x="446" y="130" style="fill:${ROSE}">Tap items in the machine in the</text><text class="mk-m" x="446" y="152" style="fill:${ROSE}">order you want them.</text>`;
  s.rank.forEach((i,n)=>{const y=124+n*40,got=sh.got.includes(i),oc=sh.oc===i;
    if(oc)o+=`<rect x="438" y="${y-24}" width="330" height="36" rx="8" fill="${SUN}" fill-opacity=".45"/>`;
    o+=`<text class="mk-l" x="446" y="${y}" style="fill:${INK}">${n+1}  ${ITEMS[i].n}</text><text class="mk-l" x="660" y="${y}" text-anchor="end" style="fill:${INK}">$${ITEMS[i].p}</text>`;
    o+=`<text class="mk-s" x="760" y="${y}" text-anchor="end" style="fill:${got?MINTD:oc?"#8A5A12":ROSE}">${got?"BOUGHT":oc?"GAVE UP":"NO MONEY"}</text>`});
  const y=124+Math.max(4,s.rank.length)*40;o+=`<line x1="446" x2="760" y1="${y-22}" y2="${y-22}" stroke="${INK}" stroke-dasharray="3 3" stroke-opacity=".5"/><text class="mk-l" x="446" y="${y}" style="fill:${INK}">MONEY LEFT</text><text class="mk-l" x="660" y="${y}" text-anchor="end" style="fill:${INK}">$${sh.left}</text>`;
  if(sh.oc>=0){const p=slot(sh.oc);o+=`<g transform="rotate(-8 ${p.x} ${p.y+24})"><rect x="${p.x-34}" y="${p.y+12}" width="68" height="24" rx="4" fill="#fff" stroke="#C25E45" stroke-width="2.5"/><text class="mk-s" x="${p.x}" y="${p.y+29}" text-anchor="middle" style="fill:#C25E45;font-weight:700">GIVEN UP</text></g>`}
  return o}
// ---------- the stall
function stallScene(){let o=F.box(16,352,566,6,{colour:"#D6EDBE",kind:"painted",d:18,r:2,shadow:false});
  o+=`<circle cx="520" cy="56" r="26" fill="${SUN}" opacity=".5"/>`;
  // stall: wooden posts, a striped awning and a peach roof
  o+=F.cyl(62,112,4.5,240,{colour:"#C9A072",kind:"wood",shadowLen:60})+F.cyl(296,112,4.5,240,{colour:"#C9A072",kind:"wood",shadowLen:60});
  for(let i=0;i<7;i++){const c=i%2?"#FFFFFF":PINK;o+=`<path d="M${44+i*39},76 h39 v40 a19.5,14 0 0 1 -39,0z" fill="${c}" stroke="${i%2?"#D9C9CF":PINKD}" stroke-opacity=".7" stroke-width="1.1"/><path d="M${44+i*39},80 h39" stroke="${F.mat("painted",c).shade}" stroke-opacity=".5" stroke-width="5"/>`}
  o+=`<path d="M318,76 l14,-8 L193,28 L179,36z" fill="${F.mat("painted",PEACH).shade}" stroke="${PD}" stroke-width="1.2" stroke-linejoin="round"/><path d="M40,76 L179,36 L318,76z" fill="${PEACH}" stroke="${PD}" stroke-width="1.3" stroke-linejoin="round"/><path d="M80,66 L170,40" stroke="#fff" stroke-opacity=".7" stroke-width="2.4" stroke-linecap="round"/>`;
  o+=person(178,206,MINT,1.15,"smile")+`<text class="mk-s" x="178" y="186" text-anchor="middle" style="fill:${ROSE}">YOU</text>`;
  o+=F.box(44,250,270,104,{colour:"#FFF3EA",kind:"painted",d:16,r:8,shadowLen:80})+`<rect x="56" y="266" width="246" height="36" rx="6" fill="#fff" stroke="${PD}" stroke-width="1.2"/>`;
  o+=`<text class="mk-l" x="179" y="290" text-anchor="middle" style="fill:${INK}">ICE BLOCKS ${$$(s.sp)}</text>`;
  for(let i=0;i<6;i++)o+=iceblock(84+i*38,334,IB[i],0.9);
  o+=F.box(226,214,76,36,{colour:SUN,kind:"painted",d:10,r:6,shadow:false})+`<text class="mk-s" x="264" y="237" text-anchor="middle" style="fill:${INK}">${$$(s.sale)}</text>`;
  // the queue of consumers
  const Q=demandAt(s.sp),N=Math.round(Q/10),gap=Math.min(46,250/Math.max(1,N)),ph=(s.t%1.4)/1.4,shift=ph<.5?0:Math.min(1,(ph-.5)*2.6);
  for(let i=N-1;i>=0;i--){const x=338+(i-shift)*gap;if(i===0&&shift>0){const lx=338-shift*130;o+=person(lx,312,IB[(i+Math.floor(s.t/1.4))%6],0.95,"smile",true)}else o+=person(x,312,IB[(i+Math.floor(s.t/1.4))%6],0.95,"none")}
  if(N>0&&ph<.5&&!RM){const f=ph/.5;o+=`<g opacity="${1-f*.2}">${iceblock(300+f*38,262-Math.sin(f*Math.PI)*30,IB[Math.floor(s.t/1.4)%6],.8)}</g><circle cx="${330-f*66}" cy="${280-Math.sin(f*Math.PI)*40}" r="6" fill="${SUN}" stroke="${SUND}" stroke-width="1.4"/>`}
  if(N===0)o+=`<text class="mk-m" x="330" y="330" style="fill:${ROSE}">No one's buying at this price.</text>`;
  // circular flow
  const bx=604;o+=F.box(bx,34,176,64,{colour:PAL.case.mint,kind:"plastic",d:10,r:12,shadow:false})+`<text class="mk-l" x="${bx+88}" y="62" text-anchor="middle" style="fill:${INK}">PRODUCER</text><text class="mk-s mk-desk" x="${bx+88}" y="82" text-anchor="middle" style="fill:${INK}">you, at the stall</text>`;
  o+=F.box(bx,252,176,64,{colour:LILAC,kind:"plastic",d:10,r:12,shadow:false})+`<text class="mk-l" x="${bx+88}" y="280" text-anchor="middle" style="fill:${INK}">CONSUMERS</text><text class="mk-s mk-desk" x="${bx+88}" y="300" text-anchor="middle" style="fill:${INK}">students buying</text>`;
  o+=`<path d="M${bx+150},104 C${bx+190},150 ${bx+190},200 ${bx+150},246" fill="none" stroke="${PINKD}" stroke-width="3" stroke-opacity=".75"/><path d="M${bx+150},246 l-1,-13 l11,6z" fill="${PINKD}"/>`;
  o+=`<path d="M${bx+26},246 C${bx-14},200 ${bx-14},150 ${bx+26},104" fill="none" stroke="#C9922D" stroke-width="3"/><path d="M${bx+26},104 l1,13 l-11,-6z" fill="#C9922D"/>`;
  o+=`<text class="mk-l" x="${bx+156}" y="164" style="fill:${PINKD}" text-anchor="end">ICE BLOCKS ↓</text><text class="mk-l" x="${bx+20}" y="200" style="fill:#8A6510">↑ MONEY</text>`;
  if(N>0)for(let k=0;k<3;k++){const f=((s.t*0.5+k/3)%1);const bez=(p0,p1,p2,p3,t)=>(1-t)**3*p0+3*(1-t)**2*t*p1+3*(1-t)*t*t*p2+t**3*p3;
    o+=iceblock(bez(bx+150,bx+190,bx+190,bx+150,f),bez(104,150,200,246,f)+8,IB[k],.55);o+=`<circle cx="${bez(bx+26,bx-14,bx-14,bx+26,f)}" cy="${bez(246,200,150,104,f)}" r="5" fill="${SUN}" stroke="${SUND}" stroke-width="1.3"/>`}
  o+=`<text class="mk-s mk-desk" x="${bx+88}" y="346" text-anchor="middle" style="fill:${ROSE}">You're a consumer too,</text><text class="mk-s mk-desk" x="${bx+88}" y="362" text-anchor="middle" style="fill:${ROSE}">when you buy the fruit.</text>`;
  o+=slab(330,20,240,40,"#FFFFFF",8,10,false)+`<rect x="330" y="20" width="240" height="40" rx="10" fill="#fff" stroke="#C9C3DA"/><text class="mk-t" x="450" y="46" text-anchor="middle" style="fill:${INK}">${fmt(Q)} buyers an hour</text>`;
  return o}
// ---------- supply and demand
const G={x0:70,x1:452,y0:360,y1:34,qmax:160,pmax:3.5};const gx=q=>G.x0+q/G.qmax*(G.x1-G.x0),gy=p=>G.y0-p/G.pmax*(G.y0-G.y1);
function lineD(d){const a=[],P0=Math.max(0.25,(120+20*d-160)/40),P1=Math.min(3.4,(120+20*d)/40);return `M${gx(120+20*d-40*P0)},${gy(P0)} L${gx(120+20*d-40*P1)},${gy(P1)}`}
function lineS(u){const P0=Math.max(0.25,(20-20*u)/40+0.01),P1=Math.min(3.4,(160+20-20*u)/40);return `M${gx(-20+20*u+40*P0)},${gy(P0)} L${gx(-20+20*u+40*P1)},${gy(P1)}`}
function marketScene(){let o=F.acrylic(8,8,462,398,{tint:PEACH,d:12,r:16,opacity:.22,shadow:false});
  for(let p=0.5;p<=3.5;p+=0.5)o+=`<line x1="${G.x0}" x2="${G.x1}" y1="${gy(p)}" y2="${gy(p)}" stroke="${INK}" stroke-opacity=".09"/><text class="mk-s" x="${G.x0-8}" y="${gy(p)+4}" text-anchor="end" style="fill:${ROSE}">$${fmt(p,p%1?2:0)}</text>`;
  for(let q=0;q<=160;q+=40)o+=`<text class="mk-s" x="${gx(q)}" y="${G.y0+18}" text-anchor="middle" style="fill:${ROSE}">${q}</text>`;
  o+=`<path d="M${G.x0},${G.y1} V${G.y0} H${G.x1}" fill="none" stroke="${AXIS}" stroke-width="1.8"/><text class="mk-l" x="${G.x0-8}" y="22" text-anchor="end" style="fill:${INK}">PRICE</text><text class="mk-l" x="${G.x1}" y="${G.y0+38}" text-anchor="end" style="fill:${INK}">ICE BLOCKS AN HOUR</text>`;
  if(s.dS)o+=`<path d="${lineD(0)}" stroke="${PINK}" stroke-width="2" stroke-dasharray="5 5" opacity=".45"/>`;
  if(s.sS)o+=`<path d="${lineS(0)}" stroke="${SKYD}" stroke-width="2" stroke-dasharray="5 5" opacity=".45"/>`;
  o+=`<path d="${lineD(s.dS)}" stroke="#E27A96" stroke-width="3.5" stroke-linecap="round"/><path d="${lineS(s.sS)}" stroke="${SKYD}" stroke-width="3.5" stroke-linecap="round"/>`;
  const dEnd=Math.min(3.4,(120+20*s.dS)/40),sEnd=Math.min(3.4,(180-20*s.sS)/40);
  o+=`<text class="mk-l" x="${gx(120+20*s.dS-40*0.35)+8}" y="${gy(0.35)}" style="fill:${PINKD}">D${s.dS?"2":""}</text><text class="mk-l" x="${gx(-20+20*s.sS+40*sEnd)+8}" y="${gy(sEnd)+4}" style="fill:${SKYD}">S${s.sS?"2":""}</text>`;
  if(s.dS)o+=`<path d="M${gx(80)},${gy(1)} l${s.dS*26},0" stroke="${PINK}" stroke-width="2"/><path d="M${gx(80)+s.dS*30},${gy(1)} l${-s.dS*8},-5 v10z" fill="${PINK}"/>`;
  if(s.sS)o+=`<path d="M${gx(80)},${gy(2.75)} l${s.sS*26},0" stroke="${SKYD}" stroke-width="2"/><path d="M${gx(80)+s.sS*30},${gy(2.75)} l${-s.sS*8},-5 v10z" fill="${SKYD}"/>`;
  // equilibrium
  const E=eqP(),EQ=eqQ();o+=`<path d="M${G.x0},${gy(E)} H${gx(EQ)} V${G.y0}" fill="none" stroke="${INK}" stroke-dasharray="2 4" opacity=".5"/><circle cx="${gx(EQ)}" cy="${gy(E)}" r="6" fill="#fff" stroke="${INK}" stroke-width="2"/><text class="mk-s" x="${gx(EQ)+10}" y="${gy(E)-8}" style="fill:${INK}">E</text>`;
  // price line, quantities
  const qd=Qd(s.P),qs=Qs(s.P),y=gy(s.P);o+=`<line x1="${G.x0}" x2="${G.x1}" y1="${y}" y2="${y}" stroke="${SUND}" stroke-width="3"/><rect x="${G.x0-56}" y="${y-12}" width="50" height="24" rx="6" fill="${SUN}"/><text class="mk-l" x="${G.x0-31}" y="${y+5}" text-anchor="middle" style="fill:${INK}">${$$(s.P)}</text>`;
  o+=`<circle cx="${gx(qd)}" cy="${y}" r="6" fill="${PINK}" stroke="${INK}"/><circle cx="${gx(qs)}" cy="${y}" r="6" fill="${SKYD}" stroke="${INK}"/>`;
  if(Math.abs(qd-qs)>0.5){const a=Math.min(qd,qs),b=Math.max(qd,qs),short=qd>qs,yy=y+(short?24:-24);
    o+=`<path d="M${gx(a)},${yy} H${gx(b)}" stroke="${short?"#C25E45":"#8A5A12"}" stroke-width="2.5"/><path d="M${gx(a)},${yy-6} v12 M${gx(b)},${yy-6} v12" stroke="${short?"#C25E45":"#8A5A12"}" stroke-width="2.5"/><text class="mk-l" x="${(gx(a)+gx(b))/2}" y="${yy+(short?20:-10)}" text-anchor="middle" style="fill:${short?"#C25E45":"#8A5A12"}">${short?"SHORTAGE":"SURPLUS"} ${fmt(b-a)}</text>`}
  // the stall vignette
  const X0=486;o+=F.acrylic(X0,20,300,384,{tint:PEACH,d:12,r:16,opacity:.3});
  o+=F.cyl(X0+27,80,3.5,140,{colour:"#C9A072",kind:"wood",shadow:false})+F.cyl(X0+187,80,3.5,140,{colour:"#C9A072",kind:"wood",shadow:false});
  for(let i=0;i<5;i++){const c=i%2?"#FFFFFF":PINK;o+=`<path d="M${X0+20+i*36},50 h36 v26 a18,12 0 0 1 -36,0z" fill="${c}" stroke="${i%2?"#D9C9CF":PINKD}" stroke-opacity=".7" stroke-width="1"/><path d="M${X0+20+i*36},54 h36" stroke="${F.mat("painted",c).shade}" stroke-opacity=".5" stroke-width="4"/>`}
  o+=F.box(X0+16,170,184,56,{colour:"#FFF3EA",kind:"painted",d:10,r:6,shadow:false})+`<text class="mk-l" x="${X0+108}" y="204" text-anchor="middle" style="fill:${INK}">${$$(s.P)} EACH</text>`;
  o+=`<text class="mk-l" x="${X0+16}" y="252" style="fill:${PINKD}">WANT TO BUY  ${fmt(qd)}</text><text class="mk-l" x="${X0+16}" y="274" style="fill:${SKYD}">MADE FOR SALE ${fmt(qs)}</text>`;
  if(qd>qs+0.5){const n=Math.min(9,Math.round((qd-qs)/10));o+=`<rect x="${X0+60}" y="120" width="96" height="30" rx="6" fill="#C25E45" transform="rotate(-6 ${X0+108} 135)"/><text class="mk-l" x="${X0+108}" y="140" text-anchor="middle" style="fill:#fff" transform="rotate(-6 ${X0+108} 135)">SOLD OUT</text>`;
    for(let i=0;i<n;i++)o+=person(X0+30+(i%5)*56,316+Math.floor(i/5)*44-(i%2)*4,IB[i%6],0.78,"sad");o+=`<text class="mk-s" x="${X0+284}" y="392" text-anchor="end" style="fill:#C25E45">${fmt(qd-qs)} go without</text>`}
  else if(qs>qd+0.5){const n=Math.min(14,Math.round((qs-qd)/10));for(let i=0;i<n;i++)o+=iceblock(X0+34+(i%7)*38,336+Math.floor(i/7)*42,IB[i%6],.95,1+(i%3)*.4);o+=`<text class="mk-s" x="${X0+284}" y="392" text-anchor="end" style="fill:#8A5A12">${fmt(qs-qd)} left over, melting</text>`}
  else{o+=`<text class="mk-b" x="${X0+150}" y="314" text-anchor="middle" style="fill:${MINTD}">Just right</text><text class="mk-s" x="${X0+150}" y="336" text-anchor="middle" style="fill:${INK}">no queue, no leftovers</text>`;for(let i=0;i<4;i++)o+=person(X0+90+i*40,352,IB[i+2],.7,"smile",true)}
  return o}
// ---------- the inquiry
function wrap(t,n){const w=t.split(" "),L=[];let c="";w.forEach(x=>{if((c+" "+x).trim().length>n){L.push(c.trim());c=x}else c+=" "+x});if(c.trim())L.push(c.trim());return L}
function inquiryScene(){let o="";
  o+=`<text class="mk-s" x="400" y="26" text-anchor="middle" style="fill:${ROSE}">THE ISSUE (MADE UP)</text><text class="mk-b" x="400" y="54" text-anchor="middle" style="fill:${INK}">Should Kōwhai Reserve get a bike park?</text>`;
  const P=PEOPLE.find(p=>p.id===s.sel);
  if(P){const L1=wrap(`${P.n} (${P.who}): “${P.q}”`,78),L2=wrap(`${P.n}: “${P.q}”`,48);
    [[L1,"mk-desk",19],[L2,"mk-phone",22]].forEach(([L,cl,lh])=>{const h=L.length*lh+18;o+=`<g class="${cl}"><rect x="34" y="66" width="732" height="${h}" rx="12" fill="#fff" stroke="#B9B3CF" stroke-width="1.4"/>${L.map((l,i)=>`<text class="mk-m" x="50" y="${88+i*lh}" style="fill:${INK}">${l}</text>`).join("")}<path d="M${Math.max(60,Math.min(740,PX(P.st)))-9},${66+h} l9,12 l9,-12" fill="#fff" stroke="#B9B3CF" stroke-width="1.4"/><rect x="${Math.max(60,Math.min(740,PX(P.st)))-10}" y="${64+h}" width="20" height="3" fill="#fff"/></g>`})}
  // continuum
  const ly=318;o+=`<defs><linearGradient id="mkc" x1="0" x2="1"><stop offset="0" stop-color="${SKY}"/><stop offset=".5" stop-color="#EDE4E7"/><stop offset="1" stop-color="${CORAL}"/></linearGradient></defs>${F.shadow(64,ly+7,684,{len:26,opacity:.13})}<path d="M64,${ly-7} l8,-4.4 h662 l-8,4.4z" fill="#fff" fill-opacity=".85" stroke="#C9C3DA"/><path d="M740,${ly-3} l8,-4.4 v7 l-8,4.4z" fill="#F2B79C" stroke="#C9C3DA"/><rect x="60" y="${ly-7}" width="680" height="14" rx="7" fill="url(#mkc)" stroke="#9A93B4" stroke-width="1.2"/>`;
  [-2,-1,0,1,2].forEach(v=>o+=`<line x1="${PX(v)}" x2="${PX(v)}" y1="${ly-10}" y2="${ly+10}" stroke="${v?AXIS:INK}" stroke-width="${v?1.2:2}"/>`);
  o+=`<text class="mk-l" x="60" y="${ly+30}" style="fill:${SKYD}">STRONGLY AGAINST</text><text class="mk-l" x="740" y="${ly+30}" text-anchor="end" style="fill:#B4456F">STRONGLY FOR</text><text class="mk-s mk-desk" x="400" y="${ly+82}" text-anchor="middle" style="fill:${ROSE}">MIDDLE = UNSURE / IT DEPENDS</text>`;
  PEOPLE.forEach(p=>{const x=PX(p.st),y=PY(p.row),on=p.id===s.sel;o+=`<line x1="${x}" x2="${x}" y1="${y+44}" y2="${ly-8}" stroke="${INK}" stroke-opacity=".35" stroke-dasharray="2 3"/>`;
    o+=`<g tabindex="0" role="button" data-tap="${x},${y+18}" aria-pressed="${on}" aria-label="${p.n}, ${p.who}. Press to hear their perspective."><rect x="${x-38}" y="${y-30}" width="76" height="96" rx="12" fill="transparent"/>`;
    if(on)o+=`<circle cx="${x}" cy="${y+16}" r="34" fill="${SUN}" opacity=".35"/>`;
    o+=person(x,y,p.c,on?1.12:1,"smile");o+=`<rect x="${x-34}" y="${y+44}" width="68" height="20" rx="10" fill="#fff" stroke="${on?INK:"#C9C3DA"}"/><text class="mk-s" x="${x}" y="${y+58}" text-anchor="middle" style="fill:${INK};font-weight:${on?700:500}">${p.n.split(",")[0]}</text></g>`});
  // you
  const yx=PX(s.you);o+=`<path d="M${yx},${ly+8} l-12,22 h24z" fill="${INK}"/><rect x="${yx-26}" y="${ly+30}" width="52" height="22" rx="11" fill="${INK}"/><text class="mk-l" x="${yx}" y="${ly+46}" text-anchor="middle" style="fill:#fff">YOU</text>`;
  return o}
// ---------- close-ups
function needsPanel(){const sc=sortScore(),all=sc.done===ITEMS.length;let o=`<text class="t-lab" x="16" y="26">NEEDS: WHAT YOU MUST HAVE TO SURVIVE AND STAY WELL</text>`;
  [["Food","sand"],["Water","water"],["Clothing","jacket"],["Health care","aid"]].forEach(([n,id],i)=>{const x=52+i*94;o+=`<circle cx="${x}" cy="72" r="30" fill="${MINT}" fill-opacity=".35"/>${icon(id,x,72,.8)}<text class="t-ink" x="${x}" y="122" text-anchor="middle">${n}</text>`});
  o+=`<text class="t-body" x="16" y="148">Shelter (a safe, warm home) is a need too.</text>`;
  o+=`<text class="t-lab" x="16" y="178">WANTS: NICE TO HAVE, NOT ESSENTIAL</text>`;
  const L=s.last>=0?ITEMS[s.last]:null;
  if(L&&all)o+=`<text class="t-ink" x="16" y="204">${L.n}: ${L.need?"NEED":"WANT"}</text><text class="t-body" x="16" y="224">${L.why}</text>`;
  else if(L)o+=`<text class="t-ink" x="16" y="204">${L.n}: your call is ${s.sort[s.last]===1?"NEED":s.sort[s.last]===2?"WANT":"not sorted"}</text><text class="t-body" x="16" y="224">Sort all eight to see the answers.</text>`;
  else o+=`<text class="t-body" x="16" y="204">Ask: could I survive and stay healthy without it?</text>`;
  return o}
function choicePanel(){const sh=shop(),tot=ITEMS.reduce((a,b)=>a+b.p,0),W=380;let o=`<text class="t-lab" x="16" y="26">SCARCITY: UNLIMITED WANTS, LIMITED MONEY</text>`;
  o+=`<rect x="16" y="38" width="${W}" height="22" rx="6" fill="${LILAC}" fill-opacity=".6"/><text class="t-ink" x="24" y="54">Everything in the machine: $${tot}</text>`;
  o+=`<rect x="16" y="68" width="${Math.max(6,W*s.budget/tot)}" height="22" rx="6" fill="${MINT}"/><text class="t-ink" x="${Math.min(260,24+W*s.budget/tot)}" y="84">Your wallet: $${s.budget}</text>`;
  o+=`<text class="t-lab" x="16" y="124">OPPORTUNITY COST = THE NEXT-BEST THING YOU GIVE UP</text>`;
  if(sh.oc>=0){o+=`<circle cx="44" cy="170" r="30" fill="${SUN}" fill-opacity=".45"/>${icon(ITEMS[sh.oc].id,44,170,.85)}<text class="t-big" x="88" y="164">${ITEMS[sh.oc].n} ($${ITEMS[sh.oc].p})</text><text class="t-body" x="88" y="186">your no. ${s.rank.indexOf(sh.oc)+1} choice, given up</text>`;
    let m=s.budget;for(const i of s.rank){if(i===sh.oc)break;if(ITEMS[i].p<=m)m-=ITEMS[i].p}o+=`<text class="t-body" x="16" y="232">Your earlier choices left $${m}: not enough for it.</text>`}
  else o+=`<text class="t-body" x="16" y="160">${s.rank.length?"You could afford everything you ranked.":"Rank some items first."}</text><text class="t-body" x="16" y="182">Rank more: wants never run out!</text>`;
  return o}
function stallPanel(){const X=P=>40+(P-0.5)/2.5*360,Y=v=>200-(v+12)/68*170;let o=`<text class="t-lab" x="16" y="16">PROFIT AT EACH PRICE</text>`;
  [0,20,40].forEach(v=>o+=`<line x1="40" x2="400" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--ink)" stroke-opacity="${v?.1:.5}"/><text class="t-lab" x="34" y="${Y(v)+4}" text-anchor="end">$${v}</text>`);
  let d="";for(let P=0.5;P<=3.0001;P+=0.05)d+=(P>0.5?"L":"M")+X(P).toFixed(1)+","+Y(profit(P)).toFixed(1);o+=`<path d="${d}" fill="none" stroke="${PINK}" stroke-width="2.5"/>`;
  [0.5,1,1.5,2,2.5,3].forEach(P=>o+=`<text class="t-lab" x="${X(P)}" y="${Y(-12)+16}" text-anchor="middle">$${fmt(P,P%1?2:0)}</text>`);
  const pr=profit(s.sp);o+=`<circle cx="${X(s.sp)}" cy="${Y(pr)}" r="7" fill="${SUN}" stroke="var(--ink)" stroke-width="1.5"/>`;
  const q=demandAt(s.sp);o+=`<text class="t-ink" x="16" y="232">Revenue ${$$(s.sp)} × ${fmt(q)} = ${$$(s.sp*q)} · costs ${$$(COST*q+FEE)}</text><text class="t-big" x="16" y="254" style="fill:${pr<0?"#C25E45":"var(--ink)"}">${pr<0?"Loss":"Profit"} ${$$(Math.abs(pr))} an hour</text>`;
  return o}
function marketPanel(){const L=[];
  if(s.dS>0)L.push(["A hot day","More students want ice blocks: demand increases, the curve shifts right."]);
  if(s.dS<0)L.push(["A cold, wet day","Fewer students want ice blocks: demand decreases, the curve shifts left."]);
  if(s.sS>0)L.push(["Fruit gets cheaper","Each ice block costs less to make: supply increases, the curve shifts right."]);
  if(s.sS<0)L.push(["Fruit prices rise","Each ice block costs more to make: supply decreases, the curve shifts left."]);
  let o=`<text class="t-lab" x="16" y="22">CAUSE → EFFECT</text>`,y=46;
  if(!L.length){o+=`<text class="t-body" x="16" y="48">Nothing has changed yet. At ${$$(eqP())} the stall</text><text class="t-body" x="16" y="66">sells ${fmt(eqQ())} an hour: the equilibrium.</text><text class="t-body" x="16" y="94">Price above it → surplus (leftovers).</text><text class="t-body" x="16" y="112">Price below it → shortage (a queue).</text>`;y=140}
  L.forEach(([c,e])=>{o+=`<rect x="16" y="${y-14}" width="140" height="22" rx="11" fill="${SUN}"/><text class="t-ink" x="86" y="${y+1}" text-anchor="middle">${c}</text>`;wrap(e,50).forEach((l,i)=>o+=`<text class="t-body" x="16" y="${y+26+i*17}">${l}</text>`);y+=26+wrap(e,50).length*17+12});
  if(L.length){const d0=Qd(1.75),s0=Qs(1.75),E=eqP();let t;if(Math.abs(d0-s0)<0.5)t="At the old price ($1.75) nothing changes: the effects cancel.";else t=d0>s0?`At the old price ($1.75): a shortage of ${fmt(d0-s0)}, so the price rises.`:`At the old price ($1.75): a surplus of ${fmt(s0-d0)}, so the price falls.`;
    wrap(t,50).forEach((l,i)=>o+=`<text class="t-body" x="16" y="${y+i*17}">${l}</text>`);y+=wrap(t,50).length*17+8;
    o+=`<text class="t-ink" x="16" y="${Math.min(250,y+8)}" style="font-weight:600">New equilibrium: ${$$(E)}, ${fmt(eqQ())} sold an hour</text>`}
  return o}
function inquiryPanel(){let o="";
  if(s.tool==="focus"){o+=`<text class="t-lab" x="16" y="22">FOCUS QUESTION: OPEN, FOCUSED, RESEARCHABLE</text>`;
    [["✓","How do different groups in Kōwhai Bay view a bike park on the reserve, and why?",MINTD],["✗","Do people like bikes? (too broad)","#C25E45"],["✗","When was the reserve opened? (one fact, closed)","#C25E45"],["✗","Is the bike park good? (yes/no, no perspectives)","#C25E45"]].forEach(([m,t,c],i)=>{const L=wrap(t,46),y=50+i*50;
      o+=`<circle cx="26" cy="${y-4}" r="10" fill="${c}"/><text class="t-ink" x="26" y="${y}" text-anchor="middle" style="fill:#fff">${m}</text>${L.map((l,k)=>`<text class="t-body" x="44" y="${y+k*16}">${l}</text>`).join("")}`});return o}
  if(s.tool==="sources"){o+=`<text class="t-lab" x="16" y="22">SOURCES: RELEVANT? RELIABLE? WHOSE VIEW?</text>`;
    [["Council report: costs and site plan","Relevant, factual; written by those proposing it"],["Survey of 200 local residents","Relevant; reliable if the sample is fair"],["Hapū environmental plan","Relevant; shows mana whenua perspective"],["Anonymous post: “bike park = chaos!!”","Opinion only, no evidence: weak"]].forEach(([a,b],i)=>{const y=50+i*50;o+=`<text class="t-ink" x="16" y="${y}" style="font-weight:600">${a}</text><text class="t-body" x="16" y="${y+18}">${b}</text>`});return o}
  const P=PEOPLE.find(p=>p.id===s.sel);
  o+=`<text class="t-lab" x="16" y="22">PERSPECTIVE CARD</text>`;
  if(!P)return o+`<text class="t-body" x="16" y="50">Tap a person on the continuum.</text>`;
  o+=`<text class="t-big" x="16" y="50">${P.n}, ${P.who}</text>`;
  o+=`<text class="t-lab" x="16" y="78">VIEWPOINT</text><text class="t-ink" x="16" y="96">${P.st<-0.6?"Against the bike park":P.st>0.6?"For the bike park":P.st<0?"Unsure: it depends on conditions":"Unsure: wants more information"}</text>`;
  o+=`<text class="t-lab" x="16" y="124">VALUES</text><text class="t-ink" x="16" y="142">${P.v.join(" · ")}</text>`;
  o+=`<text class="t-lab" x="16" y="170">SAY IT WITH “BECAUSE”</text>`;
  wrap(`${P.n.split(",")[0]} is ${P.st<-0.6?"against it":P.st>0.6?"for it":"unsure"} because ${P.because}.`,52).forEach((l,i)=>o+=`<text class="t-body" x="16" y="${190+i*17}">${l}</text>`);
  return o}
// ---------- animation for bumps and the price settling
let raf=0,API=null,lastT=0;function kick(){if(!raf)raf=requestAnimationFrame(frame)}
function frame(ts){raf=0;const dt=lastT?Math.min(.05,(ts-lastT)/1000):.016;lastT=ts;let busy=Object.values(s.bump).some(t=>performance.now()-t<460);
  if(s.settle){s.setT+=dt;if(s.setT>.38||RM){s.setT=0;const E=eqP();if(Math.abs(s.P-E)<1e-6){s.settle=false;sfx("ding")}else{s.P=Math.round((s.P+(E>s.P?.25:-.25))*100)/100;sfx("tick")}}busy=busy||s.settle}
  API&&API.redraw();if(busy)raf=requestAnimationFrame(frame);else lastT=0}
const viewNow=()=>{const k=API?API.step.k:"needs";return k==="test"?s.view:k};
// ---------- steps
const ocDefault=(()=>{const sh=shop();return sh.oc>=0?ITEMS[sh.oc].n.toLowerCase():"nothing"})();
const steps=[
 {k:"needs",lab:"Needs and wants",cap:"Tap each item in the vending machine to sort it: tap once for NEED, twice for WANT. Sort all eight and the machine marks your sort.",controls:["resetSort"],
  big:"<b>The big idea:</b> needs are what people must have to survive and stay well: food, water, clothing, shelter and health care. Wants make life more enjoyable but aren't essential.",
  exam:"Needs are things people must have to survive and stay healthy, such as food, water, clothing, shelter and health care. Wants are things that make life more enjoyable but aren't essential, such as bubble tea or headphones. A rain jacket is a need because clothing protects us from the weather.",
  trap:"Calling something a need just because you really, really want it. Ask: could I survive and stay healthy without it? If yes, it's a want.",chips:["sorted","right"]},
 {k:"choice",lab:"Scarcity and choice",cap:"You have limited money. Tap items in the order you want them: 1st, 2nd, 3rd… The machine buys down your list while the money lasts. The first thing you miss out on is your opportunity cost.",controls:["budget","clear"],
  big:"<b>The big idea:</b> scarcity means wants are unlimited but resources (money, time, materials) are limited, so we must choose. Every choice has an opportunity cost: the next-best thing you give up.",
  exam:`Scarcity means our wants are unlimited but our resources, like money and time, are limited, so we have to make choices. Opportunity cost is the next-best choice we give up. With $20 I bought bubble tea, game credit and lollies, so my opportunity cost was the ${ocDefault}, my next-best choice, which I couldn't afford.`,
  trap:"Listing everything you didn't buy as the opportunity cost. It's only the single next-best thing you gave up.",chips:["budget","spent","oc"]},
 {k:"stall",lab:"Producer, consumer",cap:"You run the ice-block stall at the school fair. You're the producer; the students buying are consumers. Change your price and watch the queue, the money and the profit.",speed:1,speedLabel:"one sale every 1.4 s",controls:["play","sp"],
  big:"<b>The big idea:</b> producers make goods or provide services; consumers buy and use them. Goods and services flow one way, money flows the other. Most people are both.",
  exam:"A producer makes goods or provides services, and a consumer buys and uses them. At the stall I am the producer and the students are consumers: ice blocks go from me to them, and money comes back to me. When I buy fruit to make the ice blocks, I am a consumer too. If I raise my price too much, fewer consumers buy, so my profit falls.",
  trap:"Thinking a higher price always means more profit. Too high and customers stop buying; too low and you barely cover your costs.",chips:["buyers","rev","profit"]},
 {k:"market",lab:"Supply and demand",cap:"Slide the price and watch for a shortage (a queue) or a surplus (melting leftovers). Then make something happen, a hot day or a fruit price rise, and let the price settle.",controls:["P","dS","sS","settle"],
  big:"<b>The big idea:</b> when the price rises, people want to buy less (demand) but sellers want to make more (supply). The equilibrium price is where they match: no shortage, no surplus.",
  exam:"On a hot day the demand for ice blocks increases, so the demand curve shifts right. At the old price of $1.75 there is a shortage, because more people want ice blocks than the stall makes. The price rises until the quantity demanded equals the quantity supplied, at a new equilibrium of $2.00, with 60 sold an hour.",
  trap:"Mixing up a movement and a shift. A change in the ice block's own price moves you along a curve; something else changing (weather, costs) shifts the whole curve.",chips:["qd","qs","gap","eq"],onStep:()=>{s.settle=false}},
 {k:"inquiry",lab:"Social inquiry",cap:"A made-up issue: should Kōwhai Reserve get a mountain-bike park? Tap each person to hear their perspective, then slide yourself onto the values continuum. The close-up has focus questions and sources.",controls:["you","tool"],
  big:"<b>The big idea:</b> a perspective is a way of seeing an issue, shaped by values: what people believe is important. People can share the facts and still disagree because their values differ.",
  exam:"Grace is against the bike park because she values protecting native species: she thinks new trails and noise would disturb the kererū and tūī nesting in the reserve. Sam supports it because he values young people's health and wellbeing, and says there is nowhere safe to ride nearby. They disagree because they hold different values.",
  trap:"Describing what someone thinks without the value behind it. Say who, what they think, and why: \"… because they value …\".",chips:["who","stance","vals"]},
 {k:"test",lab:"Test yourself",cap:"Five challenges. Choose a scene, use the controls or tap the picture, then press Check.",controls:["view","budget","sp","P","dS","sS","settle"],chips:["right","oc","profit","gap","who"],
  big:"<b>Exam tip:</b> for cause and effect, chain it: \"because … this means … as a result …\". For perspectives, always add the value: \"… because they value …\"."}];
const sel2=(id,label,opts,get,set)=>({type:"select",id,label,options:opts,get,set});
// ---- kupu Māori: te reo terms for this machine, each checked in Te Aka Māori Dictionary (ta = word id). Sources and notes: te-reo-notes.md
const KUPU=[
 {mi:"ōhanga",en:"economy",ta:4704},
 {mi:"matea",en:"needs",ta:3846},
 {mi:"hiahia",en:"want, desire",ta:1132},
 {mi:"ngōuruuru",en:"scarcity, shortage",ta:4681},
 {mi:"utu",en:"price, cost",ta:8937},
 {mi:"kaiwhakaputa",en:"producer",ta:45702},
 {mi:"kiritaki",en:"consumer, customer",ta:11034},
 {mi:"pakihi",en:"business",ta:5016}];
Object.entries({"needs": ["matea", "hiahia"], "choice": ["ngōuruuru", "utu"], "stall": ["kaiwhakaputa", "kiritaki", "pakihi"], "market": ["utu"]}).forEach(([k,a])=>{const st=steps.find(x=>x.k===k);if(st)st.kupu=a});
// ---------- the 3D bench: a peach acrylic vending machine with coils and real goods, an ice-block stall with a live queue,
// a supply-and-demand board with 3D curves and a draggable price rod, and a values continuum with seven people.
// Every tap goes through tapAt() (the same code the SVG and keyboard use), so the sorting, ranking and perspectives stay one model.
function market3d(S){const {THREE,mat}=S;const P3=S.PAL;const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
  const ZV=V3(-13,0,0),ZS=V3(-4.3,0,0),ZM=V3(4.4,0,0),ZI=V3(13.2,0,0),TOP=.3;
  const plinth=(c,w,d,tint)=>{const p=S.rbox(w,.3,d,.12,mat("plastic",tint,{rough:.55,coat:.2}));p.position.set(c.x,.15,c.z);S.scene.add(p);return p};
  plinth(ZV,6.4,5.4,P3.case.peach);plinth(ZS,7.6,5.4,P3.case.mint);plinth(ZM,7.6,5.4,P3.case.peach);plinth(ZI,7.8,5.4,P3.case.lavender);
  const glowM=(c,i=0)=>new THREE.MeshStandardMaterial({color:new THREE.Color(c),emissive:new THREE.Color(c),emissiveIntensity:i,roughness:.4});
  const pm=(c,r=.35)=>mat("plastic",c,{rough:r});
  const tmp=V3(0,0,0),tmp2=V3(0,0,0);const LBL=[];const label=o=>{const l=S.label(o);LBL.push(l);return l};let overview=false;
  // a faceless figure: legs, hoodie, head, hair cap
  function figure(c,skin){const g=new THREE.Group();for(const x of [-.045,.045])g.add(S.cyl(.03,.028,.2,pm("#4E4868",.5),{at:[x,.1,0],seg:10}));
    const b=S.mesh(new THREE.CapsuleGeometry(.1,.12,4,14),pm(c));b.position.y=.33;g.add(b);g.add(S.sphere(.085,pm(skin,.5),{at:[0,.55,0],seg:20}));
    const hair=S.sphere(.088,pm("#4E4868",.6),{seg:20});hair.scale.set(1,.6,1);hair.position.set(0,.58,-.01);g.add(hair);return g}
  // ---------------------------------------------------------------- goods (simple toy models, no text)
  function good(id){const g=new THREE.Group();
    if(id==="water"){g.add(S.cyl(.07,.07,.24,pm(P3.product.blueberry,.2),{at:[0,.12,0],seg:20}));g.add(S.cyl(.035,.035,.06,pm(P3.deep.sky),{at:[0,.27,0],seg:14}))}
    if(id==="lolly"){g.add(S.sphere(.08,pm(P3.product.butter),{at:[0,.1,0]}));for(const s2 of [-1,1]){const c=S.cyl(0,.05,.08,pm(P3.product.strawberry),{at:[s2*.11,.1,0],rot:[0,0,s2*Math.PI/2],seg:12});g.add(c)}}
    if(id==="sand"){const m=S.mesh(new THREE.CylinderGeometry(.16,.16,.1,3),pm("#F5DDA8",.5),{rot:[Math.PI/2,0,0]});m.position.y=.09;m.rotation.z=Math.PI/2*0;g.add(m);g.add(S.box(.2,.02,.11,pm(P3.product.lime),{at:[0,.06,0]}))}
    if(id==="game"){g.add(S.rbox(.26,.09,.15,.04,pm(P3.case.lavender),{at:[0,.06,0]}));g.add(S.sphere(.02,pm(P3.product.strawberry),{at:[.07,.11,0]}));g.add(S.box(.06,.012,.02,pm(P3.ink),{at:[-.07,.11,0]}))}
    if(id==="jacket"){g.add(S.rbox(.22,.24,.1,.04,pm(P3.product.butter),{at:[0,.13,0]}));g.add(S.rbox(.07,.18,.08,.03,pm(P3.product.butter),{at:[-.14,.15,0],rot:[0,0,.25]}));g.add(S.rbox(.07,.18,.08,.03,pm(P3.product.butter),{at:[.14,.15,0],rot:[0,0,-.25]}));g.add(S.box(.01,.22,.105,pm("#C9A040"),{at:[0,.13,0]}))}
    if(id==="tea"){g.add(S.cyl(.08,.065,.22,mat("acrylic","#F3D9C2",{opacity:.75}),{at:[0,.11,0],seg:20}));g.add(S.cyl(.085,.085,.015,pm("#ffffff"),{at:[0,.225,0],seg:20}));g.add(S.cyl(.012,.012,.16,pm(P3.product.strawberry),{at:[.02,.28,0],rot:[0,0,-.3],seg:8}));
      for(let k=0;k<5;k++)g.add(S.sphere(.018,pm(P3.ink),{at:[Math.cos(k*1.3)*.04,.03,Math.sin(k*1.3)*.04],seg:8}))}
    if(id==="aid"){g.add(S.rbox(.24,.16,.12,.03,pm("#ffffff"),{at:[0,.08,0]}));g.add(S.box(.035,.1,.01,pm(P3.product.strawberry),{at:[0,.08,.062]}));g.add(S.box(.1,.035,.01,pm(P3.product.strawberry),{at:[0,.08,.062]}))}
    if(id==="phones"){g.add(S.torus(.1,.015,pm(P3.ink),{at:[0,.12,0],arc:Math.PI}));for(const x of [-.1,.1])g.add(S.rbox(.06,.1,.08,.025,pm(P3.product.lime),{at:[x,.09,0]}))}
    return g}
  // ---------------------------------------------------------------- the vending machine
  const vm=S.group();vm.position.set(ZV.x,TOP,ZV.z-.6);
  const CW=2.4,CH=3.4,CD=1.2;
  for(const x of [-.9,.9])vm.add(S.rbox(.3,.12,.9,.04,mat("metal",P3.steel),{at:[x,.06,0]}));
  const caseG=S.acrylicCase(CW,CH,CD,P3.case.peach,{opacity:.16});caseG.position.y=.12;vm.add(caseG);
  vm.add(S.rbox(CW-.04,.34,CD-.04,.08,pm(P3.case.peach,.45),{at:[0,.12+CH-.17,0]}));
  vm.add(S.rbox(CW-.06,.08,CD-.06,.03,pm("#ffffff",.5),{at:[0,.16,0]}));
  vm.add(S.box(CW-.06,CH-.5,.04,pm("#FFF6EE",.6),{at:[0,.12+(CH-.5)/2+.1,-CD/2+.06]}));     // the back wall
  const colX=i=>-.95+(i%4)*.48,rowY=i=>2.6-Math.floor(i/4)*1.05;
  for(let r=0;r<2;r++)vm.add(S.rbox(1.95,.05,CD-.15,.02,mat("metal",P3.steel),{at:[-.23,rowY(r*4)-.06,0]}));
  const coilM=mat("metal",P3.copper,{rough:.3});
  ITEMS.forEach((it,i)=>{const pts=[];for(let k=0;k<=60;k++){const a=k/60*Math.PI*10;pts.push([colX(i)+Math.cos(a)*.13,rowY(i)+.08+Math.sin(a)*.08*0+Math.sin(a)*.0,(k/60-.5)*.8+Math.sin(a)*.0])}
    const helix=[];for(let k=0;k<=80;k++){const a=k/80*Math.PI*10;helix.push([colX(i)+Math.sin(a)*.14,rowY(i)+.1+Math.cos(a)*.1,(k/80-.5)*.85])}vm.add(S.tube(helix,.012,coilM,{seg:400,rs:5}))});
  // the works: a mint housing, a screen, a keypad, a coin slot
  vm.add(S.rbox(.5,2.3,.5,.06,pm(P3.case.mint,.45),{at:[.88,1.8,0]}));
  const screen=S.panel(256,140,.42);screen.position.set(.88,2.65,.255);vm.add(screen);let scrKey="";
  {const keys=S.swarm(12,new THREE.CylinderGeometry(.035,.035,.03,14),pm("#ffffff"));for(let k=0;k<12;k++)keys.put(k,.8+(k%3)*.08,2.25-Math.floor(k/3)*.085,.26,1,Math.PI/2);keys.done();vm.add(keys)}
  vm.add(S.rbox(.16,.24,.05,.03,mat("metal",P3.steel),{at:[.88,1.65,.26]}));vm.add(S.box(.02,.15,.02,pm(P3.ink),{at:[.88,1.65,.29]}));
  vm.add(S.rbox(1.95,.42,.12,.05,mat("metal",P3.steel,{rough:.3}),{at:[-.23,.55,.5]}));            // the PUSH flap / tray
  const goods=ITEMS.map((it,i)=>{const g=good(it.id);g.scale.setScalar(1.35);vm.add(g);g.position.set(colX(i),rowY(i)+.12,.15);S.pick(g,()=>{const p=slot(i);tapAt(p.x,p.y)});return g});
  const binCopies=ITEMS.map((it,i)=>{const g=good(it.id);g.scale.setScalar(1.25);S.scene.add(g);g.visible=false;S.pick(g,()=>{const p=slot(i);tapAt(p.x,p.y)});return g});
  const binX=[ZV.x-1.05,ZV.x+1.05],binZ=ZV.z+1.75;
  [[P3.product.lime,0],[P3.case.lavender,1]].forEach(([c,k])=>{const b=S.acrylicCase(1.7,.32,1.1,c,{opacity:.28});b.position.set(binX[k],TOP,binZ);S.scene.add(b);S.scene.add(S.rbox(1.66,.04,1.06,.02,pm(c,.5),{at:[binX[k],TOP+.02,binZ]}))});
  const lNeeds=label({cls:"hot",off:[0,-22],lead:false}).set("Needs"),lWants=label({off:[0,-22],lead:false}).set("Wants");
  const priceL=ITEMS.map((it,i)=>label({off:[0,24],lead:false}).set("$"+it.p));
  const badgeL=ITEMS.map(()=>label({off:[0,-34]}));const marks=ITEMS.map(()=>label({off:[16,-20],lead:false}));
  const ocRing=S.torus(.25,.025,glowM(P3.product.butter,1.6),{rot:[Math.PI/2,0,0],cast:false});vm.add(ocRing);
  const wallet=S.swarm(60,new THREE.CylinderGeometry(.1,.1,.024,24),mat("plastic",P3.product.butter,{rough:.3}));S.scene.add(wallet);
  const lWallet=label({off:[24,-20]}),lScore=label({cls:"hot big",off:[0,-40]}),lGiven=label({cls:"hot",off:[30,24]});
  const hop={};
  // ---------------------------------------------------------------- the stall
  const sg=S.group();sg.position.set(ZS.x-1.3,TOP,ZS.z-.5);
  for(const x of [-1.2,1.2])for(const z of [-.5])sg.add(S.cyl(.05,.05,2.3,pm("#C9A072",.6),{at:[x,1.15,z],seg:12}));
  for(let i=0;i<8;i++)sg.add(S.rbox(.31,.08,.8,.02,pm(i%2?"#ffffff":P3.product.strawberry,.45),{at:[-1.09+i*.312,2.3,-.1],rot:[.35,0,0]}));
  for(let i=0;i<8;i++){const fl=S.cyl(.155,.155,.04,pm(i%2?"#ffffff":P3.product.strawberry,.45),{at:[-1.09+i*.312,2.08,.28],rot:[Math.PI/2,0,0],seg:20});fl.scale.set(1,1,1);sg.add(fl)}
  sg.add(S.rbox(2.6,.9,.7,.06,pm("#FFF3EA",.5),{at:[0,.45,0]}));
  const blocks=S.swarm(12,new S.RoundedBoxGeometry(.11,.2,.05,2,.03),pm("#ffffff",.25),{colors:true});sg.add(blocks);
  for(let i=0;i<6;i++){blocks.put(i,-.9+i*.3,1.02,.15,1);blocks.tint(i,IB[i])}
  const sticks=S.swarm(12,new THREE.BoxGeometry(.025,.1,.012),pm("#D9B48C",.6));sg.add(sticks);for(let i=0;i<6;i++)sticks.put(i,-.9+i*.3,.88,.15,1);sticks.done();
  for(let i=6;i<12;i++){blocks.put(i,0,-9,0,0);blocks.tint(i,"#fff")}blocks.done();
  const sign=S.panel(512,128,1.6);sign.position.set(0,1.65,-.48);sg.add(sign);sg.add(S.rbox(1.7,.46,.04,.03,pm("#ffffff"),{at:[0,1.65,-.51]}));let signKey="";
  const seller=figure(P3.product.lime,SKIN[0]);seller.position.set(0,0,-.75);seller.scale.setScalar(1.35);sg.add(seller);
  const cash=S.rbox(.36,.22,.26,.04,pm(P3.product.butter),{at:[.95,1.01,-.1]});sg.add(cash);
  const cashScr=S.panel(128,48,.3);cashScr.position.set(.95,1.0,.035);sg.add(cashScr);let cashKey="";
  const QN=12,qBody=S.swarm(QN,new THREE.CapsuleGeometry(.1,.12,4,14),pm("#ffffff"),{colors:true,cast:true}),qHead=S.swarm(QN,new THREE.SphereGeometry(.085,16,12),pm("#ffffff",.5),{colors:true}),qHair=S.swarm(QN,new THREE.SphereGeometry(.088,16,10),pm("#4E4868",.6)),qLeg=S.swarm(QN*2,new THREE.CylinderGeometry(.03,.028,.2,8),pm("#4E4868",.5));
  [qBody,qHead,qHair,qLeg].forEach(m=>{m.castShadow=true;S.scene.add(m)});
  const fly=S.swarm(2,new S.RoundedBoxGeometry(.11,.2,.05,2,.03),pm("#ffffff",.25),{colors:true});S.scene.add(fly);
  const coinFly=S.swarm(1,new THREE.CylinderGeometry(.07,.07,.02,20),mat("metal","#E3B65A",{rough:.25}));S.scene.add(coinFly);
  // profit board behind the queue
  const prof=S.panel(560,320,2.2);prof.position.set(ZS.x+2.1,TOP+1.55,ZS.z-1.9);S.scene.add(prof);S.scene.add(S.rbox(2.32,1.38,.06,.05,pm("#ffffff"),{at:[ZS.x+2.1,TOP+1.55,ZS.z-1.94]}));S.scene.add(S.cyl(.04,.05,.86,mat("metal",P3.steel),{at:[ZS.x+2.1,TOP+.43,ZS.z-1.96]}));let profKey="";
  // circular flow: producer and consumers on two pads with goods one way and money the other
  const cfA=V3(ZS.x-2.7,TOP,ZS.z+1.7),cfB=V3(ZS.x-.3,TOP,ZS.z+1.7);
  S.scene.add(S.cyl(.42,.46,.1,pm(P3.case.mint,.45),{at:[cfA.x,TOP+.05,cfA.z],seg:40}));S.scene.add(S.cyl(.42,.46,.1,pm(P3.case.lavender,.45),{at:[cfB.x,TOP+.05,cfB.z],seg:40}));
  const arcPt=(u,up)=>{const x=S.lerp(cfA.x,cfB.x,up?1-u:u),z=cfA.z+(up?.32:-.32);return V3(x,TOP+.15+Math.sin(u*Math.PI)*.55,z)};
  S.scene.add(S.tube(Array.from({length:20},(_,k)=>arcPt(k/19,false)),.012,pm(P3.product.strawberry),{seg:60,rs:5}));S.scene.add(S.tube(Array.from({length:20},(_,k)=>arcPt(k/19,true)),.012,pm("#C9922D"),{seg:60,rs:5}));
  const cfGoods=S.swarm(3,new S.RoundedBoxGeometry(.09,.16,.04,2,.02),pm("#ffffff",.25),{colors:true});S.scene.add(cfGoods);const cfCoins=S.swarm(3,new THREE.CylinderGeometry(.06,.06,.02,18),mat("metal","#E3B65A",{rough:.25}));S.scene.add(cfCoins);
  const pFig=figure(P3.product.lime,SKIN[1]);pFig.position.set(cfA.x,TOP+.1,cfA.z);S.scene.add(pFig);const cFig=figure(P3.case.lavender,SKIN[3]);cFig.position.set(cfB.x,TOP+.1,cfB.z);S.scene.add(cFig);
  const lProd=label({off:[-20,30]}).set("Producer<small>you, at the stall</small>"),lCons=label({off:[20,30]}).set("Consumers<small>students buying</small>"),lFlow=label({off:[0,24],lead:false}).set("Ice blocks → · ← money");
  const lBuyers=label({cls:"hot big",off:[26,-40]}),lNone=label({off:[0,-20]}).set("No one's buying at this price");
  // ---------------------------------------------------------------- the supply-and-demand board
  const mg=S.group();mg.position.set(ZM.x-1.1,TOP,ZM.z-1.0);
  const BW=4.6,BH=3.3,X0=-1.55,Y0=.5,QW=3.4,PH=2.55;const gxq=q=>X0+q/160*QW,gyp=P=>Y0+P/3.5*PH;
  mg.add(S.rbox(BW+.16,BH+.16,.08,.06,pm("#ffffff",.35),{at:[0,BH/2+.1,-.06]}));
  const board=S.panel(1024,734,BW);board.position.set(0,BH/2+.1,-.01);mg.add(board);
  const bx=w=>(w/BW+.5)*1024,by=h=>734-((h-.1)/BH)*734;
  board.redraw((g,w,h)=>{g.fillStyle="#FFFDFB";g.fillRect(0,0,w,h);g.font="600 26px Instrument Sans, system-ui";g.textBaseline="middle";
    for(let p=.5;p<=3.5;p+=.5){const y=by(gyp(p));g.strokeStyle="rgba(38,46,92,.1)";g.lineWidth=2;g.beginPath();g.moveTo(bx(gxq(0)),y);g.lineTo(bx(gxq(160)),y);g.stroke();g.fillStyle="#6E6A86";g.textAlign="right";g.fillText("$"+fmt(p,p%1?2:0),bx(gxq(0))-12,y)}
    for(let q=0;q<=160;q+=40){g.fillStyle="#6E6A86";g.textAlign="center";g.fillText(q,bx(gxq(q)),by(gyp(0))+26)}
    g.strokeStyle="#8F9BAA";g.lineWidth=4;g.beginPath();g.moveTo(bx(gxq(0)),by(gyp(3.5)));g.lineTo(bx(gxq(0)),by(gyp(0)));g.lineTo(bx(gxq(160)),by(gyp(0)));g.stroke();
    g.fillStyle="#262E5C";g.font="700 24px Instrument Sans, system-ui";g.textAlign="left";g.fillText("PRICE",20,30);g.textAlign="right";g.fillText("ICE BLOCKS AN HOUR",bx(gxq(160)),by(gyp(0))+62)});
  let curveKey="",curves=[];
  const dPts=d=>{const P0=Math.max(.25,(120+20*d-160)/40),P1=Math.min(3.4,(120+20*d)/40);return [V3(gxq(120+20*d-40*P0),gyp(P0),.06),V3(gxq(120+20*d-40*P1),gyp(P1),.06)]};
  const sPts=u=>{const P0=Math.max(.25,(20-20*u)/40+.01),P1=Math.min(3.4,(160+20-20*u)/40);return [V3(gxq(-20+20*u+40*P0),gyp(P0),.06),V3(gxq(-20+20*u+40*P1),gyp(P1),.06)]};
  const rod=S.box(QW,.05,.05,glowM("#F2C83C",1.4),{cast:false});mg.add(rod);
  const tag=S.rbox(.36,.2,.1,.05,pm(P3.product.butter,.3));mg.add(tag);
  S.dragger(tag,{normal:V3(0,0,1),move:p=>{const l=mg.worldToLocal(p.clone());s.P=S.clamp(Math.round((l.y-Y0)/PH*3.5*4)/4,.5,3);s.settle=false}});
  S.dragger(rod,{normal:V3(0,0,1),move:p=>{const l=mg.worldToLocal(p.clone());s.P=S.clamp(Math.round((l.y-Y0)/PH*3.5*4)/4,.5,3);s.settle=false}});
  const mD=S.sphere(.08,pm(P3.product.strawberry,.3));const mS=S.sphere(.08,pm(P3.product.blueberry,.3));const mE=S.sphere(.09,pm("#ffffff",.3));mg.add(mD,mS,mE);
  const gapBar=S.box(1,.06,.06,glowM("#C25E45",1.2),{cast:false});mg.add(gapBar);
  const eqDash=S.swarm(60,new THREE.SphereGeometry(.016,6,5),pm(P3.ink,.4));mg.add(eqDash);
  const arD=S.arrow(P3.product.strawberry,{r:.03}),arS=S.arrow(P3.product.blueberry,{r:.03});mg.add(arD,arS);
  const lD=label({off:[14,-10],lead:false}),lS=label({off:[14,0],lead:false}),lP=label({cls:"hot",off:[-30,0]}),lGap=label({cls:"hot",off:[0,32]}),lE=label({off:[22,-26]}),lDragP=label({cls:"hot",off:[-30,30]}).set("Drag the price");
  // the stall vignette beside the board: a queue when there's a shortage, melting leftovers when there's a surplus
  const vg=S.group();vg.position.set(ZM.x+2.55,TOP,ZM.z+.2);vg.add(S.rbox(1.6,.6,.6,.06,pm("#FFF3EA",.5),{at:[0,.3,0]}));
  const vBlocks=S.swarm(14,new S.RoundedBoxGeometry(.11,.2,.05,2,.03),pm("#ffffff",.25),{colors:true});vg.add(vBlocks);
  const puddles=S.swarm(14,new THREE.CircleGeometry(.08,20),mat("liquid","#ffffff",{opacity:.75}),{colors:true});vg.add(puddles);
  const vQ=S.swarm(9,new THREE.CapsuleGeometry(.08,.1,4,12),pm("#ffffff"),{colors:true,cast:true}),vH=S.swarm(9,new THREE.SphereGeometry(.07,14,10),pm("#ffffff",.5),{colors:true});vg.add(vQ,vH);
  const lV=label({off:[0,-40]});
  // ---------------------------------------------------------------- the values continuum
  const ig=S.group();ig.position.set(ZI.x,TOP,ZI.z);const IX=st=>st*1.55,IZ=row=>row?-.15:-1.0;
  const barP=S.panel(1024,48,6.6);barP.rotation.x=-Math.PI/2;barP.position.set(0,.11,.9);ig.add(barP);ig.add(S.rbox(6.7,.1,.22,.05,pm("#ffffff",.4),{at:[0,.05,.9]}));
  barP.redraw((g,w,h)=>{const gr=g.createLinearGradient(0,0,w,0);gr.addColorStop(0,P3.product.blueberry);gr.addColorStop(.5,"#EDE4E7");gr.addColorStop(1,P3.product.peach);g.fillStyle=gr;g.beginPath();g.roundRect(0,6,w,h-12,18);g.fill();
    [-2,-1,0,1,2].forEach(v=>{const x=w/2+v*1.55/6.6*w;g.fillStyle=v?"rgba(38,46,92,.45)":"#262E5C";g.fillRect(x-(v?2:3),0,v?4:6,h)})});
  const ppl=PEOPLE.map((p,i)=>{const f=figure(p.c,SKIN[i%SKIN.length]);f.position.set(IX(p.st),.12,IZ(p.row));f.scale.setScalar(1.6);ig.add(f);
    ig.add(S.cyl(.24,.27,.12,pm("#ffffff",.4),{at:[IX(p.st),.06,IZ(p.row)],seg:28}));
    const drop=S.cyl(.008,.008,.9-IZ(p.row)-.2,pm(P3.ink,.5),{seg:6});drop.rotation.x=Math.PI/2;drop.position.set(IX(p.st),.12,(IZ(p.row)+.9+.2)/2);ig.add(drop);
    S.pick(f,()=>tapAt(PX(p.st),PY(p.row)+18));const l=label({off:[0,28],lead:false}).set(p.n.split(",")[0]);return {f,l,p}});
  const selRing=S.torus(.3,.03,glowM(P3.product.butter,1.6),{rot:[Math.PI/2,0,0],cast:false});ig.add(selRing);
  const bubble=S.panel(720,250,2.9);ig.add(bubble);let bubKey="";
  const you=S.group(ig);you.add(S.cyl(0,.12,.24,pm(P3.ink,.3),{at:[0,.12,0],seg:3,rot:[0,0,Math.PI]}));you.add(S.rbox(.36,.16,.06,.04,pm(P3.ink,.3),{at:[0,.36,0]}));
  S.dragger(you,{normal:V3(0,1,0),move:p=>{const l=ig.worldToLocal(p.clone());s.you=Math.round(S.clamp(l.x/1.55,-2,2)*10)/10}});
  const lIssue=label({cls:"big",off:[0,-30],lead:false}).set("Should Kōwhai Reserve get a bike park?<small>a made-up issue</small>"),lAg=label({off:[0,26],lead:false}).set("Strongly against"),lFor=label({off:[0,26],lead:false}).set("Strongly for"),lYou=label({cls:"hot",off:[0,30],lead:false}),lMidL=label({off:[0,26],lead:false}).set("Unsure / it depends");
  // ---------------------------------------------------------------- views
  S.view("needs",[ZV.x+.3,4.6,ZV.z+8.9],[ZV.x,1.55,ZV.z+.5],{min:2,max:26});
  S.view("choice",[ZV.x+1.6,3.9,ZV.z+8.0],[ZV.x+.3,1.6,ZV.z],{min:2,max:26});
  S.view("stall",[ZS.x+.2,3.6,ZS.z+7.4],[ZS.x,1.05,ZS.z],{min:2,max:26});
  S.view("market",[ZM.x+.3,3.9,ZM.z+8.6],[ZM.x+.1,1.65,ZM.z-.4],{min:2,max:26});
  S.view("inquiry",[ZI.x,4.0,ZI.z+6.6],[ZI.x,.9,ZI.z-.3],{min:2,max:26});
  S.view("all",[0,15,30],[0,1,0],{min:6,max:70});
  const half={needs:4,choice:4,stall:4.5,market:4.5,inquiry:4.5,all:18},ctr={needs:[ZV.x,0,ZV.z],choice:[ZV.x,0,ZV.z],stall:[ZS.x,0,ZS.z],market:[ZM.x,0,ZM.z],inquiry:[ZI.x,0,ZI.z],all:[0,0,0]};
  let first=true,isTest=false,lastView=null;
  const go=v=>{overview=v==="all";S.goView(v,first);first=false;S.setShadowBox(half[v],ctr[v])};
  const wrapPx=(g,t,maxW)=>{const w=t.split(" "),L=[];let c="";w.forEach(x=>{const tt=c?c+" "+x:x;if(g.measureText(tt).width>maxW&&c){L.push(c);c=x}else c=tt});if(c)L.push(c);return L};
  return {
    step(st){isTest=st.k==="test";go(isTest?"all":st.k);lastView=s.view},
    update(s3,st,dt,t){const v=viewNow(),over=isTest&&lastView!==null&&v===lastView&&false;
      if(isTest&&s.view!==lastView){lastView=s.view;go(s.view)}
      const ov=isTest&&s.view===lastView&&false;
      // ---- vending machine
      const vend=v==="needs"||v==="choice",sh=shop(),sc=sortScore(),all=sc.done===ITEMS.length,now=performance.now();
      const binN=[0,0];
      ITEMS.forEach((it,i)=>{const g=goods[i];const bm=s.bump[i]?Math.max(0,1-(now-s.bump[i])/450):0;let x=colX(i),y=rowY(i)+.12,z=.15,sc2=1.35*(1+.25*Math.sin(bm*Math.PI));
        const got=v==="choice"&&sh.got.includes(i);if(got){const n=sh.got.indexOf(i);x=-.95+n*.36;y=.8;z=.5;sc2=1.1}
        const k=g.userData.k=S.lerp(g.userData.k??0,got?1:0,.12);g.position.set(S.lerp(colX(i),x,k),S.lerp(rowY(i)+.12,y,k)+Math.sin(k*Math.PI)*.15,S.lerp(.15,z,k));g.scale.setScalar(sc2);g.rotation.y=bm*Math.PI*2;
        // price pills only when you're at the machine
        priceL[i].at(tmp.set(vm.position.x+colX(i),TOP+rowY(i)-.05,vm.position.z+.55)).show(vend&&!isTest);
        // bins
        const sv=s.sort[i],bc=binCopies[i];bc.visible=v==="needs"&&sv>0;
        if(bc.visible){const b=sv-1,n=binN[b]++;const bx2=binX[b]-.55+(n%4)*.37,bz=binZ-.25+Math.floor(n/4)*.5;bc.position.set(bx2,TOP+.06+Math.sin(bm*Math.PI)*.35,bz);bc.rotation.y=bm*Math.PI*2;
          marks[i].at(tmp.set(bx2,TOP+.35,bz)).set(all?((sv===1)===it.need?"✓":"✗"):"").cls(all&&(sv===1)!==it.need?"hot":"").show(all&&!isTest)}else marks[i].show(false);
        // badges
        let bt="";if(v==="needs"&&sv)bt=sv===1?"Need":"Want";if(v==="choice"){const r=s.rank.indexOf(i);if(r>=0)bt=`${r+1}${sh.got.includes(i)?" · bought":sh.oc===i?" · given up":""}`}
        badgeL[i].at(tmp.set(vm.position.x+colX(i),TOP+rowY(i)+.55,vm.position.z+.2)).set(bt).cls(v==="choice"&&sh.oc===i?"hot":"").show(vend&&!!bt&&!isTest&&!(v==="choice"&&(sh.got.includes(i)||sh.oc===i)))});
      lNeeds.at(tmp.set(binX[0]-.6,TOP+.34,binZ-.55)).show(v==="needs");lWants.at(tmp.set(binX[1]+.6,TOP+.34,binZ-.55)).show(v==="needs");
      lScore.at(tmp.set(ZV.x,TOP+CH+.5,vm.position.z)).set(all?`${sc.right} of ${ITEMS.length} right<small>${sc.right<8?"tap a ✗ item to move it":"food, water, clothing, health care are needs"}</small>`:`${sc.done} of ${ITEMS.length} sorted<small>tap an item: once = need, twice = want</small>`).show(v==="needs");
      ocRing.visible=v==="choice"&&sh.oc>=0;if(ocRing.visible){ocRing.position.set(colX(sh.oc),rowY(sh.oc)+.12,.25);ocRing.scale.setScalar(1+.08*Math.sin(t*4))}
      lGiven.at(tmp.set(vm.position.x+(sh.oc>=0?colX(sh.oc):0),TOP+(sh.oc>=0?rowY(sh.oc):0)+.2,vm.position.z+.3)).set(sh.oc>=0?`Opportunity cost<small>${ITEMS[sh.oc].n}, your next-best choice</small>`:"").show(v==="choice"&&sh.oc>=0);
      const coinsN=v==="choice"?sh.left:s.budget;for(let k=0;k<60;k++){if(k<coinsN&&vend)wallet.put(k,ZV.x+1.75+Math.floor(k/30)*.24,TOP+.03+(k%30)*.032,ZV.z+.55,1);else wallet.put(k,0,-9,0,0)}wallet.done();
      lWallet.at(tmp.set(ZV.x+1.85,TOP+Math.min(30,Math.max(1,coinsN))*.032+.1,ZV.z+.55)).set(v==="choice"?`Money left<b>$${sh.left}</b><small>wallet $${s.budget}</small>`:`Wallet<b>$${s.budget}</b>`).show(vend);
      const sk=(v==="choice"?"L":"B")+(v==="choice"?sh.left:s.budget);if(sk!==scrKey){scrKey=sk;screen.redraw((g,w,h)=>{g.fillStyle="#262E5C";g.beginPath();g.roundRect(0,0,w,h,16);g.fill();g.fillStyle=P3.product.butter;g.font="700 64px Instrument Sans, system-ui";g.textAlign="center";g.textBaseline="middle";g.fillText("$"+(v==="choice"?sh.left:s.budget),w/2,h/2+4)})}
      // ---- stall
      const stall=v==="stall";const Q=demandAt(s.sp),N=Math.min(QN,Math.round(Q/10)),gap=Math.min(.55,3.2/Math.max(1,N)),ph=(s.t%1.4)/1.4,shift=ph<.5?0:Math.min(1,(ph-.5)*2.6),cyc=Math.floor(s.t/1.4);
      const qx0=sg.position.x+1.55,qz=sg.position.z+.75;
      for(let i=0;i<QN;i++){let x,z=qz,on=i<N;if(on){if(i===0&&shift>0){x=qx0-shift*.2;z=qz+shift*1.4}else x=qx0+(i-shift)*gap}
        const c=IB[(i+cyc)%6];if(on){const bob=S.REDUCED?0:Math.abs(Math.sin(t*6+i))*.015;qBody.put(i,x,TOP+.33*1.25+bob,z,1.25);qHead.put(i,x,TOP+.55*1.25+bob,z,1.25);qHair.putS(i,x,TOP+.58*1.25+bob,z-.01,1.25,.75,1.25);qBody.tint(i,c);qHead.tint(i,SKIN[(i+cyc)%5]);
          qLeg.put(i*2,x-.05,TOP+.12,z,1.25);qLeg.put(i*2+1,x+.05,TOP+.12,z,1.25)}else{qBody.put(i,0,-9,0,0);qHead.put(i,0,-9,0,0);qHair.put(i,0,-9,0,0);qLeg.put(i*2,0,-9,0,0);qLeg.put(i*2+1,0,-9,0,0)}}
      [qBody,qHead,qHair,qLeg].forEach(m=>m.done());
      if(N>0&&ph<.5&&!S.REDUCED&&stall){const f=ph/.5;fly.put(0,S.lerp(sg.position.x+.9,qx0,f),TOP+1.05+Math.sin(f*Math.PI)*.5,S.lerp(sg.position.z+.15,qz,f),1);fly.tint(0,IB[cyc%6]);coinFly.put(0,S.lerp(qx0,sg.position.x+.95,f),TOP+1.2+Math.sin(f*Math.PI)*.6,S.lerp(qz,sg.position.z-.1,f),1,Math.PI/2)}
      else{fly.put(0,0,-9,0,0);coinFly.put(0,0,-9,0,0)}fly.put(1,0,-9,0,0);fly.done();coinFly.done();
      if(signKey!==s.sp+""){signKey=s.sp+"";sign.redraw((g,w,h)=>{g.fillStyle="#fff";g.fillRect(0,0,w,h);g.fillStyle="#262E5C";g.font="700 54px Instrument Sans, system-ui";g.textAlign="center";g.textBaseline="middle";g.fillText("ICE BLOCKS "+$$(s.sp),w/2,h/2+3)})}
      const ck=$$(s.sale);if(ck!==cashKey){cashKey=ck;cashScr.redraw((g,w,h)=>{g.fillStyle="#262E5C";g.fillRect(0,0,w,h);g.fillStyle=P3.product.butter;g.font="700 30px Instrument Sans, system-ui";g.textAlign="center";g.textBaseline="middle";g.fillText(ck,w/2,h/2+2)})}
      const pk=s.sp+"";if(pk!==profKey){profKey=pk;prof.redraw((g,w,h)=>{g.fillStyle="#FFFDFB";g.fillRect(0,0,w,h);const X=P=>60+(P-.5)/2.5*(w-90),Y=v2=>h-60-(v2+12)/68*(h-110);g.font="600 18px Instrument Sans, system-ui";
        g.fillStyle="#262E5C";g.textAlign="left";g.fillText("PROFIT AT EACH PRICE",14,26);[0,20,40].forEach(v2=>{g.strokeStyle=v2?"rgba(38,46,92,.12)":"rgba(38,46,92,.5)";g.lineWidth=2;g.beginPath();g.moveTo(X(.5),Y(v2));g.lineTo(X(3),Y(v2));g.stroke();g.fillStyle="#6E6A86";g.textAlign="right";g.fillText("$"+v2,X(.5)-8,Y(v2)+6)});
        [.5,1,1.5,2,2.5,3].forEach(P=>{g.textAlign="center";g.fillText("$"+fmt(P,P%1?2:0),X(P),h-30)});g.strokeStyle=P3.product.strawberry;g.lineWidth=5;g.beginPath();for(let P=.5;P<=3.0001;P+=.05)g[P>.5?"lineTo":"moveTo"](X(P),Y(profit(P)));g.stroke();
        const pr=profit(s.sp);g.fillStyle=P3.product.butter;g.strokeStyle="#262E5C";g.lineWidth=3;g.beginPath();g.arc(X(s.sp),Y(pr),11,0,7);g.fill();g.stroke();g.fillStyle=pr<0?"#C25E45":"#262E5C";g.font="700 22px Instrument Sans, system-ui";g.textAlign="right";g.fillText(`${pr<0?"Loss":"Profit"} ${$$(Math.abs(pr))} an hour`,w-14,26)})}
      for(let k=0;k<3;k++){const f=((s.t*.5+k/3)%1);const a=arcPt(f,false),b=arcPt(f,true);if(N>0&&stall){cfGoods.put(k,a.x,a.y+.08,a.z,1);cfGoods.tint(k,IB[k]);cfCoins.put(k,b.x,b.y,b.z,1,Math.PI/2)}else{cfGoods.put(k,0,-9,0,0);cfCoins.put(k,0,-9,0,0)}}cfGoods.done();cfCoins.done();
      lBuyers.at(tmp.set(qx0+1,TOP+1.1,qz)).set(`${fmt(Q)} buyers an hour<small>profit ${profit(s.sp)<0?"−":""}${$$(Math.abs(profit(s.sp)))} an hour</small>`).show(stall);lNone.at(tmp.set(qx0+.6,TOP+.4,qz)).show(stall&&N===0);
      lProd.at(tmp.set(cfA.x,TOP+.9,cfA.z)).show(stall&&!isTest);lCons.at(tmp.set(cfB.x,TOP+.9,cfB.z)).show(stall&&!isTest);lFlow.at(tmp.set((cfA.x+cfB.x)/2,TOP+.1,cfA.z+.5)).show(stall&&!isTest);
      // ---- supply and demand
      const mk=v==="market";const ck2=s.dS+"|"+s.sS;if(ck2!==curveKey){curveKey=ck2;curves.forEach(c=>{mg.remove(c);c.geometry.dispose()});curves=[];
        const add=(pts,c,r,o)=>{const m=S.tube(pts,r,o?new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:o,depthWrite:false}):pm(c,.3),{seg:4,rs:10,type:"catmullrom"});mg.add(m);curves.push(m)};
        if(s.dS)add(dPts(0),P3.product.strawberry,.022,.35);if(s.sS)add(sPts(0),P3.product.blueberry,.022,.35);add(dPts(s.dS),"#E27A96",.04);add(sPts(s.sS),P3.deep.sky,.04)}
      const qd=Qd(s.P),qs=Qs(s.P),E=eqP(),EQ=eqQ(),py=gyp(s.P);rod.position.set(X0+QW/2,py,.08);tag.position.set(X0-.3,py,.1);
      mD.position.set(gxq(qd),py,.1);mS.position.set(gxq(qs),py,.1);mE.position.set(gxq(EQ),gyp(E),.09);
      const g0=Math.min(qd,qs),g1=Math.max(qd,qs),short=qd>qs;gapBar.visible=g1-g0>.5;if(gapBar.visible){gapBar.scale.x=gxq(g1)-gxq(g0);gapBar.position.set((gxq(g0)+gxq(g1))/2,py+(short?-.18:.18),.1);gapBar.material.color.set(short?"#C25E45":"#C9922D");gapBar.material.emissive.set(gapBar.material.color)}
      for(let k=0;k<60;k++){const u=k/59;if(k<30){eqDash.put(k,S.lerp(X0,gxq(EQ),u*2),gyp(E),.07,k%2?0:1)}else eqDash.put(k,gxq(EQ),S.lerp(gyp(E),Y0,(u-.5)*2),.07,k%2?0:1)}eqDash.done();
      if(s.dS)arD.set(V3(gxq(80),gyp(1),.12),V3(s.dS*.5,0,0));else arD.visible=false;if(s.sS)arS.set(V3(gxq(80),gyp(2.75),.12),V3(s.sS*.5,0,0));else arS.visible=false;
      const wp=o=>mg.localToWorld(o.clone());
      const dE=dPts(s.dS),sE=sPts(s.sS);lD.at(wp(dE[0])).set(`Demand${s.dS?" (D2)":""}`).show(mk);lS.at(wp(sE[1])).set(`Supply${s.sS?" (S2)":""}`).show(mk);
      lP.at(wp(tag.position)).set(`${$$(s.P)}<small>want ${fmt(qd)} · made ${fmt(qs)}</small>`).show(mk);
      lGap.at(wp(gapBar.position)).set(`${short?"Shortage":"Surplus"} ${fmt(g1-g0)}`).cls(short?"hot":"").show(mk&&gapBar.visible);
      lE.at(wp(mE.position)).set(`Equilibrium<small>${$$(E)} · ${fmt(EQ)} an hour</small>`).show(mk);lDragP.at(wp(tag.position)).show(mk&&!s.settle&&t<40&&!isTest);
      // vignette
      const nq=qd>qs+.5?Math.min(9,Math.round((qd-qs)/10)):0,nm=qs>qd+.5?Math.min(14,Math.round((qs-qd)/10)):0;
      for(let i=0;i<9;i++){if(i<nq){const x=-.65+(i%5)*.32,z=.6+Math.floor(i/5)*.32;vQ.put(i,x,.3,z,1);vH.put(i,x,.48,z,1);vQ.tint(i,IB[i%6]);vH.tint(i,SKIN[i%5])}else if(nq===0&&nm===0&&i<4){const x=-.45+i*.3;vQ.put(i,x,.3,.6,1);vH.put(i,x,.48,.6,1);vQ.tint(i,IB[i+2]);vH.tint(i,SKIN[i%5])}else{vQ.put(i,0,-9,0,0);vH.put(i,0,-9,0,0)}}vQ.done();vH.done();
      for(let i=0;i<14;i++){if(i<nm){const x=-.65+(i%7)*.21,z=-.12+Math.floor(i/7)*.2,melt=S.REDUCED?.5:.5+.5*Math.sin(t*.8+i);vBlocks.putS(i,x,.7-.04*melt,z,1,1-.3*melt,1);vBlocks.tint(i,IB[i%6]);puddles.putS(i,x,.605,z,1+melt*.8,1+melt*.8,1,new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,0)));puddles.tint(i,IB[i%6])}else{vBlocks.put(i,0,-9,0,0);puddles.put(i,0,-9,0,0)}}vBlocks.done();puddles.done();
      lV.at(tmp.set(vg.position.x,TOP+1.0,vg.position.z)).set(nq?`Sold out<small>${fmt(qd-qs)} go without</small>`:nm?`Left over, melting<small>${fmt(qs-qd)} an hour</small>`:"Just right<small>no queue, no leftovers</small>").cls(nq?"hot":"").show(mk);
      // ---- inquiry
      const iq=v==="inquiry";const sel=PEOPLE.find(p=>p.id===s.sel);
      ppl.forEach(o=>{const on=sel&&o.p.id===sel.id;const lift=on?.1+(S.REDUCED?0:Math.abs(Math.sin(t*3))*.04):0;o.f.position.y=.12+lift;o.f.rotation.y=on?Math.sin(t*1.5)*.3:0;o.l.at(tmp.set(ig.position.x+IX(o.p.st),TOP+.12,ig.position.z+IZ(o.p.row)+.25)).cls(on?"hot":"").show(iq&&!isTest)});
      selRing.visible=!!sel;if(sel){selRing.position.set(IX(sel.st),.13,IZ(sel.row));const bk=sel.id;if(bk!==bubKey){bubKey=bk;bubble.redraw((g,w,h)=>{g.fillStyle="#fff";g.strokeStyle="#B9B3CF";g.lineWidth=4;g.beginPath();g.roundRect(4,4,w-8,h-44,24);g.fill();g.stroke();
          g.beginPath();g.moveTo(w/2-20,h-42);g.lineTo(w/2,h-6);g.lineTo(w/2+20,h-42);g.fill();g.stroke();g.fillStyle="#262E5C";g.font="700 34px Instrument Sans, system-ui";g.textBaseline="top";g.fillText(`${sel.n} · ${sel.who}`,26,20);
          g.font="500 30px Instrument Sans, system-ui";wrapPx(g,"“"+sel.q+"”",w-52).slice(0,4).forEach((l,k)=>g.fillText(l,26,66+k*36))})}
        bubble.position.set(S.clamp(IX(sel.st),-1.9,1.9),2.05,IZ(sel.row));bubble.visible=iq||isTest}else bubble.visible=false;
      you.position.set(IX(s.you),.1,.9);lYou.at(tmp.set(ig.position.x+IX(s.you),TOP+.5,ig.position.z+.9)).set(`You<small>${s.you<-1.2?"strongly against":s.you<-.3?"against":s.you<=.3?"unsure":s.you<=1.2?"for":"strongly for"} · drag me</small>`).show(iq);
      lIssue.at(tmp.set(ig.position.x,TOP+2.95,ig.position.z-1)).show(iq&&!isTest);lAg.at(tmp.set(ig.position.x-3.2,TOP+.1,ig.position.z+1.05)).show(iq);lFor.at(tmp.set(ig.position.x+3.2,TOP+.1,ig.position.z+1.05)).show(iq);lMidL.at(tmp.set(ig.position.x,TOP+.1,ig.position.z+1.25)).show(false);
      if(overview)LBL.forEach(l=>l.show(false));
    }};
}
API=StudyKit.mount({kupu:KUPU,scene3d:market3d,
  eyebrow:"Social studies · Economics and social inquiry", title:"The market machine", crumb:"Year 9–10 social studies: needs and wants, scarcity, opportunity cost, producers and consumers, supply and demand, perspectives and values", homeHash:"y9",
  fig:"FIG. 16 · THE SCHOOL FAIR", railTitle:"Choices, markets and points of view",
  badge:{label:"Year 9 social studies",exam:"2026-11-02T08:30:00+13:00",examText:"Mon 2 Nov"},
  mainBox:"0 0 800 420", mainPhoneBig:true, mainLabel:"A pastel vending machine, an ice-block stall at a school fair, a supply and demand graph and a values continuum with seven people", closeBox:"0 0 420 260",
  state:s, steps,
  onStep:(x,stp)=>{if(stp.k!=="test")s.view=stp.k;kick()},
  controls:[{type:"play"},
    {type:"button",id:"resetSort",label:"↺ Empty the bins",onClick:()=>{s.sort=ITEMS.map(()=>0);s.last=-1;s.view="needs";sfx("whoosh")}},
    {type:"range",id:"budget",label:"Wallet",min:0,max:60,step:1,get:()=>s.budget,set:(x,v)=>{const a=shop().got.length;s.budget=v;s.view="choice";if(shop().got.length>a)clink()},fmt:()=>"$"+s.budget},
    {type:"button",id:"clear",label:"↺ Clear my ranking",onClick:()=>{s.rank=[];s.view="choice";sfx("whoosh")}},
    {type:"range",id:"sp",label:"Stall price",min:0.5,max:3,step:0.25,get:()=>s.sp,set:(x,v)=>{s.sp=v;s.view="stall"},fmt:()=>$$(s.sp)},
    {type:"range",id:"P",label:"Market price",min:0.5,max:3,step:0.25,get:()=>s.P,set:(x,v)=>{s.P=v;s.settle=false;s.view="market"},fmt:()=>$$(s.P)},
    sel2("dS","Demand",[["0","Normal day"],["1","A hot day"],["-1","A cold, wet day"]],()=>String(s.dS),(x,v)=>{s.dS=+v;s.settle=false;s.view="market";sfx("whoosh")}),
    sel2("sS","Supply",[["0","Normal costs"],["-1","Fruit prices rise"],["1","Fruit gets cheaper"]],()=>String(s.sS),(x,v)=>{s.sS=+v;s.settle=false;s.view="market";sfx("whoosh")}),
    {type:"button",id:"settle",label:"⚖️ Let the price settle",onClick:()=>{s.settle=true;s.setT=0;s.view="market";kick()}},
    {type:"range",id:"you",label:"Where you stand",min:-2,max:2,step:0.1,get:()=>s.you,set:(x,v)=>{s.you=v;s.view="inquiry"},fmt:()=>s.you<-1.2?"strongly against":s.you<-0.3?"against":s.you<=0.3?"unsure":s.you<=1.2?"for":"strongly for"},
    sel2("tool","Close-up",[["persp","Perspective card"],["focus","Focus questions"],["sources","Sources"]],()=>s.tool,(x,v)=>{s.tool=v;s.view="inquiry"}),
    sel2("view","Scene",[["needs","Needs and wants"],["choice","Scarcity and choice"],["stall","The stall"],["market","Supply and demand"],["inquiry","Social inquiry"]],()=>s.view,(x,v)=>{s.view=v;sfx("whoosh")})],
  tick:(x,dt,stp)=>{if(stp.k!=="stall")return;const b=Math.floor(s.t/1.4);s.t+=dt;if(Math.floor(s.t/1.4)!==b&&demandAt(s.sp)>0){s.sale+=s.sp;clink()}},
  drawMain:(x,stp)=>{const v=viewNow();return F.floor(800,420)+(v==="needs"?machine("needs")+needsSide():v==="choice"?machine("choice")+choiceSide():v==="stall"?stallScene():v==="market"?marketScene():inquiryScene())},
  drawClose:()=>{const v=viewNow();return F.floor(420,260)+(v==="needs"?needsPanel():v==="choice"?choicePanel():v==="stall"?stallPanel():v==="market"?marketPanel():inquiryPanel())},
  chips:()=>{const sc=sortScore(),sh=shop(),q=demandAt(s.sp),pr=profit(s.sp),qd=Qd(s.P),qs=Qs(s.P),P=PEOPLE.find(p=>p.id===s.sel);
    return{sorted:["SORTED",`${sc.done} of 8`],right:["RIGHT",sc.done===8?`${sc.right} of 8`:"sort all 8",sc.done===8],
      budget:["WALLET","$"+s.budget],spent:["SPENT","$"+(s.budget-sh.left)],oc:["OPPORTUNITY COST",sh.oc>=0?ITEMS[sh.oc].n:"–",true],
      buyers:["BUYERS",fmt(q)+" an hour"],rev:["REVENUE",$$(s.sp*q)],profit:[pr<0?"LOSS":"PROFIT",$$(Math.abs(pr))+" an hour",true],
      qd:["DEMANDED",fmt(qd)],qs:["SUPPLIED",fmt(qs)],gap:[qd>qs?"SHORTAGE":qs>qd?"SURPLUS":"BALANCED",qd===qs?"none":fmt(Math.abs(qd-qs)),true],eq:["EQUILIBRIUM",`${$$(eqP())} · ${fmt(eqQ())}`],
      who:["PERSON",P?P.n.split(",")[0]:"–"],stance:["VIEW",P?(P.st<-0.6?"against":P.st>0.6?"for":"unsure"):"–",true],vals:["VALUES",P?P.v[0]:"–"]}},
  challenges:[
    {q:"Sort all eight items correctly into needs and wants.",check:()=>{const sc=sortScore();return sc.done===8&&sc.right===8},ok:"Yes: food, water, clothing and health care are needs; the rest are wants.",no:()=>{const sc=sortScore();return sc.done<8?`You've sorted ${sc.done} of 8. Choose the Needs and wants scene and tap each item.`:`${sc.right} of 8 right. Tap the ✗ items to move them.`}},
    {q:"Rank at least three items, then set your wallet so your opportunity cost is your number 2 choice.",check:()=>{const sh=shop();return s.rank.length>=3&&sh.oc===s.rank[1]},ok:()=>`Yes: you gave up the ${ITEMS[shop().oc].n.toLowerCase()}, your next-best choice after the ${ITEMS[s.rank[0]].n.toLowerCase()}.`,no:()=>{const sh=shop();return s.rank.length<3?"Rank at least three items first (Scarcity and choice scene).":`Right now your opportunity cost is ${sh.oc>=0?"the "+ITEMS[sh.oc].n.toLowerCase():"nothing"}. You want enough money for your 1st choice but not your 2nd.`}},
    {q:"Set the stall price that makes the most profit.",check:()=>Math.abs(s.sp-1.75)<0.01,ok:()=>`Yes: ${$$(s.sp)} gives ${$$(profit(s.sp))} an hour. Cheaper sells more but earns less on each; dearer scares buyers off.`,no:()=>`At ${$$(s.sp)} you make ${$$(profit(s.sp))} an hour. Look for the top of the profit curve.`},
    {q:"It's a hot day AND fruit prices rise. Set the price where there's no shortage and no surplus.",check:()=>s.dS===1&&s.sS===-1&&Math.abs(Qd(s.P)-Qs(s.P))<0.5,ok:()=>`Yes: ${$$(s.P)}, ${fmt(Qd(s.P))} an hour. Both changes push the price up.`,no:()=>s.dS!==1||s.sS!==-1?"First set Demand to a hot day and Supply to fruit prices rise.":`At ${$$(s.P)} there's a ${Qd(s.P)>Qs(s.P)?"shortage":"surplus"} of ${fmt(Math.abs(Qd(s.P)-Qs(s.P)))}. Try “Let the price settle”.`},
    {q:"In the social inquiry, tap a person who is against the bike park. What value is behind their view?",check:()=>{const P=PEOPLE.find(p=>p.id===s.sel);return !!P&&P.st<-0.6},ok:()=>{const P=PEOPLE.find(p=>p.id===s.sel);return `Yes: ${P.n} is against it because ${P.because}.`},no:()=>{const P=PEOPLE.find(p=>p.id===s.sel);return P?`${P.n.split(",")[0]} is ${P.st>0.6?"for it":"unsure"}. Look at the left (against) end of the continuum.`:"Tap a person first."}}],
  papers:[{label:"NZQA past exams: Social Studies and Geography",url:"https://www2.nzqa.govt.nz/ncea/subjects/past-exams-and-exemplars/"}],
  truth:"The vending machine, prices, the stall's demand, supply and costs, the people and the Kōwhai Reserve bike-park issue are all made up for practice; real markets are messier. The people are fictional and don't speak for any real group. Check your school's exam topics.",
  footer:"Covers Year 9–10 social studies economics (needs and wants, scarcity, choices and opportunity cost, producers and consumers, supply and demand) and social inquiry (focus questions, sources, perspectives and values). Non-partisan: no real parties or politicians."
});
// ---------- taps on the picture
const svg=document.getElementById("k-main");
const pt=e=>{const r=svg.getBoundingClientRect();return[(e.clientX-r.left)/r.width*800,(e.clientY-r.top)/r.height*420]};
// every tap target is also a focusable group (role=button, data-tap = the point it stands for), so Enter and Space work too
function tapAt(x,y){const v=viewNow();
  if(v==="needs"||v==="choice"){let hit=-1;ITEMS.forEach((it,i)=>{const p=slot(i);if(Math.abs(x-p.x)<30&&y>p.y-50&&y<p.y+58)hit=i});
    if(v==="needs"&&hit<0){// tap a sorted item in a bin to move it
      [[1,430],[2,618]].forEach(([val,bx])=>{ITEMS.map((_,i)=>i).filter(i=>s.sort[i]===val).forEach((i,n)=>{const cx=bx+44+(n%2)*78,cy=200+Math.floor(n/2)*58;if(Math.hypot(x-cx,y-cy)<28)hit=i})})}
    if(hit<0)return;s.bump[hit]=performance.now();
    if(v==="needs"){s.sort[hit]=(s.sort[hit]+1)%3;s.last=hit;const sc=sortScore();if(sc.done===8)sfx(sc.right===8?"win":"ding");else sfx(s.sort[hit]?"pop":"whoosh")}
    else{const r=s.rank.indexOf(hit);if(r>=0){s.rank.splice(r,1);sfx("whoosh")}else{s.rank.push(hit);const sh=shop();if(sh.got.includes(hit)){sfx("pop");clink()}else sfx("buzz")}}
    kick();return}
  if(v==="inquiry"){let best=null,bd=40;PEOPLE.forEach(p=>{const d=Math.hypot(x-PX(p.st),y-(PY(p.row)+18));if(d<bd){bd=d;best=p}});if(best){s.sel=best.id;s.tool="persp";sfx("pop");API.redraw()}return}
  if(v==="market"&&x>=G.x0&&x<=G.x1&&y>=G.y1&&y<=G.y0){s.P=Math.max(0.5,Math.min(3,Math.round((G.y0-y)/(G.y0-G.y1)*G.pmax*4)/4));s.settle=false;sfx("tick");API.redraw()}}
svg.addEventListener("pointerdown",e=>{const[x,y]=pt(e);tapAt(x,y)});
svg.addEventListener("keydown",e=>{if(e.key!=="Enter"&&e.key!==" ")return;const g=e.target.closest&&e.target.closest("[data-tap]");if(!g)return;e.preventDefault();const[x,y]=g.dataset.tap.split(",").map(Number);tapAt(x,y)});
// the drawing is rebuilt on every redraw, so put keyboard focus back on the same target afterwards
(function(){const st=document.createElement("style");st.textContent="#k-main [data-tap]:focus{outline:none}#k-main [data-tap]:focus-visible>rect:first-of-type{stroke:var(--as-focus);stroke-width:3;fill:rgba(47,111,228,.08)}";document.head.appendChild(st)})();
const keepFocus=fn=>function(){const a=document.activeElement,g=a&&a.closest&&a.closest("[data-tap]"),key=g&&g.dataset.tap;const r=fn.apply(this,arguments);if(key){const n=svg.querySelector(`[data-tap="${key}"]`);if(n&&n!==document.activeElement)try{n.focus({preventScroll:true})}catch(err){}}return r};
kick();
API.redraw=keepFocus(API.redraw);
})();
