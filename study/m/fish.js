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
// ---------- the 3D bench (../kit3d.js): a rock and a frosted sea tank in the Hauraki Gulf (Rangitoto behind), where the sinker flies a
// true-proportion parabola from the rod tip; a rod on a pivot with live effort and load vectors; a float tank with a density ladder;
// a cut-away tank where a glowing light ray bends at the surface on its way to your eye; and measuring boards of 3D snapper with a
// stacked histogram. Every part reads the same functions the challenges mark: range(), flight(), effort(), floatSub(), refractPath(), stats().
function fish3d(S){const {THREE,mat,PAL}=S;const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
  const ZC=V3(0,0,0),ZL=V3(20.2,0,.2),ZF=V3(26.8,0,.2),ZLi=V3(23.4,0,-11.8),ZS=V3(-8.6,0,.2),TOP=.3;
  const plinth=(x,z,w,d,tint)=>{const p=S.rbox(w,.3,d,.12,mat("plastic",tint,{rough:.55,coat:.2}));p.position.set(x,.15,z);S.scene.add(p);return p};
  plinth(6.1,0,17.4,4.2,PAL.case.mint);plinth(ZL.x+.4,ZL.z,6,3.4,PAL.case.peach);plinth(ZF.x+.3,ZF.z,5.2,3.4,PAL.case.mint);plinth(ZLi.x+.2,ZLi.z,6,3.4,PAL.case.peach);plinth(ZS.x,ZS.z,8.6,4.4,PAL.case.peach);
  const white=mat("plastic","#ffffff",{rough:.4}),steel=mat("metal",PAL.steel,{rough:.25}),steelD=mat("metal",PAL.steelDark,{rough:.3}),ink=mat("plastic",PAL.ink,{rough:.45});
  const waterM=mat("liquid",PAL.water,{opacity:.34,depthWrite:false}),tmp=V3(0,0,0),q=new THREE.Quaternion(),eul=new THREE.Euler();
  const toW=(g,x,y,z)=>tmp.set(x,y,z).applyMatrix4(g.matrixWorld);
  // ================================================================ instanced snapper (no faces): a body with a coppery back fading to a silver belly, a tail and a dorsal fin
  const bodyG=new THREE.SphereGeometry(1,28,16);{const p=bodyG.attributes.position,col=[];const c1=new THREE.Color("#B9B3B6"),c2=new THREE.Color("#E6E2E4"),c3=new THREE.Color("#FFFFFF"),c=new THREE.Color();
    for(let i=0;i<p.count;i++){let x=p.getX(i),y=p.getY(i);const f=x>0?1-.32*x*Math.max(0,y):1;p.setY(i,y*f);const k=(y+1)/2;if(k>.55)c.copy(c2).lerp(c1,(k-.55)/.45);else c.copy(c3).lerp(c2,k/.55);col.push(c.r,c.g,c.b)}
    bodyG.setAttribute("color",new THREE.Float32BufferAttribute(col,3));bodyG.scale(.42,.19,.075);bodyG.translate(.08,0,0);bodyG.computeVertexNormals()}
  const tailG=new THREE.ConeGeometry(.15,.22,4,1);tailG.rotateZ(-Math.PI/2);tailG.scale(1,1,.12);tailG.translate(-.43,0,0);
  const finG=new THREE.SphereGeometry(1,16,8,0,Math.PI*2,0,Math.PI/2);finG.scale(.25,.08,.012);finG.translate(-.02,.14,0);
  const NFISH=30,fBody=S.swarm(NFISH,bodyG,mat("plastic","#ffffff",{rough:.4,coat:.5,extra:{vertexColors:true}}),{colors:true,cast:true}),fTail=S.swarm(NFISH,tailG,mat("plastic","#ffffff",{rough:.5}),{colors:true,cast:true}),fFin=S.swarm(NFISH,finG,mat("plastic","#ffffff",{rough:.5}),{colors:true,cast:true});
  S.scene.add(fBody,fTail,fFin);
  const ghostM=new THREE.MeshBasicMaterial({color:"#F6B7A6",transparent:true,opacity:.35,depthWrite:false});const gBody=S.mesh(bodyG,ghostM,{cast:false}),gTail=S.mesh(tailG,ghostM,{cast:false});S.scene.add(gBody,gTail);
  function fishPut(i,x,y,z,len,rx,ry,rz,grey){eul.set(rx,ry,rz,"YZX");q.setFromEuler(eul);fBody.putS(i,x,y,z,len,len,len,q);fTail.putS(i,x,y,z,len,len,len,q);fFin.putS(i,x,y,z,len,len,len,q);
    fBody.tint(i,grey?"#E4DCE0":"#F08A70");fTail.tint(i,grey?"#CEC0C5":"#E58A71");fFin.tint(i,grey?"#CEC0C5":"#E58A71")}
  const fishHide=i=>{fBody.put(i,0,-50,0,.001);fTail.put(i,0,-50,0,.001);fFin.put(i,0,-50,0,.001)};
  for(let i=0;i<NFISH;i++)fishHide(i);
  // ================================================================ cast zone: rock, angler, sea tank, buoys, Rangitoto
  const K=1/5,X0=0,SEAW=14.6,WY=TOP+.7;
  const sea=S.acrylicCase(SEAW,.95,3,PAL.case.sky,{opacity:.12});sea.position.set(X0+SEAW/2,TOP,0);S.scene.add(sea);
  const seaWater=S.mesh(new THREE.BoxGeometry(SEAW-.06,.7,2.94),waterM,{cast:false});seaWater.position.set(X0+SEAW/2,TOP+.35,0);seaWater.renderOrder=2;S.scene.add(seaWater);
  const surfG=new THREE.PlaneGeometry(SEAW-.06,2.94,72,10);surfG.rotateX(-Math.PI/2);const surf=S.mesh(surfG,mat("liquid","#D4E8F8",{opacity:.55,depthWrite:false}),{cast:false});surf.position.set(X0+SEAW/2,WY,0);surf.renderOrder=3;S.scene.add(surf);
  const surfBase=Float32Array.from(surfG.attributes.position.array);
  const sand=S.rbox(SEAW-.08,.05,2.92,.02,mat("matte","#EFE3C8"),{at:[X0+SEAW/2,TOP+.03,0]});S.scene.add(sand);
  // the rock: a jittered icosahedron in painted grey-mauve
  const rockG=new THREE.IcosahedronGeometry(1,2);{const p=rockG.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);const n=1+.12*Math.sin(x*5+z*3)+.08*Math.cos(y*7);p.setXYZ(i,x*n,Math.max(-.2,y*n),z*n)}rockG.computeVertexNormals()}
  const rock=S.mesh(rockG,mat("plastic","#B7AAB8",{rough:.75,coat:.1}));rock.scale.set(1.3,.85,1.3);rock.position.set(-1.45,TOP+.15,0);S.scene.add(rock);const RT=TOP+.95;
  // the angler: helmet-like beanie, jacket, legs; no face
  const ang=S.group();ang.position.set(-1.6,RT,.1);
  for(const z of [-.08,.08])ang.add(S.cyl(.055,.06,.42,ink,{at:[0,.21,z],seg:12}));
  ang.add(S.mesh(new THREE.CapsuleGeometry(.17,.28,6,16),mat("plastic",PAL.product.strawberry,{rough:.4}),{at:[0,.66,0]}));
  ang.add(S.sphere(.13,mat("plastic","#F2D0B4",{rough:.5}),{at:[0,1.03,0]}));
  ang.add(S.mesh(new THREE.SphereGeometry(.142,20,10,0,Math.PI*2,0,Math.PI*.55),mat("plastic",PAL.product.butter,{rough:.6}),{at:[0,1.05,0]}));ang.add(S.sphere(.045,white,{at:[0,1.2,0]}));
  const bucket=S.cyl(.13,.1,.22,mat("plastic",PAL.product.blueberry,{rough:.4}),{at:[-1.85,RT-.08,-.45]});S.scene.add(bucket);
  const HAND=V3(-1.38,RT+.62,.1);
  const arm=S.tube([[-1.6,RT+.78,.1],[-1.48,RT+.62,.14],HAND],.04,mat("plastic",PAL.product.strawberry,{rough:.4}));S.scene.add(arm);
  const rod=S.group();rod.position.copy(HAND);S.scene.add(rod);const RODL=1.7;
  rod.add(S.cyl(.022,.009,RODL,mat("plastic",PAL.ink,{rough:.3}),{at:[RODL/2-.25,0,0],rot:[0,0,-Math.PI/2],seg:10}));
  rod.add(S.cyl(.032,.032,.45,mat("plastic","#D9A877",{rough:.7}),{at:[-.02,0,0],rot:[0,0,-Math.PI/2],seg:12}));
  rod.add(S.cyl(.06,.06,.05,steel,{at:[.08,-.07,0],rot:[Math.PI/2,0,0],seg:20}));
  for(const f of [.35,.7,1.05,1.35])rod.add(S.torus(.022,.005,steelD,{at:[f,-.03,0],rs:6,ts:16}));
  const rodTip=V3(0,0,0);
  // the cast: predicted arc, a steel sinker with a velocity vector and the pull of gravity, a trail and a splash
  const arcM=mat("glow",PAL.product.strawberry,1.1);let arc=null,arcKey="";
  const sinker=S.sphere(.09,mat("metal",PAL.steelDark,{rough:.22}),{seg:20});S.scene.add(sinker);
  const vArrow=S.arrow(PAL.deep.mint,{r:.03}),gArrow=S.arrow(PAL.product.strawberry,{r:.03});S.scene.add(vArrow,gArrow);
  const lineG=new THREE.BufferGeometry().setFromPoints(Array.from({length:16},()=>V3(0,0,0)));const fline=new THREE.Line(lineG,new THREE.LineBasicMaterial({color:"#5A6072",transparent:true,opacity:.7}));fline.frustumCulled=false;S.scene.add(fline);
  const trail=S.puffs(40,"#ffffff");S.scene.add(trail);const tr=[];for(let i=0;i<40;i++)tr.push({x:0,y:0,z:0,life:0});let tri=0,trT=0;
  const splash=S.torus(.2,.025,mat("flat","#ffffff",{opacity:.9}),{rot:[Math.PI/2,0,0],cast:false});splash.material=new THREE.MeshBasicMaterial({color:"#ffffff",transparent:true,opacity:0,depthWrite:false});S.scene.add(splash);
  const drops=S.puffs(30,"#ffffff");S.scene.add(drops);const dr=[];for(let i=0;i<30;i++)dr.push({x:0,y:0,z:0,vx:0,vy:0,vz:0,life:0});let lastLand=-1;
  const angArc=S.torus(.5,.014,mat("plastic",PAL.deep.mint,{rough:.4}),{cast:false});S.scene.add(angArc);
  const NBY=7,buoys=S.swarm(NBY,new THREE.CylinderGeometry(.07,.09,.22,16),mat("plastic","#ffffff",{rough:.4}),{colors:true,cast:true});S.scene.add(buoys);
  // Rangitoto: a broad, gentle bush-green shield volcano behind the sea
  {const pr=[];for(let i=0;i<=24;i++){const u=i/24;const r=3.2*(1-u);const y=1.5*(1-Math.pow(1-u,1.6))-(u>.94?(u-.94)*1.5:0);pr.push(new THREE.Vector2(Math.max(.001,r),y))}
    const vol=S.mesh(new THREE.LatheGeometry(pr,48),mat("plastic","#A9D9BF",{rough:.7,coat:.1}));vol.position.set(8.6,0,-3.9);vol.scale.set(1,1,.55);S.scene.add(vol)}
  const sun=S.sphere(.55,mat("glow",PAL.product.butter,1.3),{cast:false});sun.position.set(14,7.5,-14);S.scene.add(sun);
  // ================================================================ lever zone: the rod on a pivot, your front hand, the hanging fish
  const lz=S.group();lz.position.set(ZL.x,TOP,ZL.z);const PX=-2.1,PY=1.55;
  lz.add(S.rbox(5.6,2.6,.12,.06,mat("plastic","#ffffff",{rough:.5}),{at:[.4,1.55,-1.4]}));
  const pivot=S.mesh(new THREE.CylinderGeometry(0,.3,.62,3),steelD);pivot.rotation.y=Math.PI/6;pivot.position.set(PX,PY-.37,0);lz.add(pivot);lz.add(S.rbox(.8,PY-.68,.6,.06,white,{at:[PX,(PY-.68)/2,0]}));
  const glove=c=>{const g=new THREE.Group();g.add(S.rbox(.2,.16,.24,.07,mat("plastic",c,{rough:.5})));return g};
  const backHand=glove(PAL.product.blueberry);backHand.position.set(PX,PY+.12,0);lz.add(backHand);
  const frontHand=glove(PAL.product.lime);lz.add(frontHand);
  const lrod=S.group(lz);lrod.position.set(PX,PY,0);
  const lrodBlank=S.cyl(.035,.013,1,mat("plastic",PAL.ink,{rough:.3}),{rot:[0,0,-Math.PI/2],seg:12});lrod.add(lrodBlank);
  lrod.add(S.cyl(.05,.05,.7,mat("plastic","#D9A877",{rough:.7}),{at:[.12,0,0],rot:[0,0,-Math.PI/2],seg:14}));lrod.add(S.sphere(.055,ink,{at:[-.24,0,0]}));
  const guides=[0,1,2,3].map(()=>{const g=S.torus(.03,.007,steelD,{rs:6,ts:16});lrod.add(g);return g});
  const lline=S.cyl(.006,.006,1,mat("plastic","#5A6072"),{seg:4,cast:false});lz.add(lline);
  const effA=S.arrow(PAL.deep.mint,{r:.045}),loadA=S.arrow(PAL.product.strawberry,{r:.045});lz.add(effA,loadA);
  const dimM=mat("plastic",PAL.ink,{rough:.5});const dimL=S.box(1,.02,.02,dimM),dimD=S.box(1,.02,.02,dimM);lz.add(dimL,dimD);
  const ticks=[0,1,2,3].map(()=>{const m=S.box(.02,.14,.02,dimM);lz.add(m);return m});
  const mPanel=S.panel(560,300,1.62);mPanel.position.set(2.42,2.12,-1.33);lz.add(mPanel);let mKey="";
  S.dragger(frontHand,{normal:V3(0,0,1),move:p=>{const l=lz.worldToLocal(p.clone());s.d=Math.round(S.clamp(l.x-PX,.3,.8)/.05)*.05;s.d=+s.d.toFixed(2)}});
  // ================================================================ float zone: a float tank and a density ladder
  const fz=S.group();fz.position.set(ZF.x,TOP,ZF.z);const FTX=-.7,FTH=2.6,FW=2.1;
  const ft=S.acrylicCase(2.2,FTH,1.4,PAL.case.sky,{opacity:.12});ft.position.set(FTX,0,0);fz.add(ft);
  const fwater=S.mesh(new THREE.BoxGeometry(2.14,FW,1.34),waterM,{cast:false});fwater.position.set(FTX,FW/2,0);fwater.renderOrder=2;fz.add(fwater);
  const fsurf=S.mesh(new THREE.PlaneGeometry(2.14,1.34),mat("liquid","#D4E8F8",{opacity:.5,depthWrite:false}),{rot:[-Math.PI/2,0,0],cast:false});fsurf.position.set(FTX,FW,0);fsurf.renderOrder=3;fz.add(fsurf);
  fz.add(S.rbox(2.12,.05,1.32,.02,mat("matte","#EFE3C8"),{at:[FTX,.03,0]}));
  const flt=S.group(fz);const FR=.14,FH=.78;
  flt.add(S.mesh(new THREE.CapsuleGeometry(FR,FH-2*FR,8,24),white,{at:[0,FH/2,0]}));
  flt.add(S.cyl(FR+.004,FR+.004,FH/2-FR,mat("plastic",PAL.product.peach,{rough:.35}),{at:[0,FH/2+(FH/2-FR)/2,0],seg:24}));
  flt.add(S.mesh(new THREE.SphereGeometry(FR+.004,24,10,0,Math.PI*2,0,Math.PI/2),mat("plastic",PAL.product.peach,{rough:.35}),{at:[0,FH-FR,0]}));
  flt.add(S.cyl(.012,.012,.26,ink,{at:[0,FH+.13,0],seg:8}));flt.add(S.sphere(.03,mat("plastic",PAL.product.strawberry),{at:[0,FH+.27,0]}));
  const fline2=S.cyl(.005,.005,1,mat("plastic","#5A6072"),{seg:4,cast:false});fz.add(fline2);
  const lead=S.sphere(1,mat("metal",PAL.steelDark,{rough:.25}),{seg:20});fz.add(lead);
  const upA=S.arrow(PAL.deep.mint,{r:.035}),wA=S.arrow(PAL.product.strawberry,{r:.035});fz.add(upA,wA);
  const bubbles=S.swarm(40,new THREE.SphereGeometry(1,10,8),mat("plastic","#ffffff",{rough:.05,coat:1}));fz.add(bubbles);const bub=[];for(let i=0;i<40;i++)bub.push({x:FTX+(Math.random()-.5)*1.8,y:Math.random()*FW,z:(Math.random()-.5)*1,v:.15+Math.random()*.25,r:.012+Math.random()*.02});
  const LTX=1.45,LW=1.2;const lt=S.acrylicCase(1.7,1.6,1.1,PAL.case.sky,{opacity:.12});lt.position.set(LTX,0,0);fz.add(lt);
  const lwater=S.mesh(new THREE.BoxGeometry(1.64,LW,1.04),waterM,{cast:false});lwater.position.set(LTX,LW/2,0);lwater.renderOrder=2;fz.add(lwater);
  const lsurf=S.mesh(new THREE.PlaneGeometry(1.64,1.04),mat("liquid","#D4E8F8",{opacity:.5,depthWrite:false}),{rot:[-Math.PI/2,0,0],cast:false});lsurf.position.set(LTX,LW,0);lsurf.renderOrder=3;fz.add(lsurf);
  const LAD=[["Foam",.05,"#ffffff",.05],["Cork",.24,"#D9A877",.05],["Pine",.5,PAL.product.butter,.05],["Ice",.92,"#E6F3FC",.05],["Lead",11.3,PAL.steelDark,.05]];const CS=.24;
  const cubes=LAD.map(([n,r,c],i)=>{const m=S.rbox(CS,CS,CS,.04,n==="Lead"?mat("metal",c,{rough:.3}):n==="Ice"?mat("plastic",c,{rough:.1,coat:1}):mat("plastic",c,{rough:.6}));const x=LTX-.62+i*.31;
    const sub=Math.min(1,r/1.025);m.position.set(x,r>1.025?CS/2+.02:LW-CS/2+(1-sub)*CS,(i%2?.15:-.15));m.userData={x,sub,r,base:m.position.y};fz.add(m);return m});
  // ================================================================ light zone: a cut-away tank, the real fish, its ghost and a glowing ray
  const lzg=S.group();lzg.position.set(ZLi.x,TOP,ZLi.z);const LS=.8,LWY=2.6,FX=1.15;
  const ltank=S.acrylicCase(4.4,LWY+.25,1.4,PAL.case.sky,{opacity:.12});ltank.position.set(.3,0,0);lzg.add(ltank);
  const lw2=S.mesh(new THREE.BoxGeometry(4.34,LWY,1.34),waterM,{cast:false});lw2.position.set(.3,LWY/2,0);lw2.renderOrder=2;lzg.add(lw2);
  const ls2=S.mesh(new THREE.PlaneGeometry(4.34,1.34),mat("liquid","#D4E8F8",{opacity:.45,depthWrite:false}),{rot:[-Math.PI/2,0,0],cast:false});ls2.position.set(.3,LWY,0);ls2.renderOrder=3;lzg.add(ls2);
  lzg.add(S.rbox(4.32,.05,1.32,.02,mat("matte","#EFE3C8"),{at:[.3,.03,0]}));
  for(let i=0;i<9;i++){const w=S.cyl(.02,.03,.3+Math.sin(i*2.1)*.15+.2,mat("plastic","#9CCFB4",{rough:.6}),{seg:6});w.position.set(-1.6+i*.42+Math.sin(i)*.1,.25,-.45+Math.cos(i*1.7)*.15);w.rotation.z=Math.sin(i)*.2;lzg.add(w)}
  const beamM=S.M.glow(PAL.product.butter,5);let beam=null,beamKey="";
  const eye=S.group(lzg);eye.add(S.sphere(.17,mat("plastic","#ffffff",{rough:.2}),{seg:28}));const iris=S.sphere(.08,ink,{seg:16});eye.add(iris);
  const NDASH=40,dash=S.swarm(NDASH,new THREE.CylinderGeometry(.012,.012,1,6),new THREE.MeshBasicMaterial({color:"#ffffff"}),{colors:true});lzg.add(dash);
  const photons=S.puffs(24,"#FFE08A",{additive:true});lzg.add(photons);
  S.dragger(eye,{normal:V3(0,0,1),move:p=>{const l=lzg.worldToLocal(p.clone());s.eye=+(Math.round(S.clamp((FX-l.x)/LS,0,4)*10)/10).toFixed(1)}});
  // ================================================================ stats zone: four measuring boards and a stacked histogram
  const sz=S.group();sz.position.set(ZS.x,TOP,ZS.z);const CM=.028,BWD=56*CM+.18,BX0=-3.7,BZ0=-.15;
  const boardM=mat("plastic","#FFFDF8",{rough:.5}),pinkM=mat("plastic",PAL.product.strawberry,{rough:.4});
  for(let c=0;c<4;c++){const x0=BX0+c*(BWD+.12);sz.add(S.rbox(BWD,.06,2.05,.03,boardM,{at:[x0+BWD/2,.03,BZ0+.85]}));
    for(let cm=0;cm<=55;cm+=5)sz.add(S.box(.008,.01,cm%10?.07:.13,mat("flat",PAL.ink,{opacity:.6}),{at:[x0+.09+cm*CM,.065,BZ0-.1+(cm%10?.035:.065)],cast:false}));
    sz.add(S.box(.014,.012,1.9,pinkM,{at:[x0+.09+30*CM,.066,BZ0+.9],cast:false}))}
  const HB0=15,HBW=.8,HX0=-3.6;const blocks=S.swarm(40,new S.RoundedBoxGeometry(1,1,1,2,.12),mat("plastic","#ffffff",{rough:.4}),{colors:true,cast:true});sz.add(blocks);
  sz.add(S.rbox(7.4,.05,.5,.02,white,{at:[0,.025,-1.55]}));
  const meanBar=S.box(.04,1.9,.04,mat("glow",PAL.product.lime,1.6),{cast:false}),medBar=S.box(.04,1.9,.04,mat("glow",PAL.product.strawberry,1.6),{cast:false});sz.add(meanBar,medBar);
  const chilly=S.group(sz);chilly.position.set(3.75,0,1.55);chilly.add(S.rbox(.7,.42,.46,.06,mat("plastic",PAL.product.blueberry,{rough:.4}),{at:[0,.21,0]}));chilly.add(S.rbox(.74,.08,.5,.04,white,{at:[0,.46,0]}));
  S.pick(chilly,()=>{const st=S.api.step;if(!(st.controls||[]).includes("catch"))return;s.sample=catchSample();s.catches++;s.view="stats"});
  let sKey="",catchT=-9,lastCatch=s.catches;
  // ================================================================ labels
  const L=o=>S.label(o);
  const cL={dist:L({cls:"big",off:[20,-40]}),sink:L({off:[24,-20]}),ang:L({off:[-30,-30]}),g:L({off:[24,16]}),marks:[0,20,40,60].map(()=>L({off:[0,26],lead:false}))};
  const lL={eff:L({cls:"hot",off:[24,10]}),load:L({cls:"hot",off:[24,10]}),piv:L({off:[-30,46]}),dL:L({off:[0,-24],lead:false}),dD:L({off:[0,-24],lead:false}),drag:L({off:[30,-34]})};
  const fL={sub:L({cls:"big",off:[60,40]}),up:L({off:[24,-10]}),w:L({off:[-24,10]}),rho:L({off:[-30,-30]}),lad:LAD.map((x,i)=>L({off:[0,i%2?34:-34],lead:false}))};
  const liL={real:L({cls:"big",off:[30,10]}),app:L({off:[30,-16]}),eye:L({off:[-24,-26]}),nor:L({off:[16,-30]}),ang:L({off:[-30,16]})};
  const sL={mean:L({cls:"hot",off:[-20,-24]}),med:L({cls:"hot",off:[20,-24]}),keep:L({off:[-10,-34]}),chilly:L({off:[-20,-30]}),min:L({off:[10,30],lead:false})};
  const zoneLabels={cast:[cL.dist,cL.sink,cL.ang,cL.g,...cL.marks],lever:Object.values(lL),float:[fL.sub,fL.up,fL.w,fL.rho,...fL.lad],light:Object.values(liL),stats:Object.values(sL)};
  // ================================================================ views
  S.view("cast",[6.4,4.6,15.6],[5.6,2.0,0],{min:3,max:30});
  S.view("lever",[ZL.x+.9,2.8,ZL.z+7.2],[ZL.x+.35,1.5,ZL.z],{min:3,max:20});
  S.view("float",[ZF.x+.5,2.9,ZF.z+7.8],[ZF.x+.3,1.45,ZF.z],{min:3,max:20});
  S.view("light",[ZLi.x+.2,3.4,ZLi.z+9.6],[ZLi.x-.2,2.25,ZLi.z],{min:3,max:20});
  S.view("stats",[ZS.x+.2,6.0,ZS.z+7.4],[ZS.x,.45,ZS.z-.1],{min:3,max:20});
  S.view("all",[8.8,11.5,37],[8.8,1.3,-4.2],{min:6,max:60});
  const shadowOf={cast:[9,[6,0,0]],lever:[4.5,[ZL.x,0,ZL.z]],float:[4,[ZF.x,0,ZF.z]],light:[4.5,[ZLi.x,0,ZLi.z]],stats:[5.5,[ZS.x,0,ZS.z]],all:[24,[8.8,0,-4]]};
  let zone="all",testView=null;S.goView("all",true);
  const setZone=(z,labelsZ)=>{zone=z;S.goView(z);S.setShadowBox(...shadowOf[z]);for(const k in zoneLabels)zoneLabels[k].forEach(l=>l.show(k===labelsZ))};
  return {
    step(st){if(st.k==="test"){setZone("all",null);testView=s.view||"cast"}else{testView=null;setZone(st.k,st.k)}},
    update(s,st,dt,t){
      if(st.k==="test"&&s.view&&s.view!==testView){testView=s.view;setZone(s.view,s.view)}
      const live=zone==="all"?null:zone;
      // ---- sea surface ripples
      if(!S.REDUCED||zone==="cast"){const p=surfG.attributes.position;for(let i=0;i<p.count;i++){const x=surfBase[i*3],z=surfBase[i*3+2];p.setY(i,.02*Math.sin(x*1.6+t*1.4)+.015*Math.sin(z*3+x*.7-t*1.1))}p.needsUpdate=true;surfG.computeVertexNormals()}
      // ---- cast
      const a=rad(),R=range(),T=flight(),rodAng=Math.max(.6,a+.25);rod.rotation.z=rodAng;rod.updateMatrixWorld();rodTip.copy(toW(rod,RODL-.25,0,0));
      const Ry=x=>rodTip.y+(WY-rodTip.y)*(x/Math.max(R,.1));const yAt=x=>Math.tan(a)*x-G*x*x/(2*Math.pow(s.v*Math.cos(a),2));const P=x=>V3(rodTip.x+x*K,Ry(x)+yAt(x)*K,rodTip.z);
      const ak=s.ang+"|"+s.v;if(ak!==arcKey){arcKey=ak;if(arc){S.scene.remove(arc);arc.geometry.dispose()}arc=S.tube(Array.from({length:41},(_,i)=>P(R*i/40)),.016,arcM,{seg:160,cast:false});S.scene.add(arc)}
      const cyc=T+1.2,ph=st.k==="cast"?s.t%cyc:T+1;const flying=ph<T;const tt=Math.min(ph,T),xs=s.v*Math.cos(a)*tt;
      const sp=flying?P(xs):V3(rodTip.x+R*K,WY+.03+Math.sin(t*2)*.015,rodTip.z);sinker.position.copy(sp);
      const vx=s.v*Math.cos(a),vy=s.v*Math.sin(a)-G*tt;
      vArrow.visible=gArrow.visible=false;if(flying&&live==="cast"){vArrow.set(sp,V3(vx,vy,0),.06);gArrow.set(sp,V3(0,-1,0),.45)}
      {const pts=lineG.attributes.position;for(let i=0;i<16;i++){const u=i/15;pts.setXYZ(i,S.lerp(rodTip.x,sp.x,u),S.lerp(rodTip.y,sp.y,u)-Math.sin(u*Math.PI)*(flying?.05:.35),S.lerp(rodTip.z,sp.z,u))}pts.needsUpdate=true}
      trT+=dt;if(flying&&trT>.03){trT=0;const p=tr[tri=(tri+1)%40];p.x=sp.x;p.y=sp.y;p.z=sp.z;p.life=1}
      for(let i=0;i<40;i++){const p=tr[i];p.life-=dt*1.4;trail.put(i,p.x,p.y,p.z,p.life>0?p.life*.6:0,70+(1-p.life)*60)}trail.done();
      const landK=Math.floor(s.t/cyc);if(st.k==="cast"&&!flying&&landK!==lastLand){lastLand=landK;for(const d of dr){d.x=sp.x;d.y=WY;d.z=sp.z;d.vx=(Math.random()-.5)*.8;d.vy=.8+Math.random()*.8;d.vz=(Math.random()-.5)*.8;d.life=.8}}
      const sl=st.k==="cast"?ph-T:2;splash.position.set(rodTip.x+R*K,WY+.02,rodTip.z);splash.scale.setScalar(.4+sl*2.2);splash.material.opacity=sl<1.2&&sl>=0?(1-sl/1.2)*.8:0;
      for(let i=0;i<30;i++){const d=dr[i];if(d.life>0){d.life-=dt;d.vy-=4*dt;d.x+=d.vx*dt;d.y+=d.vy*dt;d.z+=d.vz*dt}drops.put(i,d.x,d.y,d.z,d.life>0?d.life:0,60)}drops.done();
      if(angArc.userData.a!==a){angArc.userData.a=a;angArc.geometry.dispose();angArc.geometry=new THREE.TorusGeometry(.5,.014,6,32,a)}angArc.position.copy(rodTip);
      for(let i=0;i<NBY;i++){const m=(i+1)*10,x=rodTip.x+m*K;buoys.put(i,x,WY+.05+Math.sin(t*1.5+i)*.02,-.9,1);buoys.tint(i,i%2?PAL.product.strawberry:"#ffffff")}buoys.done();
      [0,20,40,60].forEach((m,i)=>cL.marks[i].at(tmp.set(rodTip.x+m*K,WY,-.9)).set(`${m} m`));
      cL.dist.at(tmp.set(rodTip.x+R*K,WY+.1,0)).set(`${fmt(R,1)} m in ${fmt(T,2)} s<small>${fmt(R/T,1)} m/s across the water</small>`);
      cL.sink.show(live==="cast"&&flying).at(sp).set(`Speed <b>${fmt(Math.hypot(vx,vy),1)} m/s</b>`);cL.g.show(live==="cast"&&flying).at(tmp.set(sp.x,sp.y-.45,sp.z)).set("Gravity");
      cL.ang.at(tmp.set(rodTip.x+.5*Math.cos(a/2),rodTip.y+.5*Math.sin(a/2),rodTip.z)).set(`${s.ang}°<small>${fmt(s.v,1)} m/s</small>`);
      // swimming snapper under the sea
      for(let i=0;i<3;i++){const u=(t*.05+i*.33)%1,x=1.5+u*11,z=-.6+i*.55;fishPut(24+i,x,TOP+.25+i*.1+Math.sin(t+i)*.03,z,.55,0,0,Math.sin(t*3+i)*.08)}
      // ---- lever
      const Lr=s.L,d=s.d,Wn=W(),Fe=effort();const rock_=S.REDUCED?0:.035*Math.sin(t*1.6);lrod.rotation.z=rock_;
      lrodBlank.scale.y=Lr+.25;lrodBlank.position.x=(Lr-.25)/2;[.3,.55,.78,.97].forEach((f,i)=>{guides[i].position.set(f*Lr,-.04,0)});
      const tipL=V3(PX+Lr*Math.cos(rock_),PY+Lr*Math.sin(rock_),0),handP=V3(PX+d*Math.cos(rock_),PY+d*Math.sin(rock_)-.11,0);frontHand.position.copy(handP);
      const flen=S.clamp(.38+s.m*.075,.4,1.0),fishTop=tipL.y-.42;lline.scale.y=.42-.0;lline.position.set(tipL.x,tipL.y-.21,0);
      fishPut(20,ZL.x+tipL.x,TOP+fishTop-flen/2,ZL.z,flen,0,0,Math.PI/2+Math.sin(t*1.3)*.04);
      const fs=1/250,eL=Math.min(1.3,Math.max(.35,Fe*fs));effA.set(V3(handP.x,handP.y-.08-eL,0),V3(0,1,0),eL);loadA.set(V3(tipL.x+.36,fishTop-.1,0),V3(0,-1,0),Math.max(.32,Wn*fs));
      dimL.scale.x=Lr;dimL.position.set(PX+Lr/2,PY+.8,0);dimD.scale.x=d;dimD.position.set(PX+d/2,PY+.5,0);
      ticks[0].position.set(PX,PY+.8,0);ticks[1].position.set(PX+Lr,PY+.8,0);ticks[2].position.set(PX,PY+.5,0);ticks[3].position.set(PX+d,PY+.5,0);
      const mk=[Lr,d,s.m].join("|");if(mk!==mKey){mKey=mk;mPanel.redraw((g,w,h)=>{g.fillStyle="#ffffff";g.beginPath();g.roundRect(0,0,w,h,24);g.fill();g.strokeStyle="#DCD6EA";g.lineWidth=3;g.stroke();
        g.fillStyle="#6E6A86";g.font="600 20px Instrument Sans, system-ui";g.textAlign="left";g.fillText("MOMENTS ABOUT THE PIVOT",26,40);
        const M=Wn*Lr,bar=(y,lab,val,c)=>{g.fillStyle="#222A55";g.font="600 22px Instrument Sans, system-ui";g.fillText(lab,26,y);g.fillStyle=c;g.beginPath();g.roundRect(26,y+10,w-52,30,15);g.fill();g.fillStyle="#fff";g.font="700 22px IBM Plex Mono, monospace";g.fillText(val,40,y+33)};
        bar(84,"Turning down: fish",`${fmt(Wn,1)} N × ${fmt(Lr,1)} m = ${fmt(M,1)} N m`,PAL.product.strawberry);bar(170,"Turning up: your front hand",`${fmt(Fe)} N × ${fmt(d,2)} m = ${fmt(Fe*d,1)} N m`,PAL.deep.mint);
        g.fillStyle="#222A55";g.font="600 22px Instrument Sans, system-ui";g.fillText(`Tip moves ×${fmt(tipRatio(),1)} further than your hand`,26,h-30)})}
      const lw=lz.position;lL.eff.at(tmp.set(lw.x+handP.x,lw.y+handP.y-.5,lw.z)).set(`Effort<b>${fmt(Fe)} N</b>`);lL.load.at(tmp.set(lw.x+tipL.x+.36,lw.y+fishTop-.4,lw.z)).set(`Load<b>${fmt(Wn,1)} N</b><small>${fmt(s.m,1)} kg fish</small>`);
      lL.piv.at(tmp.set(lw.x+PX,lw.y+PY-.45,lw.z)).set("Pivot<small>back hand</small>");lL.dL.at(tmp.set(lw.x+PX+Lr/2,lw.y+PY+.8,lw.z)).set(`L = ${fmt(Lr,1)} m`);lL.dD.at(tmp.set(lw.x+PX+d/2-.15,lw.y+PY+.5,lw.z)).set(`d = ${fmt(d,2)} m`);
      lL.drag.at(tmp.set(lw.x+handP.x,lw.y+handP.y,lw.z+.12)).set("Drag your hand");
      // ---- float
      const ok=floats(),frac=Math.min(1,floatSub()/FLOAT_V),bob=st.k==="float"||st.k==="test"?Math.sin(s.bob)*.03:Math.sin(t*2.2)*.02;
      const fy=ok?FW-frac*FH+bob:Math.max(.95,FW-FH-(st.k==="float"?(s.t*.5)%(FW):FW));flt.position.set(FTX,fy,0);
      const sr=.035+Math.cbrt(Math.max(s.sink,.001))*.03,ly=Math.max(sr+.06,fy-.8);fline2.scale.y=Math.max(.01,fy-ly);fline2.position.set(FTX,ly+(fy-ly)/2,0);lead.scale.setScalar(s.sink?sr:.001);lead.position.set(FTX,ly,0);
      const gm=totalM(),up=ok?gm:(FLOAT_V+sinkV())*RHO_SEA,ks=.032;upA.set(V3(FTX+.36,fy+FH*.45,0),V3(0,1,0),up*ks);wA.set(V3(FTX-.36,fy+FH*.45,0),V3(0,-1,0),gm*ks);
      for(let i=0;i<40;i++){const b=bub[i];b.y+=b.v*dt;if(b.y>FW-.02)b.y=0;bubbles.put(i,b.x,b.y,b.z,b.r)}bubbles.done();
      cubes.forEach((m,i)=>{m.position.y=m.userData.base+(m.userData.r<1.025?Math.sin(t*1.8+i)*.012:0)});
      for(let i=0;i<2;i++){const u=t*.35+i*Math.PI;fishPut(21+i,ZF.x+FTX+Math.cos(u)*.7,TOP+.45+i*.35,ZF.z+Math.sin(u)*.35,.42,0,-u-Math.PI/2*(1)+Math.PI,Math.sin(t*4+i)*.05)}
      const fw=fz.position;fL.sub.hide();
      fL.up.show(live==="float").at(tmp.set(fw.x+FTX+.36,fw.y+fy+FH*.45+up*ks,fw.z)).set(`Upthrust<b>${fmt(up*G/1000,2)} N</b>`);fL.w.show(live==="float").at(tmp.set(fw.x+FTX-.36,fw.y+fy+FH*.45-gm*ks,fw.z)).set(`Weight<b>${fmt(gm*G/1000,2)} N</b>`);
      fL.rho.at(tmp.set(fw.x+FTX-.9,fw.y+FW,fw.z)).set(`Rig density<b>${fmt(avgRho(),3)} g/cm³</b><small>${ok?fmt(frac*100)+"% of the float under water":"denser than sea water (1.025): it sinks"}</small>`);
      cubes.forEach((m,i)=>fL.lad[i].at(tmp.set(fw.x+m.position.x,fw.y+m.position.y,fw.z+m.position.z)).set(`${LAD[i][0]}<small>${LAD[i][1]}</small>`));
      // ---- light: the ray from the fish bends at the surface to reach your eye; your brain traces it back in a straight line
      const RP=refractPath(),D=s.depth,Fp=V3(FX,LWY-D*LS,0),Pp=V3(FX+RP.px*LS,LWY,0),Ep=V3(FX-s.eye*LS,LWY+1.6*LS,0),Ap=V3(FX,LWY-RP.app*LS,0);
      eye.position.copy(Ep);{const dv=Pp.clone().sub(Ep).normalize();iris.position.copy(dv.multiplyScalar(.12))}
      const bk=D+"|"+s.eye;if(bk!==beamKey){beamKey=bk;if(beam){lzg.remove(beam);beam.geometry.dispose()}
        const pts=s.eye<.02?[Fp,Ep]:[Fp,Pp,Ep];const path=new THREE.CurvePath();for(let i=0;i<pts.length-1;i++)path.add(new THREE.LineCurve3(pts[i],pts[i+1]));beam=S.tube(path,.026,beamM,{seg:64,cast:false});lzg.add(beam)}
      fishPut(23,ZLi.x+FX+.05,TOP+Fp.y,ZLi.z,.9,0,Math.PI,0);gBody.position.set(ZLi.x+FX+.05,TOP+Ap.y,ZLi.z);gBody.rotation.y=Math.PI;gTail.position.copy(gBody.position);gTail.rotation.y=Math.PI;gBody.scale.setScalar(.9);gTail.scale.setScalar(.9);
      gBody.visible=gTail.visible=Math.abs(Ap.y-Fp.y)>.05;
      // dashes: your brain's straight line back from P to the ghost, and the normal at P
      let di=0;const dashLine=(A,B,n,c)=>{const dd=B.clone().sub(A);const len=dd.length(),u=dd.clone().normalize();q.setFromUnitVectors(V3(0,1,0),u);for(let k=0;k<n&&di<NDASH;k++){const f=(k+.5)/n;const pp=A.clone().addScaledVector(dd,f);dash.putS(di,pp.x,pp.y,pp.z,1,len/n*.55,1,q);dash.tint(di++,c)}};
      if(s.eye>=.02){dashLine(Pp,Ap,14,"#ffffff");dashLine(V3(Pp.x,LWY-.75,0),V3(Pp.x,LWY+.75,0),12,PAL.ink)}for(;di<NDASH;di++)dash.put(di,0,-50,0,.001);dash.done();
      const pts=s.eye<.02?[Fp,Ep]:[Fp,Pp,Ep],segL=[];let tot=0;for(let i=0;i<pts.length-1;i++){const l=pts[i].distanceTo(pts[i+1]);segL.push(l);tot+=l}
      for(let i=0;i<24;i++){let u=((t*.35+i/24)%1)*tot,k=0;while(k<segL.length-1&&u>segL[k]){u-=segL[k];k++}const pp=pts[k].clone().lerp(pts[k+1],Math.min(1,u/segL[k]));photons.put(i,pp.x,pp.y,pp.z,.8,90)}photons.done();
      const lp=lzg.position;liL.real.at(tmp.set(lp.x+FX+.5,lp.y+Fp.y,lp.z)).set(`Where it is<b>${fmt(D,2)} m deep</b>`);liL.app.at(tmp.set(lp.x+FX+.5,lp.y+Ap.y,lp.z)).set(`Where it looks<b>${fmt(RP.app,2)} m deep</b>`);
      liL.eye.at(tmp.set(lp.x+Ep.x,lp.y+Ep.y+.15,lp.z)).set(s.eye<.05?"Your eye<small>straight above · drag me</small>":`Your eye<small>${fmt(s.eye,1)} m sideways · drag me</small>`);
      liL.nor.show(live==="light"&&s.eye>=.02).at(tmp.set(lp.x+Pp.x,lp.y+LWY+.7,lp.z)).set("Normal");
      liL.ang.show(live==="light"&&s.eye>=.02).at(tmp.set(lp.x+Pp.x,lp.y+LWY,lp.z)).set(`Bends away from the normal<small>${fmt(RP.thw*180/Math.PI,0)}° in water → ${fmt(RP.tha*180/Math.PI,0)}° in air</small>`);
      // ---- stats: the sample on the boards (they flop down when you catch a new 20) and a 3D histogram of 5 cm groups
      if(s.catches!==lastCatch){lastCatch=s.catches;catchT=t}
      const Sx=stats(),fl=S.clamp((t-catchT)/1.2,0,1);
      s.sample.forEach((Lc,i)=>{const c=Math.floor(i/5),r=i%5,x0=BX0+c*(BWD+.12)+.09,keep=Lc>=MIN_SIZE,len=Lc*CM;const delay=S.clamp(fl*1.6-i*.03,0,1);const hop=(1-delay)*1.2+Math.abs(Math.sin(delay*Math.PI*2))*(1-delay)*.25;
        fishPut(i,ZS.x+x0+len/2,TOP+.09+hop,ZS.z+BZ0+.12+r*.38,len,-Math.PI/2,0,0,!keep)});
      const sk2=s.sample.join(",");if(sk2!==sKey){sKey=sk2;const cnt={};let bi=0;Sx.a.forEach(v=>{const b=Math.floor(v/5)*5;const n=cnt[b]=(cnt[b]||0);cnt[b]++;
          blocks.putS(bi,HX0+(b-HB0+2.5)/5*HBW,.05+.12+n*.25,-1.55,HBW*.82,.22,.36);blocks.tint(bi++,b>=MIN_SIZE?"#EE8D72":"#D8CDD1")});for(;bi<40;bi++)blocks.put(bi,0,-50,0,.001);blocks.done()}
      const hx=v=>HX0+(v-HB0)/5*HBW;meanBar.position.set(hx(Sx.mean),1.0,-1.32);medBar.position.set(hx(Sx.med),1.0,-1.32);
      const zp=sz.position;sL.mean.at(tmp.set(zp.x+hx(Sx.mean),zp.y+1.95,zp.z-1.32)).set(`Mean<b>${fmt(Sx.mean,1)} cm</b>`);sL.med.at(tmp.set(zp.x+hx(Sx.med),zp.y+1.95,zp.z-1.32)).set(`Median<b>${fmt(Sx.med,1)} cm</b>`);
      sL.keep.at(tmp.set(zp.x+BX0,zp.y+.1,zp.z+BZ0-.1)).set(`Catch ${s.catches}<small>${Sx.keep} of 20 at ${MIN_SIZE} cm or more</small>`);sL.chilly.at(tmp.set(zp.x+3.75,zp.y+.5,zp.z+1.55)).set("Tap: catch another 20");
      sL.min.at(tmp.set(zp.x+BX0+.09+30*CM,zp.y+.07,zp.z+BZ0+1.85)).set("30 cm");
      fBody.done();fTail.done();fFin.done();
    }};
}
StudyKit.mount({kupu:KUPU,scene3d:fish3d,
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
