(()=>{
// The fishing machine: a cast, a rod, a float, a fish under the surface and a bucket of snapper.
// Speed = distance ÷ time, levers and moments, density and floating, refraction, and mean vs median.
const fmt=(x,d=0)=>{let v=Number(x);if(Math.abs(v)<0.5*Math.pow(10,-d))v=0;return v.toLocaleString("en-NZ",{maximumFractionDigits:d,minimumFractionDigits:d})};
const G=9.8, RHO_SEA=1.025, RHO_LEAD=11.3, FLOAT_V=20, FLOAT_M=1, N_WATER=1.33, MIN_SIZE=30;
// figure parts: the shared bench look (StudyKit.fig): paper floor, a frosted sky acrylic tank for the sea, painted parts
const F=StudyKit.fig,PAL=F.palette,PR=PAL.product,TINT=PAL.case.sky;
const INK="#262E5C",SKY2=PAL.paper,SEA="#A9CFEE",SEA2="#86BFD2",DEEP="#6E9FD6",ROCK="#A89BA6",SNAP="#F2A7A0",PINK=PR.strawberry,MINT="#3FA57F",SUN="#E9B32E",ROD="#343B5E",LINE="#5A6072",GREY="#6E6A86";
// ---- seeded random so a sample can be re-caught and checked
let seed=7;const rnd=()=>{seed=(seed*1664525+1013904223)%4294967296;return seed/4294967296};
const normal=()=>{let u=0,v=0;while(!u)u=rnd();while(!v)v=rnd();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)};
function catchSample(){const a=[];for(let i=0;i<20;i++)a.push(Math.round(Math.min(56,Math.max(16,30+6.5*normal()))));return a}
const s={ang:35,v:18,t:0,L:2.4,d:0.5,m:2,sink:10,depth:2,eye:3,sample:[],catches:1,step:"cast",bob:0};
s.sample=catchSample();
// ---- the maths
const rad=()=>s.ang*Math.PI/180;
const range=(v=s.v,a=rad())=>v*v*Math.sin(2*a)/G, flight=()=>2*s.v*Math.sin(rad())/G, apex=()=>Math.pow(s.v*Math.sin(rad()),2)/(2*G);
const W=()=>s.m*G, effort=()=>W()*s.L/s.d, tipRatio=()=>s.L/s.d;
const sinkV=()=>s.sink/RHO_LEAD, totalM=()=>FLOAT_M+s.sink, avgRho=()=>totalM()/(FLOAT_V+sinkV());
const floatSub=()=>totalM()/RHO_SEA-sinkV(); // cm³ of the float that must be under water
const floats=()=>floatSub()<=FLOAT_V;
const appStraight=()=>s.depth/N_WATER;
function refractPath(){// fish at (0,-depth), eye at (-eye, +1.6): find the surface point where n·sin(θw) = sin(θa)
  const H=1.6,D=s.depth,X=s.eye;if(X<0.02)return{px:0,app:D/N_WATER,thw:0,tha:0};
  let lo=-X,hi=0;for(let i=0;i<60;i++){const px=(lo+hi)/2,thw=Math.atan2(Math.abs(px),D),tha=Math.atan2(X-Math.abs(px),H);(N_WATER*Math.sin(thw)>Math.sin(tha)?lo=px:hi=px)}
  const px=(lo+hi)/2,thw=Math.atan2(Math.abs(px),D),tha=Math.atan2(X+px,H);
  // the eye sees along eye→P; extend it to the vertical line through the fish
  const app=Math.abs(px)/Math.tan(tha);return{px,app,thw,tha}}
const stats=()=>{const a=[...s.sample].sort((x,y)=>x-y),n=a.length,mean=a.reduce((p,q)=>p+q,0)/n,med=(a[n/2-1]+a[n/2])/2,keep=a.filter(x=>x>=MIN_SIZE).length;return{a,n,mean,med,min:a[0],max:a[n-1],keep}};

// ---- drawing helpers
// A New Zealand snapper (tāmure, Pagrus auratus), drawn once in a 100-unit box and scaled: steep forehead, deep body,
// long spiny dorsal fin, forked tail, coppery-pink back fading to a silver belly, and the bright blue spots on the upper body.
const SNAPPAL={s:{back:"#B4473A",mid:"#E07C63",low:"#F3BBA8",belly:"#FAF0EC",fin:"#E58A71",finDark:"#A8483A",spot:"#3FA6DF",line:"#7C3227",iris:"#E4A53C"},
  g:{back:"#B4A3A9",mid:"#D3C4C9",low:"#E8DEE1",belly:"#F7F3F4",fin:"#CEC0C5",finDark:"#9C8A91",spot:"#B9C6D4",line:"#8C7A81",iris:"#CBBFC3"}};
const SNAPSPOTS=[[-24,-12],[-29,-15.5],[-34,-10.5],[-39,-15],[-44,-9],[-49,-13.5],[-53,-7],[-57,-11.5],[-62,-6.5],[-66,-9.5],[-70,-4],[-31,-5],[-38,-3],[-46,-3.5],[-56,-1.5],[-64,-1],[-27,-1.5],[-74,-2.5]];
function fish(x,y,len,col=SNAP,face=1,op=1,hh,rot=0){// nose at x, tail tip at x - len (face=1 points right); rot turns it about the nose
  const k=col===SNAP?"s":"g",P=SNAPPAL[k],h=hh||len*0.36,sx=face*len/100,sy=h/38,ns=` vector-effect="non-scaling-stroke"`;
  let o=`<g opacity="${op}"><defs><linearGradient id="snB${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.back}"/><stop offset=".4" stop-color="${P.mid}"/><stop offset=".74" stop-color="${P.low}"/><stop offset="1" stop-color="${P.belly}"/></linearGradient><linearGradient id="snT${k}" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="${P.fin}"/><stop offset="1" stop-color="${P.finDark}"/></linearGradient></defs>`;
  o+=`<g transform="translate(${(+x).toFixed(1)},${(+y).toFixed(1)})${rot?` rotate(${rot})`:""} scale(${sx.toFixed(3)},${sy.toFixed(3)})">`;
  // fins behind the body: the dorsal (spiny, then soft), anal, pelvic and tail
  o+=`<path d="M-23,-20 L-25,-26.5 L-26.8,-24.6 L-28.5,-29 L-30.3,-27.2 L-32,-30 L-33.8,-28.3 L-35.5,-30 L-37.3,-28.2 L-39,-29.8 L-40.8,-27.9 L-42.5,-29.3 L-44.3,-27.4 L-46,-28.6 L-47.8,-26.7 L-49.5,-27.8 L-51.3,-25.9 L-53,-27 L-54.8,-25 L-56.5,-26 L-58.3,-24.1 L-60,-25 L-61.6,-23.3 L-63,-24 C-68,-23.5 -74,-19.5 -79.5,-8 L-76,-9.2 C-66,-14.5 -50,-19.8 -23,-20Z" fill="${P.fin}" fill-opacity=".82" stroke="${P.finDark}" stroke-width=".6"${ns}/>`;
  o+=`<path d="M-25,-20.3V-26.5M-28.5,-21V-29M-32,-21.4V-30M-35.5,-21.4V-30M-39,-21.1V-29.8M-42.5,-20.7V-29.3M-46,-20.2V-28.6M-49.5,-19.6V-27.8M-53,-18.9V-27M-56.5,-18V-26M-60,-17V-25M-63,-16V-24M-67,-14.2L-68.5,-22.5M-71,-12.2L-73,-19.3M-75,-9.9L-77,-13.2" stroke="${P.finDark}" stroke-width=".5" opacity=".45"${ns}/>`;
  o+=`<path d="M-54,14 L-58,22.5 C-63,23 -71,19 -77,8.5 L-72,9.5 C-66,12 -60,13.5 -54,14Z" fill="${P.fin}" fill-opacity=".82" stroke="${P.finDark}" stroke-width=".6"${ns}/><path d="M-27,15.5 L-31,26.5 C-33,25.5 -36,21 -38,16.5Z" fill="${P.fin}" fill-opacity=".85" stroke="${P.finDark}" stroke-width=".6"${ns}/>`;
  o+=`<path d="M-80,-5.5 C-85,-8.5 -93,-13.5 -101,-19 C-100.5,-11 -97.5,-4.5 -93.5,0 C-97.5,4.5 -100.5,10.5 -101,17 C-93,12.5 -85,8.5 -80,5.5Z" fill="url(#snT${k})" stroke="${P.finDark}" stroke-width=".7"${ns}/><path d="M-82,-3L-98.5,-15.5M-82,-1L-95.5,-6M-82,1L-95.5,5.5M-82,3L-98.5,13.5" stroke="${P.finDark}" stroke-width=".5" opacity=".5"${ns}/>`;
  // the body, its shading and markings
  o+=`<path d="M0,1.5 C-1.5,-3.5 -6.5,-11 -14,-16 C-20.5,-20 -28,-21.5 -38,-21 C-52,-20 -68,-13.5 -82,-5.5 L-82,5.5 C-70,10.5 -55,15.5 -40,16.8 C-28,17.5 -17,14.5 -9,10 C-4,7 -1,4.5 0,1.5Z" fill="url(#snB${k})" stroke="${P.line}" stroke-width=".8"${ns}/>`;
  o+=`<ellipse cx="-40" cy="10" rx="25" ry="4.5" fill="#fff" opacity=".28"/><ellipse cx="-36" cy="-11" rx="19" ry="3.2" fill="#fff" opacity=".16"/>`;
  o+=`<path d="M-17,-12.5 C-33,-17.5 -58,-13 -82,-1.5" fill="none" stroke="${P.line}" stroke-width=".6" opacity=".4"${ns}/>`;
  o+=SNAPSPOTS.map(([a,b],i)=>`<circle cx="${a}" cy="${b}" r="${i%3?0.7:1}" fill="${P.spot}" opacity=".8"/>`).join("");
  o+=`<path d="M-15.5,-15 C-21.5,-6 -22,4 -17.5,11.5" fill="none" stroke="${P.line}" stroke-width=".8" opacity=".55"${ns}/><path d="M-11,-11.5 C-14.5,-4 -14.5,4 -11.5,9" fill="none" stroke="${P.line}" stroke-width=".6" opacity=".3"${ns}/>`;
  o+=`<path d="M0.3,2 C-2,3.2 -4.5,4.1 -7,4.3" fill="none" stroke="${P.line}" stroke-width=".8"${ns}/><ellipse cx="-4.2" cy="-6.2" rx=".7" ry=".6" fill="${P.line}"/>`;
  // the pectoral fin lies over the body; then the eye
  o+=`<path d="M-21,3.5 C-27,1 -38,3 -49,10.5 C-41,10.5 -31,9.5 -21,7.5Z" fill="${P.fin}" fill-opacity=".78" stroke="${P.finDark}" stroke-width=".5"${ns}/><path d="M-22,4.6L-45,9.8M-22,6.2L-38,9.6" stroke="${P.finDark}" stroke-width=".45" opacity=".5"${ns}/>`;
  // a simple eye dot (no cartoon face)
  o+=`<circle cx="-8.4" cy="-7" r="2.5" fill="#1C1418"/><circle cx="-7.6" cy="-7.8" r=".75" fill="#fff" opacity=".85"/>`;
  return o+`</g></g>`}
// the sea is a cross-section of a frosted sky-blue acrylic tank; its water line stays exactly at y = water
function sky(W,H,water){const x0=6,x1=W-20,d=14,dy=-0.55*d,yb=H-6;
  let o=F.floor(W,H)+`<defs><linearGradient id="fsea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${SEA}" stop-opacity=".82"/><stop offset="1" stop-color="${DEEP}" stop-opacity=".9"/></linearGradient></defs>`;
  o+=`<circle cx="${W-90}" cy="70" r="30" fill="${PR.butter}" opacity=".45"/><circle cx="${W-90}" cy="70" r="20" fill="${PR.butter}" opacity=".5"/><path d="M${W-330},${water} q60,-46 120,-30 q50,-28 110,-8 q40,-6 80,38Z" fill="${PAL.case.mint}" opacity=".85"/><path d="M${W-330},${water} q60,-46 120,-30 q50,-28 110,-8" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="2"/>`;
  // the water: its body, the far side seen through the glass and the lit surface
  o+=`<path d="M${x1},${water} l${d},${dy} V${yb+dy} l${-d},${-dy}Z" fill="${DEEP}" opacity=".5"/>`;
  o+=`<rect x="${x0}" y="${water}" width="${x1-x0}" height="${yb-water}" fill="url(#fsea)"/>`;
  o+=`<path d="M${x0},${water} l${d},${dy} H${x1+d} l${-d},${-dy}Z" fill="#D4E8F8" stroke="#fff" stroke-opacity=".7"/>`;
  o+=[0,1,2,3].map(i=>`<path d="M${x0},${water+4+i*7} ${[...Array(20)].map((_,k)=>`q10,${k%2?3:-3} 20,0 t20,0`).join(" ")}" fill="none" stroke="#fff" stroke-opacity="${0.45-i*0.09}" clip-path="url(#ftank)"/>`).join("");
  o+=`<clipPath id="ftank"><rect x="${x0}" y="${water}" width="${x1-x0}" height="${yb-water}"/></clipPath>`;
  // the frosted glass walls rise a little above the water line
  o+=F.acrylic(x0,water-18,x1-x0,yb-water+18,{tint:TINT,d,r:8,opacity:.1,shadow:false});
  return o}
function angler(x,y,rodAng,rodLen){// rock, person, rod; returns the rod tip
  // the rock: a painted boulder with a lit top and a shaded side
  const rm=F.mat("painted",ROCK),d=14,dy=-0.55*d;
  let o=`<path d="M0,${y+8} L${x+60},${y} L${x+60+d},${y+dy} L${d},${y+8+dy}Z" fill="${rm.hi}" stroke="${rm.stroke}" stroke-width="1.2" stroke-linejoin="round"/>`;
  o+=`<path d="M${x+60},${y} L${x+60+d},${y+dy} L${x+78+d},${y+22+dy} L${x+70+d},${y+60+dy} L${x+70},${y+60} L${x+78},${y+22}Z" fill="${rm.shade}" stroke="${rm.stroke}" stroke-width="1.2" stroke-linejoin="round"/>`;
  o+=`<path d="M0,${y+8} L${x+60},${y} L${x+78},${y+22} L${x+70},${y+60} L0,${y+70}Z" fill="${ROCK}" stroke="${rm.stroke}" stroke-width="1.2" stroke-linejoin="round"/><path d="M${x+20},${y+14} l22,6 l10,16 M${x-30},${y+30} l18,10" fill="none" stroke="${rm.shade}" stroke-width="1.6" stroke-linecap="round"/>`;
  // a bait bucket beside the angler
  o+=F.cyl(x-38,y-8,9,13,{colour:PR.blueberry,kind:"painted",shadow:false})+`<path d="M${x-47},${y-8} q9,-14 18,0" fill="none" stroke="${PAL.steelDark}" stroke-width="1.4"/>`;
  // the angler: a simple painted figure (head, body, legs), no face
  o+=`<circle cx="${x}" cy="${y-62}" r="10" fill="#F2D0B4" stroke="#B88A6A"/><path d="M${x-9},${y-50} q9,-6 18,0 l4,32 l-26,0Z" fill="${PINK}" stroke="#A8455E" stroke-linejoin="round"/><path d="M${x-6},${y-46} q6,-3 10,0" stroke="#fff" stroke-opacity=".5" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M${x-6},${y-18} l-4,18 M${x+6},${y-18} l5,18" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`;
  const hx=x+12,hy=y-36,tx=hx+Math.cos(rodAng)*rodLen,ty=hy-Math.sin(rodAng)*rodLen;
  o+=`<path d="M${x+4},${y-44} L${hx},${hy}" stroke="#C9506F" stroke-width="4.4" stroke-linecap="round"/><line x1="${hx-Math.cos(rodAng)*14}" y1="${hy+Math.sin(rodAng)*14}" x2="${tx}" y2="${ty}" stroke="${ROD}" stroke-width="3.4" stroke-linecap="round"/><line x1="${hx-Math.cos(rodAng)*14}" y1="${hy+Math.sin(rodAng)*14-1}" x2="${hx+Math.cos(rodAng)*20}" y2="${hy-Math.sin(rodAng)*20-1}" stroke="#D9A877" stroke-width="4" stroke-linecap="round"/><line x1="${hx+Math.cos(rodAng)*24}" y1="${hy-Math.sin(rodAng)*24-1}" x2="${tx}" y2="${ty-1}" stroke="#fff" stroke-opacity=".35" stroke-width="1"/>`;
  const rx=hx+Math.cos(rodAng)*6,ry=hy-Math.sin(rodAng)*6+6;o+=`<circle cx="${rx}" cy="${ry}" r="5.5" fill="${PAL.steel}" stroke="${PAL.steelDark}"/><circle cx="${rx}" cy="${ry}" r="2" fill="${PAL.steelDark}"/><circle cx="${rx-2}" cy="${ry-2}" r="1.3" fill="#fff" opacity=".8"/>`;
  return{o,tx,ty}}
// the data card: a white label pill with the live numbers
function tag(x,y,w,txt,col=INK){return `<rect x="${x+3}" y="${y+4}" width="${w}" height="34" rx="12" fill="${PAL.shadow}" opacity=".1"/><rect x="${x}" y="${y}" width="${w}" height="34" rx="12" fill="#fff" stroke="${PAL.pill.line}"/><text x="${x+12}" y="${y+22}" style="font:600 14px var(--mono);fill:${col}">${txt}</text>`}
const steelBall=(cx,cy,r)=>`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${PAL.steelDark}" stroke="#5E6878"/><circle cx="${cx-r*.35}" cy="${cy-r*.35}" r="${r*.38}" fill="#E7ECF2" opacity=".85"/>`;

// ---- main scenes
function drawMain(st){const Wd=800,H=420;
  if(st.k==="lever")return leverScene();
  if(st.k==="stats"||st.k==="test"&&s.view==="stats")return statsScene();
  if(st.k==="float")return floatScene();
  if(st.k==="light")return lightScene();
  return castScene(st)}
function castScene(st){const Wd=800,H=420,water=262;let o=sky(Wd,H,water);
  const A=angler(64,250,Math.max(0.6,rad()+0.25),70);o+=A.o;
  const R=range(),sx=680/72,sy=5.6;const X=x=>A.tx+x*sx,Y=(x,y)=>A.ty+(water-A.ty)*(x/Math.max(R,0.1))-y*sy;
  const yAt=x=>Math.tan(rad())*x-G*x*x/(2*Math.pow(s.v*Math.cos(rad()),2));
  let d="";for(let i=0;i<=60;i++){const x=R*i/60;d+=(i?" L":"M")+X(x).toFixed(1)+","+Y(x,yAt(x)).toFixed(1)}
  o+=`<path d="${d}" fill="none" stroke="${PINK}" stroke-width="2.2" stroke-dasharray="5 5"/>`;
  // distance ruler on the water
  for(let m=0;m<=70;m+=10)o+=`<line x1="${X(m)}" x2="${X(m)}" y1="${water+20}" y2="${water+30}" stroke="${INK}" stroke-opacity=".7"/><text x="${X(m)}" y="${water+46}" text-anchor="middle" style="font:600 11px var(--mono);fill:${INK}">${m} m</text>`;
  o+=`<line x1="${X(0)}" x2="${X(70)}" y1="${water+25}" y2="${water+25}" stroke="${INK}" stroke-opacity=".5"/>`;
  const T=flight(),tt=Math.min(s.t%(T+1.2),T),xs=s.v*Math.cos(rad())*tt;
  if(s.t%(T+1.2)<T)o+=`<line x1="${A.tx}" y1="${A.ty}" x2="${X(xs)}" y2="${Y(xs,yAt(xs))}" stroke="${LINE}" stroke-width=".7" opacity=".6"/>`+steelBall(X(xs),Y(xs,yAt(xs)),6);
  else{o+=`<ellipse cx="${X(R)}" cy="${water+2}" rx="16" ry="4" fill="none" stroke="#fff" stroke-width="2"/>`+steelBall(X(R),water,5)}
  // the angle at the tip
  o+=`<path d="M${A.tx+40},${A.ty} A40,40 0 0 0 ${A.tx+40*Math.cos(rad())},${A.ty-40*Math.sin(rad())}" fill="none" stroke="${MINT}" stroke-width="2"/><line x1="${A.tx}" x2="${A.tx+56}" y1="${A.ty}" y2="${A.ty}" stroke="${MINT}" stroke-dasharray="3 3"/><text x="${A.tx+46}" y="${A.ty-10}" style="font:600 12px var(--mono);fill:${INK}">${s.ang}°</text>`;
  o+=tag(16,14,330,`${fmt(R,1)} m in ${fmt(T,2)} s · ${fmt(s.v)} m/s`);
  o+=`<text x="${Wd-32}" y="${H-14}" text-anchor="end" style="font:600 10px var(--mono);fill:${INK};opacity:.75">HEIGHTS SQUASHED TO FIT · NO AIR</text>`;
  return o}
function leverScene(){const Wd=800,H=420;let o=F.floor(Wd,H);
  const px=90,py=200,sc=560/3.6,tipX=px+s.L*sc,hx=px+s.d*sc,droop=8;
  // the rod: a painted blank with a cork grip and steel guides
  o+=`<line x1="${px-30}" y1="${py}" x2="${tipX}" y2="${py+droop}" stroke="${ROD}" stroke-width="7" stroke-linecap="round"/><line x1="${px-26}" y1="${py-1.6}" x2="${tipX-6}" y2="${py+droop-1.6}" stroke="#fff" stroke-opacity=".35" stroke-width="1.6" stroke-linecap="round"/>`;
  o+=`<line x1="${px-30}" y1="${py}" x2="${hx+16}" y2="${py+droop*(hx+16-px)/(tipX-px)}" stroke="#D9A877" stroke-width="10" stroke-linecap="round"/><line x1="${px-28}" y1="${py-2.6}" x2="${hx+14}" y2="${py-2.6+droop*(hx+14-px)/(tipX-px)}" stroke="#fff" stroke-opacity=".4" stroke-width="2" stroke-linecap="round"/>`;
  [0.25,0.5,0.75,0.95].forEach(f=>o+=`<circle cx="${px+f*(tipX-px)}" cy="${py+droop*f+6}" r="4" fill="none" stroke="${PAL.steelDark}" stroke-width="2"/><circle cx="${px+f*(tipX-px)}" cy="${py+droop*f+6}" r="4" fill="none" stroke="${PAL.steel}" stroke-width="1" stroke-dasharray="3 9"/>`);
  const fl=Math.min(170,60+s.m*14),fw=fl*0.36/38;// the snapper hangs nose-up from the line, as a hooked fish does
  o+=`<line x1="${tipX}" y1="${py+droop}" x2="${tipX}" y2="${py+30}" stroke="${LINE}" stroke-width="1.2"/>`+fish(tipX,py+30,fl,SNAP,1,1,undefined,-90);
  // the pivot: a steel wedge with a lit face and a shaded side
  o+=`<path d="M${px},${py+6} l6,-3.3 l16,30 l-6,3.3Z" fill="${F.mat("metal",PAL.steelDark).shade}" stroke="#5E6878" stroke-linejoin="round"/><path d="M${px},${py+6} l-16,30 h32Z" fill="${PAL.steelDark}" stroke="#5E6878" stroke-linejoin="round"/><path d="M${px-2},${py+12} l-9,17" stroke="#E7ECF2" stroke-opacity=".7" stroke-width="2" stroke-linecap="round"/><text x="${px}" y="${py+56}" text-anchor="middle" style="font:600 12px var(--mono);fill:${INK}">PIVOT</text><text x="${px}" y="${py+72}" text-anchor="middle" style="font:500 11px var(--mono);fill:${GREY}">back hand</text>`;
  o+=arrow(hx,py+60,hx,py+4,MINT,`EFFORT ${fmt(effort())} N`,"up");
  const ax=tipX-34*fw-14;o+=arrow(ax,py+30,ax,py+30+Math.min(110,30+W()*1.4),PINK,`LOAD ${fmt(W(),1)} N`,"down",true);
  o+=dim(px,hx,py-34,`d = ${fmt(s.d,2)} m`)+dim(px,tipX,py-70,`L = ${fmt(s.L,1)} m`);
  o+=tag(16,14,380,`${fmt(s.m,1)} kg fish · effort ${fmt(effort())} N`);
  o+=`<g transform="translate(${px-20},413)"><text style="font:500 12px var(--mono);fill:${GREY}">TIP MOVES ×${fmt(tipRatio(),1)} FURTHER THAN YOUR HAND</text></g>`;
  return o}
const METAL="#C9C4C9";
function arrow(x1,y1,x2,y2,col,label,dir,left){const a=dir==="up"?-1:1;return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="5"/><path d="M${x2-9},${y2-a*12} L${x2},${y2} L${x2+9},${y2-a*12}" fill="${col}"/><text x="${left?x2-14:x2+12}" y="${dir==="up"?y1-4:y2-6}" text-anchor="${left?"end":"start"}" style="font:600 13px var(--mono);fill:${INK}">${label}</text>`}
function dim(x1,x2,y,label){return `<line x1="${x1}" x2="${x2}" y1="${y}" y2="${y}" stroke="${INK}"/><line x1="${x1}" x2="${x1}" y1="${y-6}" y2="${y+6}" stroke="${INK}"/><line x1="${x2}" x2="${x2}" y1="${y-6}" y2="${y+6}" stroke="${INK}"/><rect x="${(x1+x2)/2-58}" y="${y-11}" width="116" height="20" rx="10" fill="#fff" stroke="${PAL.pill.line}"/><text x="${(x1+x2)/2}" y="${y+4}" text-anchor="middle" style="font:600 12px var(--mono);fill:${INK}">${label}</text>`}
function floatScene(){const Wd=800,H=420,water=150;let o=sky(Wd,H,water);
  const fx=400,fr=34,vol=FLOAT_V,sub=Math.min(vol,floatSub()),frac=sub/vol,ok=floats();
  const bob=Math.sin(s.bob)*3;const top=ok?water-2*fr*(1-frac)+bob:water+60+Math.min(140,s.t*40%140);
  // the float: a capsule, top half orange, bottom white; frac of it below the line
  o+=`<line x1="${fx}" y1="${top+2*fr}" x2="${fx}" y2="${top+2*fr+150}" stroke="${LINE}" stroke-width="1.2"/>`;
  // the float: a painted capsule, peach cap over a white body, with a lit streak
  const fm=F.mat("painted",PR.peach);
  o+=`<rect x="${fx-fr*0.45}" y="${top}" width="${fr*0.9}" height="${2*fr}" rx="${fr*0.45}" fill="#FBFAF7" stroke="#8F8AA3"/><path d="M${fx+fr*0.12},${top+fr} v${fr*0.8}" stroke="#D9D4E2" stroke-width="5" stroke-linecap="round"/><path d="M${fx-fr*0.45},${top+fr*0.45} a${fr*0.45},${fr*0.45} 0 0 1 ${fr*0.9},0 v${fr*0.55} h${-fr*0.9}Z" fill="${PR.peach}" stroke="${fm.stroke}"/><path d="M${fx-fr*0.22},${top+fr*0.3} v${fr*1.3}" stroke="#fff" stroke-opacity=".8" stroke-width="3" stroke-linecap="round"/><line x1="${fx}" y1="${top-16}" x2="${fx}" y2="${top}" stroke="${INK}" stroke-width="2"/><circle cx="${fx}" cy="${top-17}" r="2.6" fill="${PR.strawberry}"/>`;
  const sy=top+2*fr+150,sr=4+Math.cbrt(s.sink)*2.2;o+=`<ellipse cx="${fx}" cy="${sy}" rx="${sr*0.8}" ry="${sr}" fill="${PAL.steelDark}" stroke="#5E6878"/><ellipse cx="${fx-sr*0.25}" cy="${sy-sr*0.35}" rx="${sr*0.22}" ry="${sr*0.4}" fill="#E7ECF2" opacity=".8"/><path d="M${fx},${sy+sr} v18 q0,10 -8,6" fill="none" stroke="#5E6878" stroke-width="1.8"/>`;
  // forces on the float
  if(ok){o+=arrow(fx+70,top+fr,fx+70,top+fr-Math.min(90,20+frac*70),MINT,`UPTHRUST ${fmt(totalM()*G/1000,2)} N`,"up")+arrow(fx-60,top+fr,fx-60,top+fr+Math.min(90,20+frac*70),PINK,`WEIGHT ${fmt(totalM()*G/1000,2)} N`,"down",true)}
  o+=fish(225,320,110,SNAP,1,.9)+fish(620,360,80,SNAP,-1,.7);
  o+=tag(16,14,ok?390:330,ok?`${fmt(frac*100)}% of the float under water`:"Too heavy: the float sinks",ok?INK:PINK);
  return o}
function lightScene(){const Wd=800,H=420,water=150,sc=70;let o=sky(Wd,H,water);
  const fx=470,R=refractPath(),D=s.depth,ex=fx-s.eye*sc,ey=water-1.6*sc,Px=fx+R.px*sc,fy=water+D*sc,ay=water+R.app*sc;
  o+=`<line x1="${fx}" x2="${fx}" y1="${water-20}" y2="${H-6}" stroke="${INK}" stroke-dasharray="3 5" opacity=".35"/>`;
  if(s.eye>=0.02){o+=`<line x1="${Px}" x2="${Px}" y1="${water-60}" y2="${water+60}" stroke="${INK}" stroke-dasharray="2 4" opacity=".6"/><text x="${Px+6}" y="${water-48}" style="font:500 11px var(--mono);fill:${INK}">NORMAL</text>`;
    o+=`<line x1="${Px}" y1="${water}" x2="${fx}" y2="${ay}" stroke="#fff" stroke-width="2" stroke-dasharray="6 5"/>`}
  o+=fish(fx+48,ay,96,SNAP,1,.45)+`<text x="${fx+60}" y="${ay+4}" style="font:600 12px var(--mono);fill:${INK};opacity:.7">WHERE IT LOOKS · ${fmt(R.app,2)} m</text>`;
  o+=fish(fx+48,fy,96,SNAP,1,1)+`<text x="${fx+60}" y="${fy+4}" style="font:600 12px var(--mono);fill:${INK}">WHERE IT IS · ${fmt(D,2)} m</text>`;
  if(s.eye>=0.02)o+=`<path d="M${fx},${fy} L${Px},${water} L${ex},${ey}" fill="none" stroke="${SUN}" stroke-width="3"/><path d="M${(Px+ex)/2},${(water+ey)/2} l-4,-10 l10,3Z" fill="${SUN}"/>`;
  else o+=`<line x1="${fx}" y1="${fy}" x2="${fx}" y2="${ey}" stroke="${SUN}" stroke-width="3"/>`;
  o+=`<circle cx="${ex+2}" cy="${ey+3}" r="15" fill="${PAL.shadow}" opacity=".12"/><circle cx="${ex}" cy="${ey}" r="15" fill="#fff" stroke="${INK}" stroke-width="2"/><circle cx="${ex+4}" cy="${ey+3}" r="6" fill="${INK}"/><text x="${ex}" y="${ey-24}" text-anchor="middle" style="font:600 12px var(--mono);fill:${INK}">YOUR EYE</text>`;
  o+=tag(16,H-50,380,`Looks ${fmt(R.app,2)} m deep · really ${fmt(D,2)} m`);
  return o}
function statsScene(){const Wd=800,H=420,S=stats();let o=F.floor(Wd,H);
  const px=3,bw=56*px+10,gap=14;// px per cm: four measuring boards of five fish, so every snapper keeps its real shape
  [0,1,2,3].forEach(c=>{const x0=24+c*(bw+gap);o+=F.box(x0,40,bw-2,366,{colour:"#FFFDF8",kind:"plastic",d:8,r:8,shadow:c===3,shadowLen:20,stroke:"#CFC6BC"});
    for(let cm=0;cm<=55;cm+=5)o+=`<line x1="${x0+5+cm*px}" x2="${x0+5+cm*px}" y1="44" y2="${cm%10?50:56}" stroke="${INK}" opacity=".6"/>${cm%10?"":`<text x="${x0+5+cm*px}" y="68" text-anchor="middle" style="font:500 9px var(--mono);fill:${GREY}">${cm}</text>`}`;
    o+=`<line x1="${x0+5+MIN_SIZE*px}" x2="${x0+5+MIN_SIZE*px}" y1="44" y2="402" stroke="${PINK}" stroke-width="1.6" stroke-dasharray="4 3"/>`});
  s.sample.forEach((L,i)=>{const c=Math.floor(i/5),r=i%5,x0=24+c*(bw+gap)+5,y=108+r*64,keep=L>=MIN_SIZE;
    o+=fish(x0+L*px,y,L*px,keep?SNAP:"#E8D9DC",1,keep?1:.75)+`<text x="${x0+L*px+4}" y="${y+4}" style="font:600 11px var(--mono);fill:${keep?INK:"#9b8a90"}">${L}${keep?"":" ↩"}</text>`});
  o+=`<text x="24" y="28" style="font:600 13px var(--mono);fill:${INK}">CATCH ${s.catches} · 20 SNAPPER · ${S.keep} AT ${MIN_SIZE} cm OR MORE · ↩ = LET GO</text>`;
  return o}

// ---- close-ups
function castPanel(){const w=420,h=260,X=a=>46+a/90*350,maxR=range(26,Math.PI/4),Y=r=>220-r/maxR*180;let o=`<line x1="46" x2="400" y1="220" y2="220" stroke="var(--ink)"/><line x1="46" x2="46" y1="30" y2="220" stroke="var(--ink)"/>`;
  [0,15,30,45,60,75,90].forEach(a=>o+=`<text class="t-ax" x="${X(a)}" y="236" text-anchor="middle">${a}°</text>`);
  let d="";for(let a=0;a<=90;a++){d+=(a?" L":"M")+X(a).toFixed(1)+","+Y(range(s.v,a*Math.PI/180)).toFixed(1)}
  o+=`<path d="${d}" fill="none" stroke="${PINK}" stroke-width="2.2"/><line x1="${X(45)}" x2="${X(45)}" y1="${Y(range(s.v,Math.PI/4))}" y2="220" stroke="var(--ink)" stroke-dasharray="3 3"/>`;
  o+=`<circle cx="${X(s.ang)}" cy="${Y(range())}" r="6" fill="${INK}"/><text class="t-ink" x="54" y="24">Speed = distance ÷ time across the water</text><text class="t-ink" x="54" y="44">= ${fmt(range(),1)} ÷ ${fmt(flight(),2)} = ${fmt(range()/flight(),1)} m/s</text>`;
  o+=`<text class="t-lab" x="400" y="254" text-anchor="end">LAUNCH ANGLE · DISTANCE AT ${fmt(s.v)} m/s</text>`;return o}
function leverPanel(){return `<text class="t-lab" x="16" y="28">MOMENT = FORCE × DISTANCE FROM THE PIVOT</text>
  <text class="t-ink" x="16" y="60">Fish's weight: W = mg = ${fmt(s.m,1)} × 9.8 = ${fmt(W(),1)} N</text>
  <text class="t-ink" x="16" y="88">Turning down: ${fmt(W(),1)} N × ${fmt(s.L,1)} m = ${fmt(W()*s.L,1)} N m</text>
  <text class="t-ink" x="16" y="112">Turning up: F × ${fmt(s.d,2)} m</text>
  <text class="t-ink" x="16" y="144">Balanced: F = ${fmt(W()*s.L,1)} ÷ ${fmt(s.d,2)} = ${fmt(effort())} N</text>
  <text class="t-lab" x="16" y="184">THE TRADE-OFF</text>
  <text class="t-ink" x="16" y="208">Your hand pushes ${fmt(tipRatio(),1)}× harder than the fish pulls,</text><text class="t-ink" x="16" y="228">but the tip moves ${fmt(tipRatio(),1)}× further and faster. Great for casting.</text>`}
function floatPanel(){const mats=[["Foam",0.05],["Cork",0.24],["Pine",0.5],["Ice",0.92],["Fresh water",1.0],["Sea water",1.025],["Lead",11.3]];const X=r=>110+Math.min(r,2)/2*270;let o=`<text class="t-lab" x="16" y="22">DENSITY (g/cm³) · LESS DENSE THAN SEA WATER FLOATS</text>`;
  mats.forEach(([n,r],i)=>{const y=40+i*26;o+=`<text class="t-ink" x="16" y="${y+12}">${n}</text><rect x="110" y="${y}" width="${X(r)-110}" height="16" rx="3" fill="${r<1.025?MINT:r===1.025?SEA2:PINK}" opacity=".75"/><text class="t-lab" x="${X(r)+6}" y="${y+12}">${r>2?"11.3 →":r}</text>`});
  const a=avgRho(),y=40+mats.length*26+6;o+=`<line x1="${X(1.025)}" x2="${X(1.025)}" y1="34" y2="${y+18}" stroke="var(--ink)" stroke-dasharray="3 3"/><text class="t-ink" x="16" y="${y+14}" style="font-weight:600">Float + sinker</text><circle cx="${X(a)}" cy="${y+9}" r="7" fill="${a<RHO_SEA?MINT:PINK}" stroke="var(--ink)"/><text class="t-lab" x="${X(a)+12}" y="${y+13}">${fmt(a,3)}</text>`;
  return o}
function lightPanel(){const R=refractPath();return `<text class="t-lab" x="16" y="28">LIGHT BENDS AS IT LEAVES THE WATER</text>
  <text class="t-ink" x="16" y="58">Water slows light down: n = 1.33.</text><text class="t-ink" x="16" y="80">Leaving the water it speeds up and bends</text><text class="t-ink" x="16" y="100">away from the normal.</text>
  ${s.eye>=0.02?`<text class="t-ink" x="16" y="132">In water ${fmt(R.thw*180/Math.PI,0)}° from the normal, in air ${fmt(R.tha*180/Math.PI,0)}°</text>`:`<text class="t-ink" x="16" y="132">Straight down, the ray doesn't bend at all.</text>`}
  <text class="t-lab" x="16" y="170">LOOKING STRAIGHT DOWN</text><text class="t-ink" x="16" y="196">Apparent depth ≈ real depth ÷ 1.33</text><text class="t-ink" x="16" y="218">= ${fmt(s.depth,2)} ÷ 1.33 = ${fmt(appStraight(),2)} m</text>
  <text class="t-lab" x="16" y="248">FROM AN ANGLE IT LOOKS EVEN SHALLOWER</text>`}
function statsPanel(){const S=stats(),w=420,X=cm=>30+(cm-15)/45*370,bins={};S.a.forEach(v=>{const b=Math.floor(v/5)*5;bins[b]=(bins[b]||0)+1});let o="";const Y=c=>200-c*22;
  for(let b=15;b<60;b+=5){const c=bins[b]||0;o+=`<rect x="${X(b)+1}" y="${Y(c)}" width="${X(b+5)-X(b)-2}" height="${200-Y(c)}" fill="${b>=MIN_SIZE?SNAP:"#E8D9DC"}" stroke="${INK}" stroke-width=".6"/>`;if(c)o+=`<text class="t-lab" x="${(X(b)+X(b+5))/2}" y="${Y(c)-4}" text-anchor="middle">${c}</text>`}
  o+=`<line x1="30" x2="400" y1="200" y2="200" stroke="var(--ink)"/>`;[15,20,25,30,35,40,45,50,55,60].forEach(c=>o+=`<text class="t-ax" x="${X(c)}" y="214" text-anchor="middle">${c}</text>`);
  o+=`<line x1="${X(S.mean)}" x2="${X(S.mean)}" y1="40" y2="200" stroke="${MINT}" stroke-width="2.4"/><text class="t-lab" x="${X(S.mean)+(S.mean<S.med?-4:4)}" y="36" text-anchor="${S.mean<S.med?"end":"start"}" style="fill:${MINT}">MEAN ${fmt(S.mean,1)}</text>`;
  o+=`<line x1="${X(S.med)}" x2="${X(S.med)}" y1="54" y2="200" stroke="${PINK}" stroke-width="2.4" stroke-dasharray="5 3"/><text class="t-lab" x="${X(S.med)+(S.mean<S.med?4:-4)}" y="50" text-anchor="${S.mean<S.med?"start":"end"}" style="fill:${PINK}">MEDIAN ${fmt(S.med,1)}</text>`;
  o+=`<text class="t-lab" x="400" y="236" text-anchor="end">LENGTH (cm) · 5 cm GROUPS</text><text class="t-ink" x="30" y="256">Range ${S.max} − ${S.min} = ${S.max-S.min} cm · keep ${S.keep} of ${S.n} (${fmt(S.keep/S.n*100)}%)</text>`;
  return o}

// ---- steps
const steps=[
 {k:"cast",lab:"The cast",cap:"Cast the sinker out over the water. Change the angle and how fast it leaves the rod tip, then watch where it lands and how long it takes.",speed:1,speedLabel:"real time",controls:["play","ang","v"],
  big:"<b>The big idea:</b> average speed = distance ÷ time. Without air, a cast goes furthest at 45°: steeper wastes speed going up, flatter lands too soon.",
  exam:"The sinker travelled 31 m across the water in 2.1 s, so its average horizontal speed was 31 ÷ 2.1 ≈ 15 m/s. Gravity pulls it down the whole time, which is why its path curves. Ignoring air, the longest cast is at 45°.",
  trap:"Using the launch speed as the average speed. The sinker slows going up and speeds up coming down, so divide the total distance by the total time.",chips:["range","time","avg","height"]},
 {k:"lever",lab:"The rod is a lever",cap:"Hold a fish on the end of the rod. Your back hand is the pivot, your front hand pushes up, and the fish pulls the tip down. Change the rod, your grip and the fish.",controls:["L","d","m"],
  big:"<b>The big idea:</b> a moment is a turning effect: force × distance from the pivot. When it balances, clockwise moments = anticlockwise moments.",
  exam:"The fish's weight is W = mg = 2 × 9.8 = 19.6 N acting 2.4 m from the pivot, a moment of 47 N m. My front hand is 0.5 m from the pivot, so it must push with 47 ÷ 0.5 = 94 N to balance it. The rod trades force for distance: the tip moves 4.8 times further than my hand.",
  trap:"Using the mass (kg) instead of the weight (N). Moments use forces, so multiply the mass by 9.8 first.",chips:["weight","moment","effort","ratio"]},
 {k:"float",lab:"Float or sink",cap:"A foam float holds up a lead sinker. Add sinker weight and watch the float ride lower, until the whole rig is denser than sea water and sinks.",speed:1,speedLabel:"real time",controls:["play","sink"],
  big:"<b>The big idea:</b> density = mass ÷ volume. An object floats when its average density is less than the water's. Upthrust equals the weight of the water pushed aside.",
  exam:"Density = mass ÷ volume. Lead is 11.3 g/cm³, much denser than sea water (1.025 g/cm³), so a sinker alone sinks. The foam float is only 0.05 g/cm³. Together, the float and sinker have an average density below 1.025 g/cm³, so they float. Add too much lead and the average density goes above the water's, and the rig sinks.",
  trap:"Thinking heavy things always sink. A ship is very heavy but floats, because its average density (including the air inside) is less than water.",chips:["mass","vol","rho","sub"]},
 {k:"light",lab:"Where's the fish?",cap:"Look into the water and the fish seems closer to the surface than it really is. Move your eye and change the depth to see why.",controls:["depth","eye"],
  big:"<b>The big idea:</b> refraction. Light changes speed when it crosses from water into air, so it changes direction. Your brain assumes light travels in straight lines.",
  exam:"Light from the fish travels from water into air. It speeds up and bends away from the normal at the surface. My brain traces the light back in a straight line, so the fish appears higher than it really is. Looking straight down, a fish 2.0 m deep looks about 2.0 ÷ 1.33 = 1.5 m deep.",
  trap:"Saying light bends towards the normal as it leaves the water. Into a faster material (air) it bends away; into a slower one (water, glass) it bends towards.",chips:["real","app","bend"]},
 {k:"stats",lab:"The day's catch",cap:"Twenty snapper on the measuring board. The pink line is 30 cm, the minimum size in much of the upper North Island. Catch more samples and compare the mean and the median.",controls:["catch"],
  big:"<b>The big idea:</b> the mean adds up and shares out; the median is the middle value. A few very big or very small fish pull the mean but barely move the median.",
  exam:"To find the median of 20 lengths, put them in order and take the mean of the 10th and 11th values. To find the mean, add all 20 lengths and divide by 20. If a few large fish pull the mean above the median, the data is skewed to the right, so the median is the better 'typical' length.",
  trap:"Finding the middle of the list without ordering it first. Always sort the values, smallest to largest.",chips:["mean","median","rng","keep"]},
 {k:"test",lab:"Test yourself",cap:"Four challenges. Use the controls, then press Check. The picture follows the last control you used.",controls:["ang","v","sink","depth","catch"],chips:["range","rho","app","median"],
  big:"<b>Exam tip:</b> write the formula, put the numbers in with units, then say what it means: \"so the rig floats\"."}];
// ---- kupu Māori: te reo terms for this machine, each checked in Te Aka Māori Dictionary (ta = word id). Sources and notes: te-reo-notes.md
const KUPU=[
 {mi:"tere",en:"speed",ta:7953,chip:"avg"},
 {mi:"tōpana",en:"force",ta:40375,chip:"effort"},
 {mi:"taumaha",en:"weight",ta:7718,chip:"weight"},
 {mi:"papatipu",en:"mass",ta:5179,chip:"mass"},
 {mi:"rōrahi",en:"volume",ta:40040,chip:"vol"},
 {mi:"kiato",en:"density",ta:45567,chip:"rho"},
 {mi:"mānu",en:"to float",ta:3595},
 {mi:"totohu",en:"to sink",ta:8537}];
Object.entries({"cast": ["tere"], "lever": ["tōpana", "taumaha"], "float": ["kiato", "papatipu", "rōrahi", "mānu", "totohu"]}).forEach(([k,a])=>{const st=steps.find(x=>x.k===k);if(st)st.kupu=a});
StudyKit.mount({kupu:KUPU,
  eyebrow:"Science and maths · Forces, density, light and statistics", title:"The fishing machine", crumb:"Year 9 and 10 Science (forces, density, light) and Maths (rates, statistics)", homeHash:"y9",
  fig:"FIG. 14 · A ROCK, A ROD AND THE HAURAKI GULF", railTitle:"From cast to catch",
  badge:{label:"Forces, density, light and data · Years 9–11"},
  mainBox:"0 0 800 420", mainPhoneBig:true, mainLabel:"A person fishing from a rock: a cast over the water, a rod as a lever, a float and sinker, a fish under the surface and a measuring board", closeBox:"0 0 420 260",
  state:s, steps, onStep:(x,st)=>{s.step=st.k;s.t=0;if(st.k==="test")s.view=s.view||"cast"},
  controls:[{type:"play"},
    {type:"range",id:"ang",label:"Cast angle",min:10,max:75,step:1,get:()=>s.ang,set:(x,v)=>{s.ang=v;s.t=0;s.view="cast"},fmt:()=>s.ang+"°"},
    {type:"range",id:"v",label:"Launch speed",min:8,max:26,step:0.5,get:()=>s.v,set:(x,v)=>{s.v=v;s.t=0;s.view="cast"},fmt:()=>fmt(s.v,1)+" m/s"},
    {type:"range",id:"L",label:"Rod length",min:1.8,max:3.6,step:0.1,get:()=>s.L,set:(x,v)=>{s.L=v},fmt:()=>fmt(s.L,1)+" m"},
    {type:"range",id:"d",label:"Hands apart",min:0.3,max:0.8,step:0.05,get:()=>s.d,set:(x,v)=>{s.d=v},fmt:()=>fmt(s.d,2)+" m"},
    {type:"range",id:"m",label:"Fish",min:0.5,max:8,step:0.1,get:()=>s.m,set:(x,v)=>{s.m=v},fmt:()=>fmt(s.m,1)+" kg"},
    {type:"range",id:"sink",label:"Sinker",min:0,max:30,step:1,get:()=>s.sink,set:(x,v)=>{s.sink=v;s.t=0;s.view="float"},fmt:()=>s.sink+" g lead"},
    {type:"range",id:"depth",label:"Real depth",min:0.5,max:3,step:0.05,get:()=>s.depth,set:(x,v)=>{s.depth=v;s.view="light"},fmt:()=>fmt(s.depth,2)+" m"},
    {type:"range",id:"eye",label:"Your eye, sideways from the fish",min:0,max:4,step:0.1,get:()=>s.eye,set:(x,v)=>{s.eye=v},fmt:()=>s.eye<0.05?"straight above":fmt(s.eye,1)+" m"},
    {type:"button",id:"catch",label:"🎣 Catch another 20",onClick:()=>{s.sample=catchSample();s.catches++;s.view="stats"}}],
  tick:(x,dt,st)=>{s.t+=dt;s.bob+=dt*2.2},
  drawMain:(x,st)=>{if(st.k!=="test")return drawMain(st);const v=s.view||"cast";return v==="float"?floatScene():v==="light"?lightScene():v==="stats"?statsScene():castScene(st)},
  drawClose:(x,st)=>{const k=st.k==="test"?(s.view||"cast"):st.k;return k==="lever"?leverPanel():k==="float"?floatPanel():k==="light"?lightPanel():k==="stats"?statsPanel():castPanel()},
  chips:()=>{const S=stats(),R=refractPath();return{range:["DISTANCE",fmt(range(),1)+" m",true],time:["IN THE AIR",fmt(flight(),2)+" s"],avg:["AVERAGE SPEED",fmt(range()/flight(),1)+" m/s"],height:["HIGHEST",fmt(apex(),1)+" m up"],
    weight:["FISH WEIGHT",fmt(W(),1)+" N"],moment:["MOMENT",fmt(W()*s.L,1)+" N m"],effort:["YOUR PUSH",fmt(effort())+" N",true],ratio:["TIP MOVES",fmt(tipRatio(),1)+"× further"],
    mass:["RIG MASS",fmt(totalM())+" g"],vol:["RIG VOLUME",fmt(FLOAT_V+sinkV(),1)+" cm³"],rho:["AVERAGE DENSITY",fmt(avgRho(),3)+" g/cm³",true],sub:["FLOAT UNDER",floats()?fmt(floatSub()/FLOAT_V*100)+"%":"sinks"],
    real:["REAL DEPTH",fmt(s.depth,2)+" m"],app:["LOOKS",fmt(R.app,2)+" m deep",true],bend:["STRAIGHT DOWN",fmt(appStraight(),2)+" m"],
    mean:["MEAN",fmt(S.mean,1)+" cm",true],median:["MEDIAN",fmt(S.med,1)+" cm",true],rng:["RANGE",(S.max-S.min)+" cm"],keep:["KEEPERS",S.keep+" of 20"]}},
  challenges:[
    {q:"Land a cast exactly 40 m out (within 1 m).",check:()=>Math.abs(range()-40)<1,ok:()=>`Yes: ${fmt(range(),1)} m at ${s.ang}° and ${fmt(s.v,1)} m/s, in ${fmt(flight(),2)} s.`,no:()=>`Not yet: ${fmt(range(),1)} m. Try 45° first, then change the speed.`},
    {q:"Find the heaviest whole-gram sinker that still lets the float float.",check:()=>floats()&&s.sink===Math.floor((FLOAT_V*RHO_SEA-FLOAT_M)/(1-RHO_SEA/RHO_LEAD)),ok:()=>`Yes: ${s.sink} g. The rig's average density is ${fmt(avgRho(),3)} g/cm³, just under sea water's 1.025.`,no:()=>floats()?`It floats with ${s.sink} g, but could you add more?`:`At ${s.sink} g the average density is ${fmt(avgRho(),3)} g/cm³, more than 1.025, so it sinks.`},
    {q:"Looking straight down, set the real depth so the fish looks 1.5 m deep.",check:()=>Math.abs(appStraight()-1.5)<0.03,ok:()=>`Yes: ${fmt(s.depth,2)} ÷ 1.33 = ${fmt(appStraight(),2)} m.`,no:()=>`Not yet: ${fmt(s.depth,2)} ÷ 1.33 = ${fmt(appStraight(),2)} m. Real depth = apparent depth × 1.33.`},
    {q:"Catch samples until you get one where the median is 30 cm or more but the mean is under 30 cm.",check:()=>{const S=stats();return S.med>=30&&S.mean<30},ok:()=>{const S=stats();return `Yes: median ${fmt(S.med,1)}, mean ${fmt(S.mean,1)}. A few small fish drag the mean down but not the median.`},no:()=>{const S=stats();return `This sample: median ${fmt(S.med,1)}, mean ${fmt(S.mean,1)}. Catch another and look for small fish pulling the mean down.`}}],
  papers:[{label:"NZQA: Physics, Earth and Space Science",url:"https://www2.nzqa.govt.nz/ncea/subjects/past-exams-and-exemplars/physics-earth-and-space-science/"},{label:"NZQA: Mathematics and Statistics",url:"https://www2.nzqa.govt.nz/ncea/subjects/past-exams-and-exemplars/"},{label:"Fisheries NZ: fishing rules",url:"https://www.mpi.govt.nz/fishing-aquaculture/recreational-fishing/fishing-rules/"}],
  truth:"The cast ignores air resistance and the height of the rod tip, and heights are squashed to fit the screen. The rod is held level and treated as weightless. Densities are typical values; sea water is taken as 1.025 g/cm³ and its refractive index as 1.33. Snapper lengths are random samples, not real catch data. Minimum sizes and daily limits vary by area and change: check the current rules with Fisheries New Zealand before you fish.",
  footer:"Covers Year 9–10 forces and motion (speed, gravity, moments), matter (density, floating), light (refraction) and statistics (mean, median, range, skew). Leads into NCEA Level 1 science and maths."
});
})();
