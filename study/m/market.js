(()=>{
// The market machine: a pastel vending machine, an ice-block stall at the school fair, a supply and demand graph,
// and a values continuum for a social inquiry. Needs and wants, scarcity, opportunity cost, producers and consumers, perspectives.
const fmt=(x,d=0)=>{let v=Number(x);if(Math.abs(v)<0.5*Math.pow(10,-d))v=0;return v.toLocaleString("en-NZ",{maximumFractionDigits:d,minimumFractionDigits:d})};
const $$=v=>"$"+fmt(v,2);
const RM=matchMedia("(prefers-reduced-motion: reduce)").matches;
const INK="#492B3E",ROSE="#916A70",PINK="#E0709A",BLUSH="#F6C9D0",MINT="#7CCBB0",MINTD="#3F8F74",LILAC="#C9B3EE",LILACD="#7A62B8",SUN="#F4C26B",SKY="#A9D6E5",SKYD="#3E7FA0",CREAM="#FFF8EE",CORAL="#F2A7A0";
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
  if(id==="water")o=`<rect x="-9" y="-14" width="18" height="32" rx="6" fill="${SKY}" stroke="${INK}" stroke-width="1.5"/><rect x="-5" y="-21" width="10" height="7" rx="2" fill="${SKYD}" stroke="${INK}" stroke-width="1.2"/><path d="M-9,0 h18" stroke="#fff" stroke-width="3" opacity=".7"/>`;
  if(id==="lolly")o=`<path d="M-20,-6 l9,6 l-9,6z M20,-6 l-9,6 l9,6z" fill="${PINK}" stroke="${INK}" stroke-width="1.2"/><circle r="10" fill="${SUN}" stroke="${INK}" stroke-width="1.5"/><path d="M-6,-5 q6,10 12,0" fill="none" stroke="#fff" stroke-width="2"/><circle cx="12" cy="13" r="5" fill="${MINT}" stroke="${INK}" stroke-width="1"/>`;
  if(id==="sand")o=`<path d="M-18,12 L0,-16 L18,12z" fill="#F5DDA8" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/><path d="M-13,5 L13,5" stroke="${MINTD}" stroke-width="4"/><path d="M-10,1 L10,1" stroke="${PINK}" stroke-width="3"/>`;
  if(id==="game")o=`<path d="M-19,-2 q0,-10 10,-10 h18 q10,0 10,10 l3,10 q2,8 -6,8 q-5,0 -9,-6 h-14 q-4,6 -9,6 q-8,0 -6,-8z" fill="${LILAC}" stroke="${INK}" stroke-width="1.5"/><path d="M-11,-2 h8 M-7,-6 v8" stroke="${INK}" stroke-width="2"/><circle cx="8" cy="-4" r="2.3" fill="${PINK}"/><circle cx="13" cy="0" r="2.3" fill="${MINTD}"/>`;
  if(id==="jacket")o=`<path d="M-8,-17 h16 l12,8 l-4,10 l-5,-3 v22 h-22 v-22 l-5,3 l-4,-10z" fill="${SUN}" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/><path d="M0,-17 v37" stroke="${INK}" stroke-width="1.2"/><path d="M-6,-17 q6,8 12,0" fill="#F9D995" stroke="${INK}" stroke-width="1.2"/>`;
  if(id==="tea")o=`<path d="M-12,-10 h24 l-3,28 h-18z" fill="#F3D9C2" stroke="${INK}" stroke-width="1.5"/><path d="M-14,-12 h28" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/><path d="M3,-12 l5,-12" stroke="${PINK}" stroke-width="3" stroke-linecap="round"/>${[[-5,12],[0,9],[5,13],[-2,15],[4,7]].map(([a,b])=>`<circle cx="${a}" cy="${b}" r="2.4" fill="${INK}"/>`).join("")}`;
  if(id==="aid")o=`<rect x="-16" y="-12" width="32" height="26" rx="5" fill="#fff" stroke="${INK}" stroke-width="1.5"/><path d="M-6,-12 v-4 h12 v4" fill="none" stroke="${INK}" stroke-width="1.5"/><path d="M0,-6 v14 M-7,1 h14" stroke="${PINK}" stroke-width="4.5"/>`;
  if(id==="phones")o=`<path d="M-15,8 v-6 a15,15 0 0 1 30,0 v6" fill="none" stroke="${INK}" stroke-width="3"/><rect x="-19" y="2" width="9" height="15" rx="4" fill="${MINT}" stroke="${INK}" stroke-width="1.5"/><rect x="10" y="2" width="9" height="15" rx="4" fill="${MINT}" stroke="${INK}" stroke-width="1.5"/>`;
  return g+o+"</g>"}
function person(x,y,c,k=1,face="smile",hold=false){// a pastel hoodie and a dark round head
  const f=face==="sad"?`<path d="M-3.5,4 q3.5,-3 7,0" fill="none" stroke="#fff" stroke-width="1.3"/>`:face==="none"?"":`<path d="M-3.5,2 q3.5,3.5 7,0" fill="none" stroke="#fff" stroke-width="1.3"/>`;
  return `<g transform="translate(${x},${y}) scale(${k})"><path d="M-14,40 v-14 q0,-12 14,-12 q14,0 14,12 v14z" fill="${c}" stroke="${INK}" stroke-width="1.4"/><circle cx="0" cy="0" r="11" fill="${INK}"/><circle cx="-3.5" cy="-2" r="1.4" fill="#fff"/><circle cx="3.5" cy="-2" r="1.4" fill="#fff"/>${f}${hold?`<g transform="translate(15,18)"><rect x="-3" y="-14" width="7" height="13" rx="3" fill="${PINK}" stroke="${INK}" stroke-width="1"/><line x1="0.5" y1="-1" x2="0.5" y2="5" stroke="#C9A97E" stroke-width="2"/></g>`:""}</g>`}
function iceblock(x,y,c,k=1,melt=0){return `<g transform="translate(${x},${y}) scale(${k})"><rect x="-7" y="-20" width="14" height="22" rx="6" fill="${c}" stroke="${INK}" stroke-width="1.2"/>${melt?`<path d="M-4,2 q0,${4+melt*4} 2,${6+melt*4}" fill="none" stroke="${c}" stroke-width="2.5" stroke-linecap="round"/><ellipse cx="0" cy="${12+melt*2}" rx="${6+melt*4}" ry="2" fill="${c}" opacity=".7"/>`:""}<rect x="-1.5" y="2" width="3" height="9" rx="1" fill="#C9A97E"/></g>`}
const IB=[PINK,MINT,SUN,LILAC,SKY,CORAL];
// ---------- the vending machine
const slot=i=>({x:84+(i%4)*62,y:118+Math.floor(i/4)*124});
function machine(mode){let o=`<rect x="26" y="16" width="370" height="392" rx="24" fill="${BLUSH}" stroke="${INK}" stroke-width="2"/><rect x="26" y="16" width="370" height="46" rx="24" fill="${PINK}"/><rect x="26" y="40" width="370" height="22" fill="${PINK}"/>`;
  o+=`<text class="mk-l" x="211" y="46" text-anchor="middle" style="fill:#fff">THE CHOICE MACHINE</text>`;
  o+=`<rect x="46" y="72" width="256" height="252" rx="12" fill="#F4FAFB" stroke="${INK}" stroke-width="1.6"/>`;
  for(let r=0;r<2;r++)o+=`<line x1="50" x2="298" y1="${190+r*124}" y2="${190+r*124}" stroke="${INK}" stroke-opacity=".25" stroke-width="3"/>`;
  const sh=shop();
  ITEMS.forEach((it,i)=>{const p=slot(i),bm=s.bump[i]?Math.max(0,1-(performance.now()-s.bump[i])/450):0,k=1+0.25*Math.sin(bm*Math.PI);
    let dim=false,badge="";
    if(mode==="needs"){const v=s.sort[i];if(v)badge=`<rect x="${p.x-25}" y="${p.y-46}" width="50" height="18" rx="9" fill="${v===1?MINT:LILAC}" stroke="${INK}"/><text class="mk-s" x="${p.x}" y="${p.y-33}" text-anchor="middle" style="fill:${INK}">${v===1?"NEED":"WANT"}</text>`}
    if(mode==="choice"){const r=s.rank.indexOf(i);if(r>=0){const got=sh.got.includes(i),oc=sh.oc===i;badge=`<circle cx="${p.x+22}" cy="${p.y-30}" r="12" fill="${oc?SUN:got?MINT:"#fff"}" stroke="${INK}" stroke-width="1.4"/><text class="mk-l" x="${p.x+22}" y="${p.y-25.5}" text-anchor="middle" style="fill:${INK}">${r+1}</text>`;dim=got}}
    o+=`<path d="M${p.x-24},${p.y+30} ${[0,1,2,3,4,5].map(k=>`q4,-6 8,0`).join(" ")}" fill="none" stroke="#B9AEB2" stroke-width="2"/>`;
    o+=`<g opacity="${dim?.28:1}">${icon(it.id,p.x,p.y,k)}</g>${badge}`;
    o+=`<rect x="${p.x-20}" y="${p.y+38}" width="40" height="18" rx="5" fill="#fff" stroke="${INK}" stroke-opacity=".4"/><text class="mk-s" x="${p.x}" y="${p.y+51}" text-anchor="middle" style="fill:${INK}">$${it.p}</text>`});
  // keypad, coin slot, screen
  o+=`<rect x="314" y="72" width="64" height="40" rx="6" fill="${INK}"/><text class="mk-l" x="346" y="98" text-anchor="middle" style="fill:${SUN}">${mode==="choice"?"$"+sh.left:"$"+s.budget}</text>`;
  for(let r=0;r<4;r++)for(let c=0;c<3;c++)o+=`<circle cx="${328+c*18}" cy="${132+r*20}" r="6.5" fill="#fff" stroke="${INK}" stroke-width="1.2"/>`;
  o+=`<rect x="330" y="222" width="32" height="44" rx="6" fill="#fff" stroke="${INK}" stroke-width="1.2"/><rect x="344" y="230" width="4" height="26" rx="2" fill="${INK}"/>`;
  o+=`<rect x="46" y="338" width="256" height="48" rx="10" fill="#E9B7C1" stroke="${INK}" stroke-width="1.6"/><text class="mk-s" x="290" y="367" text-anchor="end" style="fill:${INK}">PUSH</text>`;
  if(mode==="choice")sh.got.forEach((i,n)=>{o+=icon(ITEMS[i].id,72+n*44,362,0.62)});
  return o}
function needsSide(){const sc=sortScore(),all=sc.done===ITEMS.length;let o="";
  [["NEEDS",1,MINT,430],["WANTS",2,LILAC,618]].forEach(([n,v,c,x])=>{o+=`<rect x="${x}" y="118" width="166" height="282" rx="16" fill="#fff" stroke="${INK}" stroke-width="1.6"/><rect x="${x}" y="118" width="166" height="42" rx="16" fill="${c}"/><rect x="${x}" y="140" width="166" height="20" fill="${c}"/><text class="mk-t" x="${x+83}" y="146" text-anchor="middle" style="fill:${INK}">${n}</text>`;
    const list=ITEMS.map((it,i)=>i).filter(i=>s.sort[i]===v);list.forEach((i,n)=>{const cx=x+44+(n%2)*78,cy=200+Math.floor(n/2)*58,bm=s.bump[i]?Math.max(0,1-(performance.now()-s.bump[i])/450):0;
      o+=icon(ITEMS[i].id,cx,cy-(bm>0?Math.sin(bm*Math.PI)*16:0),0.85);
      if(all){const ok=(v===1)===ITEMS[i].need;o+=`<circle cx="${cx+22}" cy="${cy-18}" r="10" fill="${ok?MINTD:"#C25E45"}"/><text class="mk-s" x="${cx+22}" y="${cy-14}" text-anchor="middle" style="fill:#fff">${ok?"✓":"✗"}</text>`}})});
  o+=all?`<text class="mk-l" x="430" y="40" style="fill:${ROSE}">YOUR SORT</text>`:`<text class="mk-l mk-desk" x="430" y="40" style="fill:${ROSE}">TAP AN ITEM: ONCE = NEED, TWICE = WANT</text><text class="mk-l mk-phone" x="430" y="40" style="fill:${ROSE}">TAP: 1× NEED, 2× WANT</text>`;
  o+=`<text class="mk-b" x="430" y="80" style="fill:${INK}">${all?`${sc.right} of ${ITEMS.length} right`:`${sc.done} of ${ITEMS.length} sorted`}</text>`;
  if(all&&sc.right<ITEMS.length)o+=`<text class="mk-s" x="430" y="104" style="fill:${ROSE}">Tap a ✗ item to move it</text>`;
  return o}
function choiceSide(){const sh=shop();let o=`<text class="mk-l" x="430" y="40" style="fill:${ROSE}">WALLET</text><text class="mk-b" x="430" y="74" style="fill:${INK}">$${s.budget} to spend</text>`;
  o+=`<path d="M430,92 h346 v${Math.max(4,s.rank.length)*40+60} l-12,8 l-12,-8 l-12,8 l-12,-8 l-12,8 l-12,-8 l-12,8 l-12,-8 l-12,8 l-12,-8 l-12,8 l-12,-8 l-12,8 l-12,-8 l-12,8 l-12,-8 l-12,8 l-12,-8 l-12,8 l-12,-8 l-12,8 l-12,-8 l-12,8 l-12,-8 l-12,8 l-12,-8 l-10,6 z" fill="#fff" stroke="${INK}" stroke-opacity=".35"/>`;
  if(!s.rank.length)o+=`<text class="mk-m" x="446" y="130" style="fill:${ROSE}">Tap items in the machine in the</text><text class="mk-m" x="446" y="152" style="fill:${ROSE}">order you want them.</text>`;
  s.rank.forEach((i,n)=>{const y=124+n*40,got=sh.got.includes(i),oc=sh.oc===i;
    if(oc)o+=`<rect x="438" y="${y-24}" width="330" height="36" rx="8" fill="${SUN}" fill-opacity=".45"/>`;
    o+=`<text class="mk-l" x="446" y="${y}" style="fill:${INK}">${n+1}  ${ITEMS[i].n}</text><text class="mk-l" x="660" y="${y}" text-anchor="end" style="fill:${INK}">$${ITEMS[i].p}</text>`;
    o+=`<text class="mk-s" x="760" y="${y}" text-anchor="end" style="fill:${got?MINTD:oc?"#8A5A12":ROSE}">${got?"BOUGHT":oc?"GAVE UP":"NO MONEY"}</text>`});
  const y=124+Math.max(4,s.rank.length)*40;o+=`<line x1="446" x2="760" y1="${y-22}" y2="${y-22}" stroke="${INK}" stroke-dasharray="3 3" stroke-opacity=".5"/><text class="mk-l" x="446" y="${y}" style="fill:${INK}">MONEY LEFT</text><text class="mk-l" x="660" y="${y}" text-anchor="end" style="fill:${INK}">$${sh.left}</text>`;
  if(sh.oc>=0){const p=slot(sh.oc);o+=`<g transform="rotate(-8 ${p.x} ${p.y+24})"><rect x="${p.x-34}" y="${p.y+12}" width="68" height="24" rx="4" fill="#fff" stroke="#C25E45" stroke-width="2.5"/><text class="mk-s" x="${p.x}" y="${p.y+29}" text-anchor="middle" style="fill:#C25E45;font-weight:700">GIVEN UP</text></g>`}
  return o}
// ---------- the stall
function stallScene(){let o=`<rect width="800" height="420" fill="${CREAM}"/><rect y="352" width="800" height="68" fill="#E3EDCF"/><path d="M0,352 h800" stroke="${INK}" stroke-opacity=".2"/>`;
  o+=`<circle cx="520" cy="56" r="26" fill="${SUN}" opacity=".5"/>`;
  // stall
  o+=`<rect x="58" y="112" width="8" height="242" fill="${INK}"/><rect x="292" y="112" width="8" height="242" fill="${INK}"/>`;
  for(let i=0;i<7;i++)o+=`<path d="M${44+i*39},76 h39 v40 a19.5,14 0 0 1 -39,0z" fill="${i%2?"#fff":PINK}" stroke="${INK}" stroke-width="1.3"/>`;
  o+=`<path d="M40,76 L179,36 L318,76z" fill="${BLUSH}" stroke="${INK}" stroke-width="1.5"/>`;
  o+=person(178,206,MINT,1.15,"smile")+`<text class="mk-s" x="178" y="186" text-anchor="middle" style="fill:${ROSE}">YOU</text>`;
  o+=`<rect x="44" y="250" width="270" height="104" rx="8" fill="#fff" stroke="${INK}" stroke-width="1.6"/><rect x="56" y="266" width="246" height="36" rx="6" fill="${SKY}" opacity=".5"/>`;
  o+=`<text class="mk-l" x="179" y="290" text-anchor="middle" style="fill:${INK}">ICE BLOCKS ${$$(s.sp)}</text>`;
  for(let i=0;i<6;i++)o+=iceblock(84+i*38,334,IB[i],0.9);
  o+=`<rect x="226" y="214" width="76" height="36" rx="6" fill="${SUN}" stroke="${INK}" stroke-width="1.3"/><text class="mk-s" x="264" y="237" text-anchor="middle" style="fill:${INK}">${$$(s.sale)}</text>`;
  // the queue of consumers
  const Q=demandAt(s.sp),N=Math.round(Q/10),gap=Math.min(46,250/Math.max(1,N)),ph=(s.t%1.4)/1.4,shift=ph<.5?0:Math.min(1,(ph-.5)*2.6);
  for(let i=N-1;i>=0;i--){const x=338+(i-shift)*gap;if(i===0&&shift>0){const lx=338-shift*130;o+=person(lx,312,IB[(i+Math.floor(s.t/1.4))%6],0.95,"smile",true)}else o+=person(x,312,IB[(i+Math.floor(s.t/1.4))%6],0.95,"none")}
  if(N>0&&ph<.5&&!RM){const f=ph/.5;o+=`<g opacity="${1-f*.2}">${iceblock(300+f*38,262-Math.sin(f*Math.PI)*30,IB[Math.floor(s.t/1.4)%6],.8)}</g><circle cx="${330-f*66}" cy="${280-Math.sin(f*Math.PI)*40}" r="6" fill="${SUN}" stroke="${INK}"/>`}
  if(N===0)o+=`<text class="mk-m" x="330" y="330" style="fill:${ROSE}">No one's buying at this price.</text>`;
  // circular flow
  const bx=604;o+=`<rect x="${bx}" y="34" width="176" height="64" rx="12" fill="${MINT}" fill-opacity=".45" stroke="${INK}" stroke-width="1.5"/><text class="mk-l" x="${bx+88}" y="62" text-anchor="middle" style="fill:${INK}">PRODUCER</text><text class="mk-s mk-desk" x="${bx+88}" y="82" text-anchor="middle" style="fill:${INK}">you, at the stall</text>`;
  o+=`<rect x="${bx}" y="252" width="176" height="64" rx="12" fill="${LILAC}" fill-opacity=".5" stroke="${INK}" stroke-width="1.5"/><text class="mk-l" x="${bx+88}" y="280" text-anchor="middle" style="fill:${INK}">CONSUMERS</text><text class="mk-s mk-desk" x="${bx+88}" y="300" text-anchor="middle" style="fill:${INK}">students buying</text>`;
  o+=`<path d="M${bx+150},104 C${bx+190},150 ${bx+190},200 ${bx+150},246" fill="none" stroke="${PINK}" stroke-width="3"/><path d="M${bx+150},246 l-1,-13 l11,6z" fill="${PINK}"/>`;
  o+=`<path d="M${bx+26},246 C${bx-14},200 ${bx-14},150 ${bx+26},104" fill="none" stroke="#C9922D" stroke-width="3"/><path d="M${bx+26},104 l1,13 l-11,-6z" fill="#C9922D"/>`;
  o+=`<text class="mk-l" x="${bx+156}" y="164" style="fill:${PINK}" text-anchor="end">ICE BLOCKS ↓</text><text class="mk-l" x="${bx+20}" y="200" style="fill:#C9922D">↑ MONEY</text>`;
  if(N>0)for(let k=0;k<3;k++){const f=((s.t*0.5+k/3)%1);const bez=(p0,p1,p2,p3,t)=>(1-t)**3*p0+3*(1-t)**2*t*p1+3*(1-t)*t*t*p2+t**3*p3;
    o+=iceblock(bez(bx+150,bx+190,bx+190,bx+150,f),bez(104,150,200,246,f)+8,IB[k],.55);o+=`<circle cx="${bez(bx+26,bx-14,bx-14,bx+26,f)}" cy="${bez(246,200,150,104,f)}" r="5" fill="${SUN}" stroke="${INK}"/>`}
  o+=`<text class="mk-s mk-desk" x="${bx+88}" y="346" text-anchor="middle" style="fill:${ROSE}">You're a consumer too,</text><text class="mk-s mk-desk" x="${bx+88}" y="362" text-anchor="middle" style="fill:${ROSE}">when you buy the fruit.</text>`;
  o+=`<rect x="330" y="20" width="240" height="40" rx="10" fill="#fff" stroke="${INK}" stroke-opacity=".25"/><text class="mk-t" x="450" y="46" text-anchor="middle" style="fill:${INK}">${fmt(Q)} buyers an hour</text>`;
  return o}
// ---------- supply and demand
const G={x0:70,x1:452,y0:360,y1:34,qmax:160,pmax:3.5};const gx=q=>G.x0+q/G.qmax*(G.x1-G.x0),gy=p=>G.y0-p/G.pmax*(G.y0-G.y1);
function lineD(d){const a=[],P0=Math.max(0.25,(120+20*d-160)/40),P1=Math.min(3.4,(120+20*d)/40);return `M${gx(120+20*d-40*P0)},${gy(P0)} L${gx(120+20*d-40*P1)},${gy(P1)}`}
function lineS(u){const P0=Math.max(0.25,(20-20*u)/40+0.01),P1=Math.min(3.4,(160+20-20*u)/40);return `M${gx(-20+20*u+40*P0)},${gy(P0)} L${gx(-20+20*u+40*P1)},${gy(P1)}`}
function marketScene(){let o=`<rect width="800" height="420" fill="${CREAM}"/>`;
  for(let p=0.5;p<=3.5;p+=0.5)o+=`<line x1="${G.x0}" x2="${G.x1}" y1="${gy(p)}" y2="${gy(p)}" stroke="${INK}" stroke-opacity=".08"/><text class="mk-s" x="${G.x0-8}" y="${gy(p)+4}" text-anchor="end" style="fill:${ROSE}">$${fmt(p,p%1?2:0)}</text>`;
  for(let q=0;q<=160;q+=40)o+=`<text class="mk-s" x="${gx(q)}" y="${G.y0+18}" text-anchor="middle" style="fill:${ROSE}">${q}</text>`;
  o+=`<path d="M${G.x0},${G.y1} V${G.y0} H${G.x1}" fill="none" stroke="${INK}" stroke-width="1.6"/><text class="mk-l" x="${G.x0-8}" y="22" text-anchor="end" style="fill:${INK}">PRICE</text><text class="mk-l" x="${G.x1}" y="${G.y0+38}" text-anchor="end" style="fill:${INK}">ICE BLOCKS AN HOUR</text>`;
  if(s.dS)o+=`<path d="${lineD(0)}" stroke="${PINK}" stroke-width="2" stroke-dasharray="5 5" opacity=".45"/>`;
  if(s.sS)o+=`<path d="${lineS(0)}" stroke="${SKYD}" stroke-width="2" stroke-dasharray="5 5" opacity=".45"/>`;
  o+=`<path d="${lineD(s.dS)}" stroke="${PINK}" stroke-width="3.5" stroke-linecap="round"/><path d="${lineS(s.sS)}" stroke="${SKYD}" stroke-width="3.5" stroke-linecap="round"/>`;
  const dEnd=Math.min(3.4,(120+20*s.dS)/40),sEnd=Math.min(3.4,(180-20*s.sS)/40);
  o+=`<text class="mk-l" x="${gx(120+20*s.dS-40*0.35)+8}" y="${gy(0.35)}" style="fill:${PINK}">D${s.dS?"2":""}</text><text class="mk-l" x="${gx(-20+20*s.sS+40*sEnd)+8}" y="${gy(sEnd)+4}" style="fill:${SKYD}">S${s.sS?"2":""}</text>`;
  if(s.dS)o+=`<path d="M${gx(80)},${gy(1)} l${s.dS*26},0" stroke="${PINK}" stroke-width="2"/><path d="M${gx(80)+s.dS*30},${gy(1)} l${-s.dS*8},-5 v10z" fill="${PINK}"/>`;
  if(s.sS)o+=`<path d="M${gx(80)},${gy(2.75)} l${s.sS*26},0" stroke="${SKYD}" stroke-width="2"/><path d="M${gx(80)+s.sS*30},${gy(2.75)} l${-s.sS*8},-5 v10z" fill="${SKYD}"/>`;
  // equilibrium
  const E=eqP(),EQ=eqQ();o+=`<path d="M${G.x0},${gy(E)} H${gx(EQ)} V${G.y0}" fill="none" stroke="${INK}" stroke-dasharray="2 4" opacity=".5"/><circle cx="${gx(EQ)}" cy="${gy(E)}" r="6" fill="#fff" stroke="${INK}" stroke-width="2"/><text class="mk-s" x="${gx(EQ)+10}" y="${gy(E)-8}" style="fill:${INK}">E</text>`;
  // price line, quantities
  const qd=Qd(s.P),qs=Qs(s.P),y=gy(s.P);o+=`<line x1="${G.x0}" x2="${G.x1}" y1="${y}" y2="${y}" stroke="${SUN}" stroke-width="3"/><rect x="${G.x0-56}" y="${y-12}" width="50" height="24" rx="6" fill="${SUN}"/><text class="mk-l" x="${G.x0-31}" y="${y+5}" text-anchor="middle" style="fill:${INK}">${$$(s.P)}</text>`;
  o+=`<circle cx="${gx(qd)}" cy="${y}" r="6" fill="${PINK}" stroke="${INK}"/><circle cx="${gx(qs)}" cy="${y}" r="6" fill="${SKYD}" stroke="${INK}"/>`;
  if(Math.abs(qd-qs)>0.5){const a=Math.min(qd,qs),b=Math.max(qd,qs),short=qd>qs,yy=y+(short?24:-24);
    o+=`<path d="M${gx(a)},${yy} H${gx(b)}" stroke="${short?"#C25E45":"#8A5A12"}" stroke-width="2.5"/><path d="M${gx(a)},${yy-6} v12 M${gx(b)},${yy-6} v12" stroke="${short?"#C25E45":"#8A5A12"}" stroke-width="2.5"/><text class="mk-l" x="${(gx(a)+gx(b))/2}" y="${yy+(short?20:-10)}" text-anchor="middle" style="fill:${short?"#C25E45":"#8A5A12"}">${short?"SHORTAGE":"SURPLUS"} ${fmt(b-a)}</text>`}
  // the stall vignette
  const X0=486;o+=`<rect x="${X0}" y="20" width="300" height="384" rx="16" fill="#fff" stroke="${INK}" stroke-opacity=".2"/>`;
  for(let i=0;i<5;i++)o+=`<path d="M${X0+20+i*36},50 h36 v26 a18,12 0 0 1 -36,0z" fill="${i%2?"#fff":PINK}" stroke="${INK}" stroke-width="1.1"/>`;
  o+=`<rect x="${X0+24}" y="80" width="6" height="140" fill="${INK}"/><rect x="${X0+184}" y="80" width="6" height="140" fill="${INK}"/><rect x="${X0+16}" y="170" width="184" height="56" rx="6" fill="#fff" stroke="${INK}" stroke-width="1.4"/><text class="mk-l" x="${X0+108}" y="204" text-anchor="middle" style="fill:${INK}">${$$(s.P)} EACH</text>`;
  o+=`<text class="mk-l" x="${X0+16}" y="252" style="fill:${PINK}">WANT TO BUY  ${fmt(qd)}</text><text class="mk-l" x="${X0+16}" y="274" style="fill:${SKYD}">MADE FOR SALE ${fmt(qs)}</text>`;
  if(qd>qs+0.5){const n=Math.min(9,Math.round((qd-qs)/10));o+=`<rect x="${X0+60}" y="120" width="96" height="30" rx="6" fill="#C25E45" transform="rotate(-6 ${X0+108} 135)"/><text class="mk-l" x="${X0+108}" y="140" text-anchor="middle" style="fill:#fff" transform="rotate(-6 ${X0+108} 135)">SOLD OUT</text>`;
    for(let i=0;i<n;i++)o+=person(X0+30+(i%5)*56,316+Math.floor(i/5)*44-(i%2)*4,IB[i%6],0.78,"sad");o+=`<text class="mk-s" x="${X0+284}" y="392" text-anchor="end" style="fill:#C25E45">${fmt(qd-qs)} go without</text>`}
  else if(qs>qd+0.5){const n=Math.min(14,Math.round((qs-qd)/10));for(let i=0;i<n;i++)o+=iceblock(X0+34+(i%7)*38,336+Math.floor(i/7)*42,IB[i%6],.95,1+(i%3)*.4);o+=`<text class="mk-s" x="${X0+284}" y="392" text-anchor="end" style="fill:#8A5A12">${fmt(qs-qd)} left over, melting</text>`}
  else{o+=`<text class="mk-b" x="${X0+150}" y="314" text-anchor="middle" style="fill:${MINTD}">Just right</text><text class="mk-s" x="${X0+150}" y="336" text-anchor="middle" style="fill:${INK}">no queue, no leftovers</text>`;for(let i=0;i<4;i++)o+=person(X0+90+i*40,352,IB[i+2],.7,"smile",true)}
  return o}
// ---------- the inquiry
function wrap(t,n){const w=t.split(" "),L=[];let c="";w.forEach(x=>{if((c+" "+x).trim().length>n){L.push(c.trim());c=x}else c+=" "+x});if(c.trim())L.push(c.trim());return L}
function inquiryScene(){let o=`<rect width="800" height="420" fill="${CREAM}"/>`;
  o+=`<text class="mk-s" x="400" y="26" text-anchor="middle" style="fill:${ROSE}">THE ISSUE (MADE UP)</text><text class="mk-b" x="400" y="54" text-anchor="middle" style="fill:${INK}">Should Kōwhai Reserve get a bike park?</text>`;
  const P=PEOPLE.find(p=>p.id===s.sel);
  if(P){const L1=wrap(`${P.n} (${P.who}): “${P.q}”`,78),L2=wrap(`${P.n}: “${P.q}”`,48);
    [[L1,"mk-desk",19],[L2,"mk-phone",22]].forEach(([L,cl,lh])=>{const h=L.length*lh+18;o+=`<g class="${cl}"><rect x="34" y="66" width="732" height="${h}" rx="12" fill="#fff" stroke="${INK}" stroke-width="1.4"/>${L.map((l,i)=>`<text class="mk-m" x="50" y="${88+i*lh}" style="fill:${INK}">${l}</text>`).join("")}<path d="M${Math.max(60,Math.min(740,PX(P.st)))-9},${66+h} l9,12 l9,-12" fill="#fff" stroke="${INK}" stroke-width="1.4"/><rect x="${Math.max(60,Math.min(740,PX(P.st)))-10}" y="${64+h}" width="20" height="3" fill="#fff"/></g>`})}
  // continuum
  const ly=318;o+=`<defs><linearGradient id="mkc" x1="0" x2="1"><stop offset="0" stop-color="${SKY}"/><stop offset=".5" stop-color="#EDE4E7"/><stop offset="1" stop-color="${CORAL}"/></linearGradient></defs><rect x="60" y="${ly-7}" width="680" height="14" rx="7" fill="url(#mkc)" stroke="${INK}" stroke-width="1.2"/>`;
  [-2,-1,0,1,2].forEach(v=>o+=`<line x1="${PX(v)}" x2="${PX(v)}" y1="${ly-10}" y2="${ly+10}" stroke="${INK}" stroke-width="${v?1:2}"/>`);
  o+=`<text class="mk-l" x="60" y="${ly+30}" style="fill:${SKYD}">STRONGLY AGAINST</text><text class="mk-l" x="740" y="${ly+30}" text-anchor="end" style="fill:#B4456F">STRONGLY FOR</text><text class="mk-s mk-desk" x="400" y="${ly+82}" text-anchor="middle" style="fill:${ROSE}">MIDDLE = UNSURE / IT DEPENDS</text>`;
  PEOPLE.forEach(p=>{const x=PX(p.st),y=PY(p.row),on=p.id===s.sel;o+=`<line x1="${x}" x2="${x}" y1="${y+44}" y2="${ly-8}" stroke="${INK}" stroke-opacity=".35" stroke-dasharray="2 3"/>`;
    if(on)o+=`<circle cx="${x}" cy="${y+16}" r="34" fill="${SUN}" opacity=".35"/>`;
    o+=person(x,y,p.c,on?1.12:1,"smile");o+=`<rect x="${x-34}" y="${y+44}" width="68" height="20" rx="10" fill="#fff" stroke="${INK}" stroke-opacity="${on?1:.25}"/><text class="mk-s" x="${x}" y="${y+58}" text-anchor="middle" style="fill:${INK};font-weight:${on?700:500}">${p.n.split(",")[0]}</text>`});
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
API=StudyKit.mount({kupu:KUPU,
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
  drawMain:(x,stp)=>{const v=viewNow();return v==="needs"?machine("needs")+needsSide():v==="choice"?machine("choice")+choiceSide():v==="stall"?stallScene():v==="market"?marketScene():inquiryScene()},
  drawClose:()=>{const v=viewNow();return v==="needs"?needsPanel():v==="choice"?choicePanel():v==="stall"?stallPanel():v==="market"?marketPanel():inquiryPanel()},
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
svg.addEventListener("pointerdown",e=>{const[x,y]=pt(e),v=viewNow();
  if(v==="needs"||v==="choice"){let hit=-1;ITEMS.forEach((it,i)=>{const p=slot(i);if(Math.abs(x-p.x)<30&&y>p.y-50&&y<p.y+58)hit=i});
    if(v==="needs"&&hit<0){// tap a sorted item in a bin to move it
      [[1,430],[2,618]].forEach(([val,bx])=>{ITEMS.map((_,i)=>i).filter(i=>s.sort[i]===val).forEach((i,n)=>{const cx=bx+44+(n%2)*78,cy=200+Math.floor(n/2)*58;if(Math.hypot(x-cx,y-cy)<28)hit=i})})}
    if(hit<0)return;s.bump[hit]=performance.now();
    if(v==="needs"){s.sort[hit]=(s.sort[hit]+1)%3;s.last=hit;const sc=sortScore();if(sc.done===8)sfx(sc.right===8?"win":"ding");else sfx(s.sort[hit]?"pop":"whoosh")}
    else{const r=s.rank.indexOf(hit);if(r>=0){s.rank.splice(r,1);sfx("whoosh")}else{s.rank.push(hit);const sh=shop();if(sh.got.includes(hit)){sfx("pop");clink()}else sfx("buzz")}}
    kick();return}
  if(v==="inquiry"){let best=null,bd=40;PEOPLE.forEach(p=>{const d=Math.hypot(x-PX(p.st),y-(PY(p.row)+18));if(d<bd){bd=d;best=p}});if(best){s.sel=best.id;s.tool="persp";sfx("pop");API.redraw()}return}
  if(v==="market"&&x>=G.x0&&x<=G.x1&&y>=G.y1&&y<=G.y0){s.P=Math.max(0.5,Math.min(3,Math.round((G.y0-y)/(G.y0-G.y1)*G.pmax*4)/4));s.settle=false;sfx("tick");API.redraw()}});
kick();
})();
