(()=>{
// The īnanga machine (Years 7–10 science): an estuary-bank rig. A frosted cut-away of a tidal riverbank with grass, a moon dial whose
// two-lobed cam drives a tide gauge, īnanga that spawn on the top of a spring tide, eggs that develop in the damp grass and hatch when the
// next spring tide reaches them, larvae that drift out to a sea tank, and whitebait that come back past a culvert to a stream. A switch
// box changes the bank (stock, mowing, planting) and the culvert. One model drives the drawing, the 3D bench and the challenges.
// Facts: NIWA (Taonga Species Series: īnanga; īnanga life-cycle poster; Richardson & Taylor 2002, A guide to restoring inanga habitat),
// DOC (Find, protect and create īnanga spawning habitat; Improving habitat for whitebait), Waikato Regional Council (īnanga factsheet),
// Mountains to Sea Conservation Trust (Whitebait Connection: īnanga spawning), Ministry for the Environment (coastal fact sheet 4).
// Numbers that are the machine's own (tide heights, 13 nights, 1,000 eggs, survival shares, culvert passage, run index) are labelled.

// ---------------------------------------------------------------- the model
const LUNAR=29.53,HALF=LUNAR/2,LAG=1;          // spring tides peak about a day after new and full moon (NIWA: īnanga spawn 1 or 2 days after)
const HW0=1.55,HWA=0.30;                         // illustrative high-tide heights on the staff (m): spring 1.85, neap 1.25
const EDGE=1.35;                                 // where the grass starts on the bank (model)
const DEV=13;                                    // nights the model's eggs need out of the water (real eggs: 2–4 weeks, NIWA)
const LAST=59,EGGS=1000,RATE=1.6;                // two lunar months of nights; eggs in one model spawning; nights a second when playing
const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
const hw=n=>HW0+HWA*Math.cos(2*Math.PI*(n-LAG)/HALF);
const springness=n=>Math.cos(2*Math.PI*(n-LAG)/HALF);
const tideType=n=>{const c=springness(n);return c>0.8?"spring":c<-0.8?"neap":"between"};
const TIDE={spring:"Spring tide",neap:"Neap tide",between:"In between"};
const moonAge=n=>((n%LUNAR)+LUNAR)%LUNAR;
const PH=["New moon","Waxing crescent","First quarter","Waxing gibbous","Full moon","Waning gibbous","Last quarter","Waning crescent"];
const phaseName=n=>PH[Math.floor(moonAge(n)/LUNAR*8+0.5)%8];
// eggs are laid at the top of tonight's high tide; the first later tide that reaches them decides their fate:
// if they've had DEV nights to develop they hatch, if not they're washed out (the machine's rule)
function layEggs(n){const h=hw(n)-0.01;let end=n+LAST,kind="dry";
  for(let m=n+1;m<=n+LAST;m++){if(hw(m)>=h){end=m;kind=m-n>=DEV?"hatch":"wash";break}}
  return {n,h,end,kind,type:tideType(n),onGrass:h>=EDGE,count:null}}
const s={t:6,egg:null,fence:true,mow:false,plant:false,culvert:true,guess:0,guessSet:false,why:"",neapSeen:false,lastHatch:null,month:4};
s.egg=layEggs(1);
// the bank: illustrative shares of eggs that hatch (long grass keeps eggs damp; short grass lets them dry; hooves trample them)
const bank=()=>{const grazed=!s.fence,mown=!grazed&&s.mow,long=!grazed&&!mown;let v=long?0.85:0.3;if(s.plant&&s.fence)v+=0.07;if(grazed)v*=0.5;
  return {grazed,mown,long,surv:Math.round(v*100)/100}};
const passage=()=>s.culvert?1:0.2;               // illustrative share of whitebait that get past the culvert
const expected=()=>Math.round(EGGS*bank().surv);
const runIdx=c=>Math.round((c==null?expected():c)/850*passage()*100);  // 100% = the run holds steady (the machine's assumption)
function sync(){const e=s.egg;if(!e)return;
  if(s.t>=e.end){if(e.count==null){e.count=e.kind==="hatch"?expected():0;if(e.kind==="hatch")s.lastHatch=e.count;if(e.kind==="wash"&&e.type==="neap")s.neapSeen=true}}
  else e.count=null}
function eggStatus(){const e=s.egg;if(!e||s.t<e.n-1e-6)return "none";if(s.t<e.end)return s.t-e.n>=DEV?"ready":"developing";return e.kind==="hatch"?"hatched":"washed"}
const stageName=m=>{const k=((Math.floor(m*4)/4-1)%12)+1;return k>=4&&k<8?"Larvae feed and grow at sea":k>=8&&k<11.5?"Whitebait swim up the rivers":k>=11.5||k<2?"Adults grow in lowland streams":"Adults swim down to spawn"};
const monthName=m=>MONTHS[(Math.floor(m)-1)%12];
const nf=n=>Number(n).toLocaleString("en-NZ");
const live=()=>{try{return !matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){return true}};

// ---------------------------------------------------------------- the bank's shape (shared by the drawing and the 3D bench), x across the case, y up, in model metres
const PROF=[[-4.15,2.5],[-3.2,2.52],[-2.4,2.42],[-1.6,2.12],[-0.6,1.78],[0.4,1.4],[1.2,1.0],[1.9,0.62],[2.5,0.4],[3.0,0.35],[4.15,0.35]];
const PS=(()=>{const P=PROF,out=[];for(let i=0;i<P.length-1;i++){const p0=P[Math.max(0,i-1)],p1=P[i],p2=P[i+1],p3=P[Math.min(P.length-1,i+2)];
  for(let k=0;k<10;k++){const t=k/10,t2=t*t,t3=t2*t,f=(a,b,c,d)=>.5*(2*b+(-a+c)*t+(2*a-5*b+4*c-d)*t2+(-a+3*b-3*c+d)*t3);out.push([f(p0[0],p1[0],p2[0],p3[0]),f(p0[1],p1[1],p2[1],p3[1])])}}
  out.push(P[P.length-1]);return out})();
const yAt=x=>{if(x<=PS[0][0])return PS[0][1];for(let i=0;i<PS.length-1;i++){const a=PS[i],b=PS[i+1];if(x>=a[0]&&x<=b[0]){const u=(x-a[0])/((b[0]-a[0])||1);return a[1]+(b[1]-a[1])*u}}return PS[PS.length-1][1]};
const xAt=y=>{for(let i=PS.length-1;i>0;i--){const a=PS[i-1],b=PS[i];if(a[1]>=y&&b[1]<=y){const u=(a[1]-y)/((a[1]-b[1])||1);return a[0]+(b[0]-a[0])*u}}return PS[0][0]};
const FENCE_X=-2.75,CULV_X=3.4,XE=xAt(EDGE);

// ---------------------------------------------------------------- the drawing (fallback for no WebGL or ?lite): the same rig in the bench figure look
const F=StudyKit.fig,P=F.palette,TINT=P.case.mint,INK="#3E4A7C";
const BX=172,BY=42,BW=300,BH=250,SX=x=>BX+(x+4.2)/8.4*BW,SY=y=>BY+BH-y/3.4*BH;
const r1=v=>Math.round(v*10)/10;
function fishSVG(x,y,len,dir,col){const d=dir<0?-1:1;return `<g transform="translate(${r1(x)},${r1(y)}) scale(${d},1)"><path d="M${-len/2},0 C${-len/4},${-len*.16} ${len/3},${-len*.15} ${len/2},0 C${len/3},${len*.12} ${-len/4},${len*.12} ${-len/2},0Z" fill="${col||"#B9C4AE"}" stroke="#6E7A5E" stroke-width=".7"/><path d="M${-len/2},0 l${-len*.22},${-len*.13} v${len*.26}z" fill="${col||"#9DAA8C"}" stroke="#6E7A5E" stroke-width=".6"/></g>`}
function drawMain(x,st){sync();const k=st.k,lvl=k==="sea"?HW0:hw(s.t),b=bank(),e=s.egg,es=eggStatus(),n=Math.round(s.t);let o=F.floor(640,330);
  // ---- the console: a moon dial (Sun on the left) and a tide gauge that rises with the bank's water
  o+=F.box(10,284,150,8,{colour:P.case.lavender,kind:"plastic",d:12,r:3,shadowLen:18});
  const dx=78,dy=104,R=34,th=Math.PI+2*Math.PI*moonAge(k==="sea"?1:s.t)/LUNAR,mx=dx+R*Math.cos(th),my=dy-R*Math.sin(th);
  o+=`<circle cx="${dx}" cy="${dy}" r="46" fill="#fff" stroke="#8F9BAA" stroke-width="2"/><circle cx="${dx}" cy="${dy}" r="${R}" fill="none" stroke="#C9CDD8" stroke-dasharray="2 3"/>`;
  o+=`<circle cx="20" cy="${dy}" r="9" fill="${P.product.butter}" stroke="#C9A43A"/><text class="t-lab" x="20" y="${dy+22}" text-anchor="middle">SUN</text>`;
  const sp=springness(k==="sea"?1:s.t);o+=`<ellipse cx="${dx}" cy="${dy}" rx="${r1(11+3*sp)}" ry="9" transform="rotate(${r1(-th*180/Math.PI)} ${dx} ${dy})" fill="#9FD0F5" opacity=".7"/><circle cx="${dx}" cy="${dy}" r="7" fill="${P.product.blueberry}" stroke="${INK}" stroke-width=".8"/>`;
  o+=`<line x1="${dx}" y1="${dy}" x2="${r1(mx)}" y2="${r1(my)}" stroke="#8F9BAA" stroke-width="1.6"/><circle cx="${r1(mx)}" cy="${r1(my)}" r="7" fill="#3B4262"/><path d="M${r1(mx)},${r1(my-7)} A7,7 0 0 0 ${r1(mx)},${r1(my+7)}Z" fill="#FFF4D6"/>`;
  o+=`<text class="t-lab" x="${dx}" y="${dy-52}" text-anchor="middle">${phaseName(k==="sea"?1:s.t).toUpperCase()}</text>`;
  o+=F.tube(128,BY,24,BH,lvl/3.4,{tint:P.case.sky,fill:P.product.blueberry,shadow:false});
  [[1.85,"SPRING HW",P.product.strawberry],[1.25,"NEAP HW",P.product.blueberry]].forEach(([v,l,c])=>{o+=`<line x1="124" x2="156" y1="${r1(SY(v))}" y2="${r1(SY(v))}" stroke="${c}" stroke-width="2"/><text class="t-lab" x="120" y="${r1(SY(v)+3.5)}" text-anchor="end">${l}</text>`});
  // ---- the bank case: water first, the soil over it, then grass, eggs, fish and the props
  o+=F.acrylic(BX,BY,BW,BH,{tint:TINT,d:14,r:12});
  o+=`<rect x="${SX(-4.15)}" y="${r1(SY(lvl))}" width="${r1(SX(4.15)-SX(-4.15))}" height="${r1(SY(0)-SY(lvl)-2)}" fill="#8FC0EC" opacity=".55"/><line x1="${SX(-4.15)}" x2="${r1(SX(4.15))}" y1="${r1(SY(lvl))}" y2="${r1(SY(lvl))}" stroke="#5E95D2" stroke-width="1.4"/>`;
  const prof=PS.map(p=>`${r1(SX(p[0]))},${r1(SY(p[1]))}`).join(" ");
  o+=`<polygon points="${r1(SX(-4.15))},${r1(SY(0)-2)} ${prof} ${r1(SX(4.15))},${r1(SY(0)-2)}" fill="#E9D2B4" stroke="#B98F6C" stroke-width="1.2"/>`;
  o+=`<polyline points="${PS.filter(p=>p[0]<=XE).map(p=>`${r1(SX(p[0]))},${r1(SY(p[1]-.08))}`).join(" ")}" fill="none" stroke="#B98F6C" stroke-width="7" stroke-opacity=".55"/>`;
  // the tide staff in the channel
  o+=`<line x1="${SX(3.75)}" x2="${SX(3.75)}" y1="${SY(.35)}" y2="${SY(2.7)}" stroke="#8F9BAA" stroke-width="3"/>`;[[1.85,P.product.strawberry],[1.25,P.product.blueberry]].forEach(([v,c])=>o+=`<line x1="${SX(3.75)-5}" x2="${SX(3.75)+5}" y1="${r1(SY(v))}" y2="${r1(SY(v))}" stroke="${c}" stroke-width="3"/>`);
  // grass: long, mown or grazed short (the paddock behind the fence line is always grazed)
  let gs="";for(let i=0;i<120;i++){const gx=-4.1+((i*0.6180339)%1)*(XE+4.1),gy=yAt(gx),strip=gx>FENCE_X+.1,p=(i*0.7548776)%1;
    const h=!strip?.14:b.grazed?(p<.22?0:.12):b.mown?.1:.55+p*.35;if(h<=0)continue;const lean=(p-.5)*.25;
    gs+=`<line x1="${r1(SX(gx))}" y1="${r1(SY(gy))}" x2="${r1(SX(gx+lean))}" y2="${r1(SY(gy+h))}" stroke="${i%3?"#7DBA6A":"#9CCF84"}" stroke-width="1.6" stroke-linecap="round"/>`}
  o+=gs;
  // natives: flax fans on the strip
  if(s.plant){[[-2.3,.7],[-1.95,.6]].forEach(([px,sc])=>{const py=yAt(px);for(let j=0;j<7;j++){const a=(j/6-.5)*1.2;o+=`<line x1="${r1(SX(px))}" y1="${r1(SY(py))}" x2="${r1(SX(px+Math.sin(a)*sc*.5))}" y2="${r1(SY(py+Math.cos(a)*sc))}" stroke="${s.fence?"#6F8C52":"#A9B08A"}" stroke-width="2.4" stroke-linecap="round"/>`}})}
  // fence post, cow and mower
  if(s.fence){const fy=yAt(FENCE_X);o+=`<rect x="${r1(SX(FENCE_X)-3)}" y="${r1(SY(fy+.8))}" width="6" height="${r1(SY(fy)-SY(fy+.8))}" rx="2" fill="#C9A072" stroke="#8E6C48"/>`;[.3,.5,.7].forEach(h=>o+=`<line x1="${r1(SX(FENCE_X)-8)}" x2="${r1(SX(FENCE_X)+8)}" y1="${r1(SY(fy+h))}" y2="${r1(SY(fy+h))}" stroke="#8F9BAA"/>`)}
  {const cx=s.fence?-3.55:-1.55,cy=yAt(cx),X0=SX(cx),Y0=SY(cy);o+=`<g transform="translate(${r1(X0)},${r1(Y0)})"><rect x="-17" y="-24" width="34" height="14" rx="5" fill="#F3EEE6" stroke="#9A8F86"/><rect x="-9" y="-24" width="9" height="8" rx="2" fill="#4A4458"/>${[-13,-6,6,13].map(lx=>`<line x1="${lx}" x2="${lx}" y1="-10" y2="0" stroke="#9A8F86" stroke-width="2.4"/>`).join("")}<rect x="15" y="${s.fence?-30:-18}" width="10" height="9" rx="3" fill="#F3EEE6" stroke="#9A8F86"/></g>`}
  if(s.mow){const mxx=-2.2,my2=SY(yAt(mxx));o+=`<g transform="translate(${r1(SX(mxx))},${r1(my2)})"><rect x="-8" y="-8" width="16" height="6" rx="2" fill="${P.product.peach}" stroke="#B2552D"/><circle cx="-5" cy="-2" r="2.4" fill="${INK}"/><circle cx="5" cy="-2" r="2.4" fill="${INK}"/><line x1="-7" y1="-8" x2="-16" y2="-22" stroke="#8F9BAA" stroke-width="1.6"/></g>`}
  // eggs: a line of pearls at the top of the spawning tide
  if(e&&es!=="none"&&!(es==="hatched"||es==="washed")){const ex=xAt(e.h),ns=Math.round(22*b.surv);for(let i=0;i<22;i++){const gx=ex+((i*0.381966)%1-.5)*.6,gy=yAt(gx)+.04+(i%3)*.05;const lost=i>=ns&&s.t-e.n>2;
    o+=`<circle cx="${r1(SX(gx))}" cy="${r1(SY(gy))}" r="3" fill="${lost?"#CDBFA3":"#FFF8E6"}" stroke="${lost?"#A8987C":"#C9B98F"}" stroke-width=".7"/>`}}
  // adult īnanga in the channel (in the spawning step, up at the waterline)
  const nAd=k==="sea"?0:6;for(let i=0;i<nAd;i++){const up=k==="spawn"&&e&&Math.abs(s.t-e.n)<.5;const fx=up?xAt(lvl)+.25+(i%3)*.2:2.8+(i%3)*.45,fy=up?lvl-.12-(i>>1)%2*.1:.6+((i*.37)%1)*.6;o+=fishSVG(SX(fx),SY(Math.min(fy,lvl-.1)),16,i%2?1:-1)}
  // ---- the mouth pipe and the sea tank
  o+=`<rect x="${BX+BW}" y="${r1(SY(.55))}" width="${500-BX-BW}" height="12" fill="#DCEBFA" stroke="#9CB8D8"/>`;
  o+=F.acrylic(500,182,128,110,{tint:P.case.sky,d:12,r:10});o+=`<rect x="503" y="200" width="122" height="89" rx="6" fill="#8FC0EC" opacity=".5"/>`;
  if(k!=="sea"&&e&&es==="hatched"&&e.count>0){const nl=Math.max(3,Math.round(e.count/40));for(let i=0;i<nl;i++){const lx=510+((i*0.618)%1)*106,ly=212+((i*0.7548)%1)*70;o+=`<line x1="${r1(lx)}" y1="${r1(ly)}" x2="${r1(lx+5)}" y2="${r1(ly-1)}" stroke="#F4F8FA" stroke-width="1.6" stroke-linecap="round"/>`}}
  // ---- the upstream stream and the culvert
  o+=F.acrylic(512,46,116,64,{tint:TINT,d:10,r:8,balls:false});o+=`<rect x="515" y="76" width="110" height="31" rx="5" fill="#8FC0EC" opacity=".5"/>`;
  const outY=s.culvert?SY(1.3):SY(2.12);o+=`<line x1="${BX+BW-16}" y1="${r1(outY)}" x2="516" y2="96" stroke="#8F9BAA" stroke-width="11" stroke-linecap="round"/><line x1="${BX+BW-16}" y1="${r1(outY)}" x2="516" y2="96" stroke="#CBD3DD" stroke-width="7" stroke-dasharray="2 3"/>`;
  if(!s.culvert)o+=`<line x1="${BX+BW-16}" y1="${r1(outY+6)}" x2="${BX+BW-16}" y2="${r1(SY(lvl))}" stroke="#BFE0FA" stroke-width="4"/>`;
  // whitebait in the year view
  if(k==="sea"){const nw=Math.max(2,Math.round(18*expected()/920)),np=Math.round(nw*passage()),m=s.month;
    for(let i=0;i<nw;i++){let fx,fy;if(m<8){fx=512+((i*0.618)%1)*100;fy=215+((i*0.7548)%1)*62}else if(m<11.5){const u=Math.min(1,Math.max(0,(m-8-(i/nw)*1.6)/1.4));fx=600-u*(600-(BX+BW-30));fy=250-u*(250-(i<np?outY+16:SY(lvl)+14))}else{if(i<np){fx=522+((i*0.618)%1)*96;fy=84+((i*0.7548)%1)*18}else{fx=BX+BW-36+((i*0.618)%1)*16;fy=SY(lvl)+12+((i*0.3)%1)*12}}
      o+=fishSVG(fx,fy,m<8?7:m<11.5?9:12,-1,"#E3ECEA")}}
  // ---- labels
  o+=`<text class="t-lab" x="14" y="24">${k==="sea"?`${monthName(s.month).toUpperCase()} · ${stageName(s.month).toUpperCase()}`:`NIGHT ${n} · ${phaseName(n).toUpperCase()} · ${TIDE[tideType(n)].toUpperCase()} · HIGH TIDE ${lvl.toFixed(2)} m (MODEL)`}</text>`;
  if(e&&es!=="none"&&k!=="sea"){const ex=xAt(e.h);const lab=es==="hatched"?`hatched night ${e.end}`:es==="washed"?`washed out night ${e.end}`:`laid night ${e.n} · ${Math.floor(s.t-e.n)} nights old`;o+=F.pill(SX(ex)+26,SY(yAt(ex))-64,"Eggs",{sub:lab,ax:SX(ex),ay:SY(yAt(ex))-4,size:9})}
  if(k==="bank")o+=F.pill(BX+BW-6,BY+120,"Channel",{sub:"īnanga live here",ax:SX(3.2),ay:SY(.8),anchor:"end",size:9});
  if(k==="harm"||k==="restore"||k==="test")o+=F.pill(560,124,s.culvert?"Fixed culvert":"Perched culvert",{sub:`${Math.round(passage()*100)}% get past (model)`,anchor:"middle",size:9});
  if(k==="sea")o+=F.pill(564,124,"Upstream stream",{sub:`${Math.round(passage()*100)}% get past the culvert`,anchor:"middle",size:9});
  o+=`<text class="t-lab" x="564" y="318" text-anchor="middle">SEA TANK</text>`;
  return o}
// ---- the close-up: a tide chart, the year wheel, or the bank ledger
function chartSVG(){const W=420,H=260,e=s.egg;let o=F.floor(W,H);const x0=40,x1=W-14,y0=H-50,y1=40,XN=v=>x0+v/LAST*(x1-x0),YH=v=>y0-(v-1.1)/(1.95-1.1)*(y0-y1);
  o+=`<text class="t-lab" x="14" y="22">HIGHEST TIDE EACH NIGHT (MODEL)</text>`;
  for(let i=0;i<=LAST;i++){const ty=tideType(i);if(ty!=="between")o+=`<rect x="${r1(XN(i-.5))}" y="${y1}" width="${r1(XN(1)-XN(0))}" height="${y0-y1}" fill="${ty==="spring"?P.product.strawberry:P.product.blueberry}" opacity=".13"/>`}
  [1.25,1.55,1.85].forEach(v=>o+=`<text class="t-lab" x="${x0-4}" y="${r1(YH(v)+3)}" text-anchor="end">${v.toFixed(2)}</text><line x1="${x0}" x2="${x1}" y1="${r1(YH(v))}" y2="${r1(YH(v))}" stroke="#E4E0EE"/>`);
  o+=`<line x1="${x0}" x2="${x1}" y1="${r1(YH(EDGE))}" y2="${r1(YH(EDGE))}" stroke="#7DBA6A" stroke-dasharray="4 3"/><text class="t-lab" x="${x1}" y="${r1(YH(EDGE)+12)}" text-anchor="end">GRASS STARTS</text>`;
  let d="";for(let i=0;i<=LAST*4;i++){const v=i/4;d+=(i?"L":"M")+r1(XN(v))+","+r1(YH(hw(v)))}o+=`<path d="${d}" fill="none" stroke="${P.product.blueberry}" stroke-width="2"/>`;
  for(let i=0;i<=LAST;i++)o+=`<circle cx="${r1(XN(i))}" cy="${r1(YH(hw(i)))}" r="1.6" fill="${INK}"/>`;
  for(let a=0;a<=LAST+.01;a+=LUNAR/4){const q=Math.round(a/(LUNAR/4))%4,cx=r1(XN(a)),cy=y0+16;o+=q===0?`<circle cx="${cx}" cy="${cy}" r="5" fill="${INK}"/>`:q===2?`<circle cx="${cx}" cy="${cy}" r="5" fill="#fff" stroke="${INK}"/>`:`<circle cx="${cx}" cy="${cy}" r="5" fill="#fff" stroke="${INK}"/><path d="M${cx},${cy-5} A5,5 0 0 ${q===1?1:0} ${cx},${cy+5}Z" fill="${INK}"/>`}
  o+=`<text class="t-lab" x="${x0}" y="${H-12}">NIGHT 0</text><text class="t-lab" x="${x1}" y="${H-12}" text-anchor="end">NIGHT ${LAST}</text><text class="t-lab" x="${(x0+x1)/2}" y="${H-12}" text-anchor="middle">● NEW · ○ FULL · ◐ QUARTER</text>`;
  if(e&&s.t>=e.n){o+=`<line x1="${r1(XN(e.n))}" x2="${r1(XN(e.end))}" y1="${r1(YH(e.h))}" y2="${r1(YH(e.h))}" stroke="${P.product.strawberry}" stroke-width="2.4"/><circle cx="${r1(XN(e.n))}" cy="${r1(YH(e.h))}" r="4" fill="${P.product.strawberry}"/>`;
    o+=e.kind==="hatch"?`<circle cx="${r1(XN(e.end))}" cy="${r1(YH(e.h))}" r="5" fill="${P.product.lime}" stroke="${INK}"/>`:`<path d="M${r1(XN(e.end)-4)},${r1(YH(e.h)-4)} l8,8 m0,-8 l-8,8" stroke="${INK}" stroke-width="2"/>`;
    o+=`<text class="t-ink" x="${r1(Math.min(x1-120,XN(e.n)+6))}" y="${r1(YH(e.h)-8)}">egg line · ${e.kind==="hatch"?"hatch":"flooded"} night ${s.t>=e.end?e.end:"?"}</text>`}
  if(s.guessSet)o+=`<line x1="${r1(XN(s.guess))}" x2="${r1(XN(s.guess))}" y1="${y1}" y2="${y0}" stroke="${P.product.butter}" stroke-width="3"/><path d="M${r1(XN(s.guess))},${y1} h12 l-4,5 l4,5 h-12z" fill="${P.product.butter}" stroke="#B08A2A"/>`;
  o+=`<line x1="${r1(XN(s.t))}" x2="${r1(XN(s.t))}" y1="${y1-4}" y2="${y0}" stroke="${INK}" stroke-width="2"/>`;
  return o}
const YEAR=[[2,6,"strawberry","Spawning, Feb–May"],[3,10,"blueberry","At sea, about 6 months"],[8,12,"lime","Whitebait run, Aug–Nov"],[10,16,"peach","Adults grow in streams"]];
function yearSVG(){const W=420,H=260;let o=F.floor(W,H);const cx=118,cy=136,ang=m=>-Math.PI/2+(m-1)/12*2*Math.PI;
  o+=`<text class="t-lab" x="14" y="22">ONE YEAR IN THE LIFE OF ĪNANGA</text><circle cx="${cx}" cy="${cy}" r="102" fill="#fff" stroke="#DCD6EA"/>`;
  YEAR.forEach(([a,b,c],i)=>{const r=92-i*15,p=m=>[cx+r*Math.cos(ang(m)),cy+r*Math.sin(ang(m))],A=p(a),B=p(b),large=(b-a)>6?1:0;o+=`<path d="M${r1(A[0])},${r1(A[1])} A${r},${r} 0 ${large} 1 ${r1(B[0])},${r1(B[1])}" fill="none" stroke="${P.product[c]}" stroke-width="10" stroke-linecap="round"/>`});
  MONTHS.forEach((mn,i)=>{const a=ang(i+1.5);o+=`<text class="t-lab" x="${r1(cx+112*Math.cos(a))}" y="${r1(cy+112*Math.sin(a)+3.5)}" text-anchor="middle">${mn[0]}</text>`});
  const a=ang(s.month);o+=`<line x1="${cx}" y1="${cy}" x2="${r1(cx+100*Math.cos(a))}" y2="${r1(cy+100*Math.sin(a))}" stroke="${INK}" stroke-width="2.4"/><circle cx="${cx}" cy="${cy}" r="5" fill="${INK}"/>`;
  YEAR.forEach(([,,c,l],i)=>o+=`<rect x="240" y="${54+i*30}" width="14" height="10" rx="3" fill="${P.product[c]}"/><text class="t-body" x="260" y="${63+i*30}">${l}</text>`);
  o+=`<text class="t-ink" x="240" y="190">${monthName(s.month)}: ${stageName(s.month).toLowerCase()}</text><text class="t-body" x="240" y="212">Most adults live about a year.</text>`;return o}
function ledgerSVG(){const W=420,H=260,b=bank();let o=F.floor(W,H);const rows=[["Eggs laid on a spring tide",1,nf(EGGS),P.product.butter],["Eggs that hatch",b.surv,nf(expected()),P.product.lime],["Whitebait past the culvert",passage(),Math.round(passage()*100)+"%",P.product.blueberry],["Next autumn's run",Math.min(1.2,runIdx(null)/100)/1.2,runIdx(null)+"%",P.product.strawberry]];
  o+=`<text class="t-lab" x="14" y="22">WHAT THE BANK AND THE RIVER LET THROUGH (ILLUSTRATIVE)</text>`;
  rows.forEach(([l,f,v,c],i)=>{const y=48+i*46;o+=`<text class="t-ink" x="14" y="${y}">${l}</text><rect x="14" y="${y+6}" width="300" height="16" rx="5" fill="#fff" stroke="#DCD6EA"/><rect x="14" y="${y+6}" width="${r1(300*Math.max(0,Math.min(1,f)))}" height="16" rx="5" fill="${c}"/><text class="t-big" x="324" y="${y+19}">${v}</text>`});
  o+=`<line x1="${r1(14+300/1.2)}" x2="${r1(14+300/1.2)}" y1="${48+3*46+2}" y2="${48+3*46+26}" stroke="${INK}" stroke-dasharray="3 2"/><text class="t-body" x="14" y="234">${b.grazed?"Stock graze and trample the bank.":b.mown?"The bank is mown short, so eggs dry out.":"Long grass keeps the eggs damp and hidden."}</text><text class="t-body" x="14" y="252">${s.culvert?"Whitebait can swim up the fixed culvert.":"The perched culvert blocks most whitebait."}</text>`;return o}
function drawClose(x,st){sync();const k=st.k;if(k==="sea"||k==="bank")return yearSVG();if(k==="harm"||k==="restore")return ledgerSVG();return chartSVG()}

// ---------------------------------------------------------------- steps
const ALL=["play","night","spawn","guess","fence","mow","plant","culvert","why","reset"];
const steps=[
 {k:"bank",lab:"The estuary bank",cap:"Whitebait are the young of five native fish, and īnanga are one of them. Adults live in lowland streams, but to breed they need one thin strip of habitat: the grassy bank of an estuary, right where the biggest tides reach. This rig is a cut-away of that bank, with a moon dial, a tide gauge, a sea tank and a stream behind a culvert.",speed:0,controls:[],
  big:"<b>The big idea:</b> īnanga use fresh water and the sea in one life cycle. Each stage needs its own habitat, and the eggs need the smallest one: a strip of bank only as wide as the top of the tide.",
  exam:"Īnanga (Galaxias maculatus) live in lowland rivers and streams as adults. They lay their eggs in bankside vegetation in the estuary, at the upper edge of the spring tides, and their larvae grow at sea before coming back up the rivers as whitebait. A life cycle that uses both fresh water and the sea is called diadromous.",
  trap:"Thinking whitebait is one species. Whitebait are the young of five native galaxiid fish, and īnanga is one of them.",chips:["species","size","status"]},
 {k:"tides",lab:"Moon and tides",cap:"Turn the moon dial, or press Play. The gauge shows each night's highest tide. Around new and full moon the Sun, Earth and Moon line up, their pulls add, and high tides are biggest: spring tides. At first and last quarter they pull at right angles: neap tides.",speed:1,speedLabel:"1.6 nights a second",controls:["play","restart","night"],
  big:"<b>The big idea:</b> the Moon sets the tides. Spring tides come about every two weeks, a day or so after new and full moon, in every season.",
  exam:"Spring tides happen about every two weeks, around new and full moon, when the Earth, Sun and Moon are nearly in line, so the pulls of the Sun and Moon on the ocean add together and high tides reach higher. Neap tides happen near first and last quarter, when the Sun and Moon pull at right angles, so high tides are lower.",
  trap:"Thinking spring tides only happen in spring. They happen twice every lunar month, all year round.",chips:["night","moon","tide","hw"],onStep:()=>{s.egg=null;s.playing=live()}},
 {k:"spawn",lab:"Spawning",cap:"In late summer and autumn (mainly February to May), adults swim down to the estuary. On the top of a spring tide they swim into the flooded grass at the very edge of the water, lay their eggs, and leave as the tide drops. Set the dial to a spring tide and press Spawn.",speed:1,speedLabel:"1.6 nights a second",controls:["night","spawn","play"],
  big:"<b>The big idea:</b> the timing puts the eggs as high up the bank as the water ever goes, so ordinary tides leave them alone until the next spring tide.",
  exam:"Īnanga spawn on high spring tides, around new and full moon, mostly in late summer and autumn. They lay their eggs among dense grass and other vegetation at the upper edge of the tide, close to where the salt water reaches furthest up the river. When the tide falls, the eggs are left out of the water in the damp vegetation.",
  trap:"Saying īnanga lay their eggs in the water. The eggs are laid in vegetation on the bank, and they develop out of the water.",chips:["night","tide","eggs","line"],onStep:()=>{s.egg=null;s.t=1;s.playing=false}},
 {k:"eggs",lab:"Eggs in the grass",cap:"The eggs stay in the damp grass, out of the water, for two to four weeks. This machine's eggs need 13 nights. Press Play: they hatch when a spring tide reaches them after they're ready, and the larvae are washed out towards the sea.",speed:1,speedLabel:"1.6 nights a second",controls:["play","night","relay"],
  big:"<b>The big idea:</b> the tide is the trigger. Eggs laid on the top of one spring tide are reached again by the next spring tide, about two weeks later, when they're ready to hatch.",
  exam:"The eggs develop out of the water for about 2 to 4 weeks, kept damp and hidden by long grass. When the next spring tide floods the vegetation, the developed eggs hatch and the larvae are carried out to sea. So the Moon, through the spring-tide cycle, sets the night they hatch.",
  trap:"Thinking the eggs hatch after a set number of days, whatever happens. They hatch when a spring tide reaches them after they've developed.",chips:["night","age","next","hatch"],onStep:()=>{if(!s.egg||s.egg.kind!=="hatch"||s.t>=s.egg.end){s.egg=layEggs(1);s.t=1}s.playing=live()}},
 {k:"sea",lab:"Out to sea and back",cap:"The larvae grow at sea for about six months. In spring the young fish, now whitebait, swim back up the rivers to live in streams, if the culvert lets them. Most adults live about a year, and in autumn they head down to the estuary to spawn. Press Play to run the year.",speed:1,speedLabel:"about a month a second",controls:["play","month","culvert"],
  big:"<b>The big idea:</b> one life cycle, three habitats. The sea grows the larvae, the streams grow the adults and the estuary bank hatches the eggs. Break any link and the cycle fails.",
  exam:"After hatching, īnanga larvae are carried to the sea, where they feed and grow for about six months. They come back into fresh water in spring as juvenile whitebait, move upstream to adult habitat in lowland streams and mature. Most live for about one year, spawning the following autumn.",
  trap:"Thinking whitebait and adult īnanga are different fish. They're the same species at different life stages.",chips:["month","stage","life","pass"],onStep:()=>{s.month=4;s.playing=live()}},
 {k:"harm",lab:"Human impacts",cap:"Most spawning banks are on farms or in towns. Stock eat the grass and trample eggs. Mowing leaves eggs in short grass to dry out. Clearing drains, silt from floods, and culverts or floodgates that fish can't get through add more losses. Flip the switches to see what each one does.",speed:1,speedLabel:"1.6 nights a second",controls:["fence","mow","plant","culvert","play","night"],
  big:"<b>The big idea:</b> the spawning strip is tiny. DOC estimates there's now less than 100 hectares of it in the whole country, so damage to a thin strip of bank hits the whole population.",
  exam:"Grazing stock eat bankside vegetation and trample eggs, and mowing removes the long grass that keeps eggs damp, so more eggs dry out or are destroyed. Silt from floods can smother eggs, and clearing drains in the spawning season damages sites. Badly placed culverts, weirs and floodgates stop whitebait swimming upstream to adult habitat.",
  trap:"Blaming just one thing. Īnanga are harmed at several life-cycle stages. A strong answer links each human impact to the stage it harms.",chips:["grass","survive","pass","run"],onStep:()=>{Object.assign(s,{fence:false,mow:true,plant:false,culvert:false});s.egg=layEggs(1);s.t=7;s.playing=false}},
 {k:"restore",lab:"Restore the bank",cap:"Kaitiakitanga means guardianship. The whitebait run is an important mahinga kai (food-gathering resource) for Māori around Aotearoa, and caring for it starts at the bank. Fence out the stock, stop mowing, plant natives with thick roots and stems, and fix the culvert. Then lay eggs on a spring tide and play it through.",speed:1,speedLabel:"1.6 nights a second",controls:["fence","mow","plant","culvert","night","spawn","play"],
  big:"<b>The big idea:</b> restoration works on the stage that limits the cycle. One study found more spawning on banks fenced from stock for 18 months, where vegetation was 1.5 m tall, than on grazed banks under 0.3 m (Mitchell 1991, in NIWA's guide).",
  exam:"Fencing keeps stock from trampling eggs and grazing the bankside grass, leaving the grass long keeps eggs damp and hidden, and planting natives with thick roots and stems gives lasting cover. Fixing culverts lets whitebait reach adult habitat upstream. Each action protects a stage of the life cycle. Caring for the river this way is an example of kaitiakitanga, or guardianship.",
  trap:"Using kaitiakitanga as just a fancy word for helping nature. It's a Māori concept of guardianship that comes with responsibilities. Explain what it means, and learn from your teacher, or local hapū and iwi, how it's practised where you live.",chips:["grass","survive","pass","run"],onStep:()=>{s.egg=null;s.t=1;s.playing=false}},
 {k:"test",lab:"Test yourself",cap:"Four challenges. The bank starts grazed and mown, with a perched culvert. Use the controls, then press Check. The machine marks you with the same model it runs.",speed:1,speedLabel:"1.6 nights a second",controls:ALL,
  big:"<b>Exam tip:</b> link the chain. The Moon sets the spring tides, the spring tides set where the eggs are laid and when they hatch, and people decide whether the bank and the river let each stage survive.",
  chips:["night","tide","eggs","hatch","survive","run"],onStep:()=>{Object.assign(s,{fence:false,mow:true,plant:false,culvert:false,egg:null,t:0,guess:0,guessSet:false,why:"",neapSeen:false,lastHatch:null})}}
];
// ---- kupu Māori: each checked in Te Aka Māori Dictionary (ta = word id). RP 2009 = Te Reo Pūtaiao, the Ministry's Māori-medium science dictionary
const KUPU=[
 {mi:"īnanga",en:"inanga, whitebait (Galaxias maculatus)",ta:1724,note:"Te Aka's entry notes that adults migrate downstream on new or full moons to spawn when spring tides flood the plants at the water's edge."},
 {mi:"marama",en:"moon",ta:3673,chip:"moon",note:"Also means month."},
 {mi:"tai nunui",en:"spring tide",ta:40269,note:"From Te Reo Pūtaiao (2009)."},
 {mi:"tai ririki",en:"neap tide",ta:40270,note:"From Te Reo Pūtaiao (2009)."},
 {mi:"toene",en:"spawn, roe (of fish)",ta:40356,chip:"eggs",note:"From Te Reo Pūtaiao (2009)."},
 {mi:"paopao",en:"to hatch (of eggs)",ta:15278,chip:"hatch"},
 {mi:"ngutuawa",en:"river mouth, estuary",ta:4687},
 {mi:"mataora",en:"life cycle",ta:39882,chip:"stage",note:"Also means life, or alive."},
 {mi:"karohe",en:"inanga migrating upstream",ta:41749},
 {mi:"kaitiakitanga",en:"guardianship, stewardship",ta:2018}];
Object.entries({bank:["īnanga","ngutuawa","mataora"],tides:["marama","tai nunui","tai ririki"],spawn:["toene","tai nunui"],eggs:["paopao","toene"],sea:["ngutuawa","karohe","mataora"],harm:["īnanga","toene"],restore:["kaitiakitanga","īnanga"]}).forEach(([k,a])=>{const st=steps.find(x=>x.k===k);if(st)st.kupu=a});

// ---------------------------------------------------------------- challenges, marked from the model
const CH=[
 {q:"Lay eggs on the top of a spring tide, then set <b>Your hatch prediction</b> to the night they'll hatch.",
  check:()=>{sync();const e=s.egg;return !!(e&&e.kind==="hatch"&&s.guessSet&&s.guess===e.end)},
  ok:()=>`Yes: laid on night ${s.egg.n}, they're ready after ${DEV} nights, and the next spring tide climbs back up to them on night ${s.egg.end} (${phaseName(s.egg.end).toLowerCase()}).`,
  no:()=>{const e=s.egg;if(!e)return "Spawn first: set the moon dial to a spring tide (new or full moon) and press Spawn.";if(e.kind!=="hatch")return "These eggs won't hatch: an earlier tide floods them before they're ready. Spawn on the biggest tide of a spring series.";if(!s.guessSet)return "Move Your hatch prediction to a night, then check.";return `Not night ${s.guess}. On the tide chart, find the next night the tide climbs back up to the egg line, at least ${DEV} nights after laying.`}},
 {q:"Restore the bank so that at least 750 of the 1,000 eggs hatch. Spawn on a spring tide and play it through to hatching.",
  check:()=>{sync();return s.lastHatch!=null&&s.lastHatch>=750},
  ok:()=>`Yes: ${nf(s.lastHatch)} of ${nf(EGGS)} hatched. Long grass behind a fence keeps the eggs damp and away from hooves.`,
  no:()=>{const e=s.egg,b=bank();if(!e)return "Lay eggs on the top of a spring tide first.";if(e.kind!=="hatch")return "Those eggs get flooded before they're ready. Spawn on the top of a spring tide.";if(s.t<e.end)return "Press Play and let the eggs reach the next spring tide.";
   return `Only ${nf(s.lastHatch||0)} hatched. ${b.grazed?"Stock are still grazing and trampling the bank.":b.mown?"The bank is still mown short, so eggs dry out.":"The bank is restored now: lay a new batch and play it through."}`}},
 {q:"Spawn on a neap tide and play on until those eggs fail. Then choose <b>why</b> they failed.",
  check:()=>{sync();return s.neapSeen&&s.why==="flood"},
  ok:"Yes: a neap tide only reaches low on the bank, below the grass. The tides on the next nights climb higher and flood the eggs before they're ready, so in this machine they're washed out. That's why spawning is timed to the top of a spring tide.",
  no:()=>!s.neapSeen?"First set the dial to a neap tide (around first or last quarter), press Spawn, then Play until the eggs fail.":"Not that one. Watch the tide chart: what do the next nights' tides do to the egg line after a neap tide?"},
 {q:"Close the loop: make next autumn's run at least as big as this year's (100% or more).",
  check:()=>{sync();return s.lastHatch!=null&&runIdx(s.lastHatch)>=100},
  ok:()=>`Yes: ${nf(s.lastHatch)} eggs hatched and ${Math.round(passage()*100)}% of the returning whitebait get past the culvert, so the run is ${runIdx(s.lastHatch)}% of this year's.`,
  no:()=>s.lastHatch==null?"Get a batch of eggs to hatch first.":!s.culvert?`The run is only ${runIdx(s.lastHatch)}%: most whitebait can't get up the perched culvert. Fix it.`:`The run is ${runIdx(s.lastHatch)}%. More eggs need to hatch: restore the bank, then spawn and hatch a new batch.`}];

// ---------------------------------------------------------------- the 3D bench
function inanga3d(S){const {THREE,mat,PAL}=S;const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
  const TOP=.3,CX=-1.2,W=(x,y,z,out)=>(out||V3(0,0,0)).set(CX+x,TOP+y,z);
  const tmp=V3(0,0,0),tmp2=V3(0,0,0),q=new THREE.Quaternion(),eul=new THREE.Euler(),col=new THREE.Color();
  let seed=11;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
  const FONT="Instrument Sans, system-ui, sans-serif";
  const plinth=(x,z,w,d,tint)=>{const p=S.rbox(w,.3,d,.12,mat("plastic",tint,{rough:.55,coat:.2}));p.position.set(x,.15,z);S.scene.add(p);return p};
  plinth(-0.6,-0.95,11.2,7.3,PAL.case.mint);plinth(-8.5,0.1,4.6,3.8,PAL.case.lavender);plinth(7.3,0,4.3,3.8,PAL.case.sky);
  const white=mat("plastic","#ffffff",{rough:.4}),steel=mat("metal",PAL.steel,{rough:.25}),steelD=mat("metal",PAL.steelDark,{rough:.3}),ink=mat("plastic",PAL.ink,{rough:.45}),copper=mat("metal",PAL.copper,{rough:.3}),mintP=mat("plastic","#CFECDD",{rough:.4});
  const waterM=mat("liquid","#6FB0EE",{opacity:.38,depthWrite:false}),surfM=mat("liquid","#CFE6FA",{opacity:.3,depthWrite:false});

  // ================================================================ the bank case: soil, water, grass, the tide staff
  const bk=S.group();bk.position.set(CX,TOP,0);
  const cas=S.acrylicCase(8.4,3.4,2.8,PAL.case.mint,{opacity:.08});cas.position.set(CX,TOP,0);S.scene.add(cas);
  {const sh=new THREE.Shape();sh.moveTo(-4.15,0);PS.forEach(p=>sh.lineTo(p[0],p[1]));sh.lineTo(4.15,0);sh.closePath();
    const g=new THREE.ExtrudeGeometry(sh,{depth:2.7,bevelEnabled:false});g.translate(0,0,-1.35);bk.add(S.mesh(g,mat("plastic","#E9D2B4",{rough:.8,coat:.08})))}
  const band=(x0,x1,th,colour)=>{const pts=PS.filter(p=>p[0]>=x0&&p[0]<=x1);const sh=new THREE.Shape();sh.moveTo(pts[0][0],pts[0][1]+.006);pts.forEach(p=>sh.lineTo(p[0],p[1]+.006));for(let i=pts.length-1;i>=0;i--)sh.lineTo(pts[i][0],pts[i][1]-th);sh.closePath();
    const g=new THREE.ExtrudeGeometry(sh,{depth:2.72,bevelEnabled:false});g.translate(0,0,-1.36);bk.add(S.mesh(g,mat("plastic",colour,{rough:.85,coat:.05})))};
  band(-4.2,XE+.05,.2,"#B98F6C");band(XE-.05,3.05,.12,"#A99A8E");
  const water=S.box(8.26,1,2.62,waterM,{cast:false});water.renderOrder=1;bk.add(water);
  const surf=S.mesh(new THREE.PlaneGeometry(8.26,2.62),surfM,{rot:[-Math.PI/2,0,0],cast:false});surf.renderOrder=1;bk.add(surf);
  // the tide staff in the channel, with the spring and neap high-tide marks
  bk.add(S.cyl(.035,.035,2.4,steel,{at:[3.75,.35+1.2,-.95],seg:12}));
  for(let v=.5;v<=2.6;v+=.25)bk.add(S.box(.12,.012,.012,mat("flat",PAL.ink,{opacity:.55}),{at:[3.82,v,-.95],cast:false}));
  bk.add(S.torus(.06,.018,mat("plastic",PAL.product.strawberry,{rough:.3}),{at:[3.75,1.85,-.95],rot:[Math.PI/2,0,0]}));
  bk.add(S.torus(.06,.018,mat("plastic",PAL.product.blueberry,{rough:.3}),{at:[3.75,1.25,-.95],rot:[Math.PI/2,0,0]}));
  // high-tide lines on the back wall (hidden where the soil stands in front of them)
  bk.add(S.box(8.2,.02,.01,mat("flat",PAL.product.strawberry,{opacity:.8}),{at:[0,1.85,-1.32],cast:false}));
  bk.add(S.box(8.2,.02,.01,mat("flat",PAL.product.blueberry,{opacity:.8}),{at:[0,1.25,-1.32],cast:false}));
  // grass: 900 instanced blades from the paddock down to the grass edge
  const bladeG=new THREE.ConeGeometry(.024,1,3,1);bladeG.translate(0,.5,0);
  const NG=900,grass=S.swarm(NG,bladeG,mat("plastic","#ffffff",{rough:.65,coat:.1}),{colors:true});bk.add(grass);
  const GC=["#8FCB7A","#A6D98F","#7DBA6A","#B5DD93","#9CCF84"].map(c=>new THREE.Color(c)),DRY=new THREE.Color("#CFC28C");
  const blades=[];for(let i=0;i<NG;i++){const x=-4.1+rnd()*(XE+4.1),z=-1.3+rnd()*2.6;const edgeK=S.clamp((XE-x)/.45+.35,.35,1);
    blades.push({x,z,y:yAt(x)-.01,h:(.62+rnd()*.38)*edgeK,rx:(rnd()-.5)*.4,ry:rnd()*6.28,rz:(rnd()-.5)*.4,c:GC[i%5],p:rnd(),cur:-1,strip:x>FENCE_X+.08})}
  const gTarget=bl=>{const b=bank();if(!bl.strip)return .12+bl.p*.08;if(b.grazed)return bl.p<.22?.001:.1+bl.p*.08;if(b.mown)return .085+bl.p*.02;return bl.h};
  let grassKey="";
  // ================================================================ fence, stock, mower and native plants
  const fy=yAt(FENCE_X),fence=S.group(bk),posts=[];
  [-1.2,-.4,.4,1.2].forEach(z=>{const p=S.cyl(.045,.05,.8,mat("plastic","#C9A072",{rough:.7}),{at:[FENCE_X,fy+.4,z],seg:10});fence.add(p);posts.push(p)});
  const wires=[.3,.5,.7].map(h=>{const w=S.cyl(.008,.008,2.5,steel,{at:[FENCE_X,fy+h,0],rot:[Math.PI/2,0,0],seg:6});fence.add(w);return w});
  const cow=S.group(bk);let cowHead;
  {const cm=mat("plastic","#F3EEE6",{rough:.45}),pm=mat("plastic","#4A4458",{rough:.5}),sn=mat("plastic","#F2B8B0",{rough:.45});
    cow.add(S.rbox(.62,.3,.28,.1,cm,{at:[0,.42,0]}));cow.add(S.rbox(.22,.18,.29,.05,pm,{at:[-.1,.5,0]}));cow.add(S.rbox(.12,.12,.29,.04,pm,{at:[.18,.4,0]}));
    for(const [x,z] of [[-.22,-.09],[-.22,.09],[.22,-.09],[.22,.09]])cow.add(S.cyl(.035,.035,.3,cm,{at:[x,.15,z],seg:10}));
    cowHead=S.group(cow);cowHead.position.set(.32,.5,0);cowHead.add(S.rbox(.22,.16,.17,.05,cm,{at:[.08,0,0]}));cowHead.add(S.rbox(.08,.11,.15,.03,sn,{at:[.2,-.03,0]}));
    cowHead.add(S.cyl(.012,.022,.09,white,{at:[.02,.1,-.06],rot:[-.45,0,0],seg:6}));cowHead.add(S.cyl(.012,.022,.09,white,{at:[.02,.1,.06],rot:[.45,0,0],seg:6}));
    cow.add(S.cyl(.01,.012,.24,cm,{at:[-.34,.38,0],rot:[0,0,-.35],seg:6}))}
  const mower=S.group(bk);
  {mower.add(S.rbox(.36,.12,.3,.04,mat("plastic",PAL.product.peach,{rough:.35}),{at:[0,.11,0]}));for(const [x,z] of [[-.13,-.16],[-.13,.16],[.13,-.16],[.13,.16]])mower.add(S.cyl(.055,.055,.03,ink,{at:[x,.055,z],rot:[Math.PI/2,0,0],seg:14}));
    mower.add(S.tube([[-.15,.16,0],[-.36,.44,0],[-.44,.56,0]],.014,steel));mower.add(S.cyl(.014,.014,.26,ink,{at:[-.44,.56,0],rot:[Math.PI/2,0,0],seg:8}))}
  const plants=S.group(bk);
  {const flaxM=mat("plastic","#6F8C52",{rough:.55}),flax2=mat("plastic","#8B7A52",{rough:.55}),toeM=mat("plastic","#F1E6C8",{rough:.6}),trunkM=mat("plastic","#9C8468",{rough:.7}),tuftM=mat("plastic","#86A85E",{rough:.55});
    const leafG=new THREE.ConeGeometry(.05,1,4,1);leafG.translate(0,.5,0);leafG.scale(1,1,.35);
    const flax=(x,z,sc)=>{const g=S.group(plants);g.position.set(x,yAt(x)-.02,z);for(let i=0;i<9;i++){const m=S.mesh(leafG,i%3?flaxM:flax2);m.rotation.set(0,i*.7,(i/8-.5)*1.1);m.scale.set(1,sc*(.75+.35*Math.sin(i*2.1)**2),1);g.add(m)}};
    const toetoe=(x,z)=>{const g=S.group(plants);g.position.set(x,yAt(x)-.02,z);for(let i=0;i<8;i++){const m=S.mesh(leafG,tuftM);m.rotation.set(0,i*.8,(i/7-.5)*.9);m.scale.set(.5,.55,.5);g.add(m)}
      for(let i=0;i<3;i++){const a=i*2.1;g.add(S.cyl(.008,.008,.9,trunkM,{at:[Math.cos(a)*.05,.45,Math.sin(a)*.05],seg:5}));const pl=S.sphere(.06,toeM,{at:[Math.cos(a)*.06,.95,Math.sin(a)*.06]});pl.scale.set(.8,2.2,.8);g.add(pl)}};
    const cabbage=(x,z)=>{const g=S.group(plants);g.position.set(x,yAt(x)-.02,z);g.add(S.cyl(.04,.06,.95,trunkM,{at:[0,.47,0],seg:10}));const tuft=S.group(g);tuft.position.y=.95;
      for(let i=0;i<14;i++){const m=S.mesh(leafG,tuftM);m.rotation.set(0,i*1.3,.4+(i%3)*.35);m.scale.set(.35,.45,.35);tuft.add(m)}};
    flax(-2.3,-.75,.72);flax(-1.95,.55,.62);toetoe(-2.5,1.0);cabbage(-2.45,-1.12)}
  // ================================================================ eggs (100 pearls, each standing for ten eggs) with eyespots
  const eggsI=S.swarm(100,new THREE.SphereGeometry(.034,12,8),mat("plastic","#ffffff",{rough:.2,coat:1}),{colors:true});bk.add(eggsI);
  const eyesI=S.swarm(100,new THREE.SphereGeometry(.011,8,6),ink);bk.add(eyesI);
  const ej=[];for(let i=0;i<100;i++)ej.push({dx:(rnd()-.5)*.22,dy:.025+rnd()*.07,z:-1.22+(i+rnd())/100*2.44,r:rnd()});
  const order=[...Array(100).keys()].sort((a,b)=>ej[a].r-ej[b].r),rank=new Int16Array(100);order.forEach((i,k)=>rank[i]=k);
  const FRESH=new THREE.Color("#FFF9EC"),RIPE=new THREE.Color("#F1E6C2"),DRIED=new THREE.Color("#CDBFA3"),TROD=new THREE.Color("#B4A285");
  const eggPos=(i,e,out)=>{const x=xAt(e.h)+ej[i].dx;return W(x,yAt(x)+ej[i].dy,ej[i].z,out)};
  // ================================================================ fish: adult īnanga (no faces), larvae and whitebait
  const fishG=new THREE.SphereGeometry(1,20,12);{const p=fishG.attributes.position,cl=[],cB=new THREE.Color("#7F8E6B"),cM=new THREE.Color("#C6D0BE"),cW=new THREE.Color("#F4F6F1"),c=new THREE.Color();
    for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i);const tp=x<0?1-.5*(-x):1-.18*x;p.setY(i,y*tp);p.setZ(i,p.getZ(i)*tp);const k=(y+1)/2;if(k>.6)c.copy(cM).lerp(cB,(k-.6)/.4);else c.copy(cW).lerp(cM,k/.6);cl.push(c.r,c.g,c.b)}
    fishG.setAttribute("color",new THREE.Float32BufferAttribute(cl,3));fishG.scale(.2,.05,.042);fishG.computeVertexNormals()}
  const tailG=new THREE.ConeGeometry(.065,.11,4,1);tailG.rotateZ(Math.PI/2);tailG.scale(1,1,.15);tailG.translate(-.235,0,0);
  const NF=12,fb=S.swarm(NF,fishG,mat("plastic","#ffffff",{rough:.35,coat:.6,extra:{vertexColors:true}}),{cast:true}),ft=S.swarm(NF,tailG,mat("plastic","#9DAA8C",{rough:.45}),{cast:true});S.scene.add(fb,ft);
  const fh=[];for(let i=0;i<NF;i++)fh.push({x:2.72+rnd()*1.25,y:.5+rnd()*.5,z0:(rnd()-.5)*.6,ph:rnd()*6.28,sp:.22+rnd()*.2});
  const putFish=(sw1,sw2,i,p,dir,sc,wig)=>{eul.set(0,Math.atan2(-dir.z,dir.x)+wig,0);q.setFromEuler(eul);sw1.putS(i,p.x,p.y,p.z,sc,sc,sc,q);sw2.putS(i,p.x,p.y,p.z,sc,sc,sc,q)};
  const hideFish=(sw1,sw2,i)=>{sw1.put(i,0,-9,0,.001);sw2.put(i,0,-9,0,.001)};
  const larvaG=new THREE.CylinderGeometry(.007,.013,.11,5);larvaG.rotateZ(Math.PI/2);
  const NL=60,lv=S.swarm(NL,larvaG,mat("plastic","#EEF4F7",{rough:.3}));S.scene.add(lv);
  const SXc=7.3,lj=[];for(let i=0;i<NL;i++)lj.push({d:rnd()*1.3,sx:SXc+(rnd()-.5)*2.8,sy:.35+rnd()*1.0,sz:(rnd()-.5)*2.1,ph:rnd()*6.28,zc:(rnd()-.5)*1.6});
  const NW=40,wb=S.swarm(NW,fishG,mat("acrylic","#F2F7F5",{opacity:.8}),{cast:false}),wt=S.swarm(NW,tailG,mat("acrylic","#E3ECE8",{opacity:.8}),{cast:false});S.scene.add(wb,wt);
  const wj=[];for(let i=0;i<NW;i++)wj.push({sx:SXc+(rnd()-.5)*2.6,sy:.4+rnd()*.9,sz:(rnd()-.5)*2,ph:rnd()*6.28,tx:CX+CULV_X+(rnd()-.5)*2.4,tz:-3.45+(rnd()-.5)*.8,ty:2.38+rnd()*.25,mz:(rnd()-.5)*.8});
  // ================================================================ the mouth pipe and the sea tank
  const px0=CX+4.2,px1=SXc-1.7,PY=TOP+.5,PZ=.72,pl=px1-px0;
  const pipe=S.cyl(.17,.17,pl,mat("glass","#E6F2FC",{opacity:.16}),{at:[(px0+px1)/2,PY,PZ],rot:[0,0,Math.PI/2],open:true,cast:false,seg:28});pipe.renderOrder=6;S.scene.add(pipe);
  const pw=S.cyl(.13,.13,pl,mat("liquid",PAL.water,{opacity:.35,depthWrite:false}),{at:[(px0+px1)/2,PY,PZ],rot:[0,0,Math.PI/2],cast:false,seg:20});pw.renderOrder=5;S.scene.add(pw);
  for(const x of [px0+.08,px1-.08])S.scene.add(S.torus(.18,.03,steel,{at:[x,PY,PZ],rot:[0,Math.PI/2,0]}));
  const seaC=S.acrylicCase(3.4,1.7,2.6,PAL.case.sky,{opacity:.08});seaC.position.set(SXc,TOP,0);S.scene.add(seaC);
  const seaW=S.box(3.32,1.4,2.52,mat("liquid","#7FB2E8",{opacity:.32,depthWrite:false}),{cast:false});seaW.position.set(SXc,TOP+.7,0);seaW.renderOrder=1;S.scene.add(seaW);
  const seaS=S.mesh(new THREE.PlaneGeometry(3.32,2.52),surfM,{rot:[-Math.PI/2,0,0],cast:false});seaS.position.set(SXc,TOP+1.401,0);seaS.renderOrder=1;S.scene.add(seaS);
  S.scene.add(S.rbox(3.3,.08,2.5,.03,mat("matte","#EFE3C8"),{at:[SXc,TOP+.05,0]}));
  {const rg=new THREE.IcosahedronGeometry(1,1);const p=rg.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),k=1+.14*Math.sin(x*5+z*3);p.setXYZ(i,x*k,Math.max(-.2,y*k),z*k)}rg.computeVertexNormals();
    for(const [x,z,sc] of [[SXc+1.05,-.75,.26],[SXc+.7,-.95,.17]]){const r=S.mesh(rg,mat("plastic","#B7AAB8",{rough:.75,coat:.1}));r.scale.set(sc*1.3,sc,sc);r.position.set(x,TOP+.08,z);S.scene.add(r)}}
  // the year wheel on a post behind the sea tank
  const ywG=S.group();ywG.position.set(SXc+.2,TOP,-1.6);
  ywG.add(S.cyl(.05,.06,2.0,steelD,{at:[0,1.0,-.05]}));ywG.add(S.cyl(.92,.92,.06,white,{at:[0,2.75,-.05],rot:[Math.PI/2,0,0],seg:64}));
  const yw=S.panel(512,512,1.76);yw.position.set(0,2.75,0);ywG.add(yw);let ywKey="";
  // ================================================================ the upstream stream on a stand, and the culvert
  const STX=CX+CULV_X,STZ=-3.45,STY=2.2;
  for(const [x,z] of [[-1.35,-.5],[1.35,-.5],[-1.35,.5],[1.35,.5]])S.scene.add(S.cyl(.045,.045,STY,steelD,{at:[STX+x,TOP+STY/2,STZ+z],seg:10}));
  S.scene.add(S.rbox(3.0,.08,1.3,.03,steel,{at:[STX,TOP+STY-.04,STZ]}));
  const stC=S.acrylicCase(3.0,.75,1.2,PAL.case.mint,{opacity:.08});stC.position.set(STX,TOP+STY,STZ);S.scene.add(stC);
  const stW=S.box(2.92,.5,1.12,mat("liquid",PAL.water,{opacity:.34,depthWrite:false}),{cast:false});stW.position.set(STX,TOP+STY+.27,STZ);stW.renderOrder=1;S.scene.add(stW);
  S.scene.add(S.rbox(2.9,.05,1.1,.02,mat("matte","#D9CDB8"),{at:[STX,TOP+STY+.04,STZ]}));
  for(let i=0;i<9;i++)S.scene.add(S.sphere(.05+rnd()*.04,mat("plastic","#BDB3A5",{rough:.7}),{at:[STX+(rnd()-.5)*2.6,TOP+STY+.08,STZ+(rnd()-.5)*.9],seg:10}));
  const culv=S.group();S.scene.add(culv);const CL=1;
  {const cm=mat("metal","#B9C2CC",{rough:.4});culv.add(S.cyl(.17,.17,CL,cm,{at:[0,0,-CL/2],rot:[Math.PI/2,0,0],open:true,seg:24}));for(let i=0;i<=6;i++)culv.add(S.torus(.175,.022,cm,{at:[0,0,-i*CL/6],ts:28}))}
  const baffles=S.group(culv);for(let i=1;i<=3;i++)baffles.add(S.box(.2,.06,.03,mat("plastic",PAL.product.lime,{rough:.4}),{at:[0,-.12,-i*.24]}));
  const ramp=S.rbox(.34,.04,.7,.02,mat("plastic",PAL.product.lime,{rough:.45}));S.scene.add(ramp);
  const fall=S.box(.24,1,.02,mat("liquid","#DDEEFF",{opacity:.55,depthWrite:false}),{cast:false});fall.renderOrder=4;S.scene.add(fall);
  // ================================================================ the switch box (fence, mowing, planting, culvert)
  const swG=S.group();swG.position.set(4.05,TOP,2.1);swG.rotation.y=-.25;S.scene.add(swG);
  swG.add(S.rbox(1.9,.34,.86,.08,mintP,{at:[0,.17,0]}));swG.add(S.rbox(1.8,.03,.76,.02,white,{at:[0,.345,0]}));
  const SWK=["fence","mow","plant","culvert"],levers=[],leds=[];
  SWK.forEach((key,i)=>{const x=-.66+i*.44;const lg=S.group(swG);lg.position.set(x,.36,.05);lg.add(S.cyl(.02,.02,.32,steel,{at:[0,.16,0],seg:10}));lg.add(S.sphere(.06,mat("plastic",PAL.product.peach,{rough:.3}),{at:[0,.33,0]}));
    swG.add(S.cyl(.07,.07,.03,ink,{at:[x,.36,.05],seg:20}));const ledM=mat("glow",PAL.product.lime,1.2,{fresh:true});const led=S.sphere(.035,ledM,{at:[x,.37,-.25],cast:false});swG.add(led);levers.push(lg);leds.push(ledM);
    const hit=S.box(.36,.6,.7,mat("flat","#ffffff",{opacity:0,depthWrite:false}),{at:[x,.5,0],cast:false});hit.material.colorWrite=false;swG.add(hit);
    S.pick(hit,()=>{if(key==="mow")s.mow=!s.mow;else s[key]=!s[key]})});
  const swOn=k2=>k2==="mow"?!s.mow:!!s[k2];
  // ================================================================ the console: moon dial with a two-lobed cam, the tide gauge and the tide chart
  const con=S.group();con.position.set(-8.5,TOP,0);S.scene.add(con);
  const DX=-.2,DY=1.8,DZ=.35;
  con.add(S.cyl(.07,.09,DY,steelD,{at:[DX,DY/2,DZ-.2]}));con.add(S.rbox(.6,.1,.5,.04,white,{at:[DX,.05,DZ-.2]}));
  con.add(S.cyl(1.0,1.0,.07,white,{at:[DX,DY,DZ-.06],rot:[Math.PI/2,0,0],seg:72}));con.add(S.torus(1.0,.035,steel,{at:[DX,DY,DZ-.02],ts:96}));
  con.add(S.torus(.72,.006,mat("flat",PAL.ink,{opacity:.3}),{at:[DX,DY,DZ+.0],ts:96,cast:false}));
  [[Math.PI,PAL.ink],[0,"#FFFFFF"],[Math.PI/2,PAL.steelDark],[-Math.PI/2,PAL.steelDark]].forEach(([a,c])=>con.add(S.sphere(.045,mat("plastic",c,{rough:.3}),{at:[DX+.9*Math.cos(a),DY+.9*Math.sin(a),DZ],seg:12})));
  const sunL=S.sphere(.2,mat("glow",PAL.product.butter,1.4),{at:[DX-1.75,DY,DZ],cast:false});con.add(sunL);con.add(S.cyl(.03,.04,DY,steelD,{at:[DX-1.75,DY/2,DZ]}));
  for(let i=0;i<3;i++)con.add(S.box(.32,.012,.012,mat("flat",PAL.product.butter,{opacity:.7}),{at:[DX-1.4+i*.0,DY+(i-1)*.16,DZ],cast:false}));
  const earth=S.sphere(.16,mat("plastic",PAL.product.blueberry,{rough:.35}),{at:[DX,DY,DZ+.12]});con.add(earth);
  const shell=S.sphere(.19,mat("liquid","#9FD0F5",{opacity:.45,depthWrite:false}),{cast:false});shell.position.set(DX,DY,DZ+.12);shell.renderOrder=4;con.add(shell);
  const arm=S.group(con);arm.position.set(DX,DY,DZ+.12);arm.add(S.box(.72,.03,.03,steel,{at:[.36,0,-.02]}));
  const moonG=S.group(arm);moonG.position.set(.72,0,0);
  moonG.add(S.mesh(new THREE.SphereGeometry(.12,24,16,-Math.PI/2,Math.PI),mat("plastic","#FFF4D6",{rough:.4})));moonG.add(S.mesh(new THREE.SphereGeometry(.12,24,16,Math.PI/2,Math.PI),mat("plastic","#3B4262",{rough:.5})));
  // behind the dial: an elliptical cam on the same axle (two lobes, so two spring tides a lunar month) pushing a follower rod to the gauge
  const CA=.6,CB=.38;const cam=S.cyl(1,1,.08,mat("plastic",PAL.product.butter,{rough:.35}),{rot:[Math.PI/2,0,0],seg:48});cam.scale.set(CA,1,CB);const camG=S.group(con);camG.position.set(DX,DY,DZ-.32);camG.add(cam);
  con.add(S.cyl(.05,.05,.5,steel,{at:[DX,DY,DZ-.3],rot:[Math.PI/2,0,0],seg:12}));
  const rod=S.group(con);rod.position.set(DX,DY,DZ-.32);rod.add(S.cyl(.05,.05,.1,steelD,{at:[0,0,0],rot:[Math.PI/2,0,0],seg:16}));rod.add(S.cyl(.022,.022,.7,steel,{at:[.4,0,0],rot:[0,0,Math.PI/2],seg:10}));
  con.add(S.rbox(.16,.16,.16,.04,mintP,{at:[.55,DY,DZ-.32]}));
  const GX=1.25,GZ=.55;
  con.add(S.cyl(.075,.075,.3,steelD,{at:[.92,DY,DZ-.32],rot:[0,0,Math.PI/2],seg:16}));con.add(S.tube([[1.06,DY,DZ-.32],[1.2,DY,DZ-.32],[GX,DY-.3,GZ-.15]],.03,copper));
  con.add(S.rbox(.7,.16,.7,.05,white,{at:[GX,.08,GZ]}));
  const gTube=S.cyl(.22,.22,2.9,mat("glass","#E6F2FC",{opacity:.14}),{at:[GX,.16+1.45,GZ],open:true,cast:false});gTube.renderOrder=6;con.add(gTube);
  con.add(S.torus(.22,.02,steel,{at:[GX,3.06,GZ],rot:[Math.PI/2,0,0]}));
  const gLiq=S.cyl(.19,.19,1,mat("liquid",PAL.water,{opacity:.55,depthWrite:false}),{cast:false});gLiq.renderOrder=5;con.add(gLiq);
  const gFloat=S.sphere(.1,mat("plastic",PAL.product.butter,{rough:.3}));con.add(gFloat);
  for(let v=.25;v<=2.9;v+=.25)con.add(S.box(.1,.01,.01,mat("flat",PAL.ink,{opacity:.55}),{at:[GX,v,GZ+.225],cast:false}));
  con.add(S.torus(.235,.022,mat("plastic",PAL.product.strawberry,{rough:.3}),{at:[GX,1.85,GZ],rot:[Math.PI/2,0,0]}));con.add(S.torus(.235,.022,mat("plastic",PAL.product.blueberry,{rough:.3}),{at:[GX,1.25,GZ],rot:[Math.PI/2,0,0]}));
  con.add(S.tube([[GX+.22,.1,GZ],[2.4,.1,GZ],[3.05,.1,GZ]],.04,copper));con.add(S.torus(.05,.015,steel,{at:[3.05,.1,GZ],rot:[0,Math.PI/2,0]}));
  // the tide chart on a stand behind the console
  con.add(S.cyl(.035,.035,2.8,steelD,{at:[-1.3,1.4,-1.35]}));con.add(S.cyl(.035,.035,2.8,steelD,{at:[1.3,1.4,-1.35]}));
  con.add(S.rbox(3.14,1.62,.06,.05,white,{at:[0,3.55,-1.36]}));
  const chart=S.panel(720,360,3.0);chart.position.set(0,3.55,-1.32);con.add(chart);let chartKey="";
  // the dial can be turned by dragging the Moon
  const moonHit=S.sphere(.24,mat("flat","#ffffff",{opacity:0,depthWrite:false}),{cast:false});moonHit.material.colorWrite=false;moonG.add(moonHit);
  S.dragger(moonHit,{normal:V3(0,0,1),move:p=>{const c=con.localToWorld(V3(DX,DY,DZ));const a=Math.atan2(p.y-c.y,p.x-c.x);let age=((a-Math.PI)/(2*Math.PI)%1+1)%1*LUNAR;
    const st=S.api.state;const base=Math.floor(st.t/LUNAR)*LUNAR;let nn=Math.round(base+age);if(nn>LAST)nn-=Math.round(LUNAR);st.t=S.clamp(nn,0,LAST)}});
  // ================================================================ labels
  const L=o=>S.label(o);
  const lBank=L({off:[30,-56]}),lFish=L({off:[34,34]}),lSea=L({off:[0,-46]}),lDial=L({off:[-26,-70]}),lGauge=L({cls:"big",off:[38,-6]}),lStream=L({off:[34,-26]}),lZone=L({cls:"hot",off:[-46,-50]});
  const lSun=L({off:[-10,-40]}),lEarth=L({off:[22,30]}),lMoon=L({off:[26,-28]}),lSpring=L({off:[40,-18]}),lNeap=L({off:[40,16]}),lCam=L({off:[-30,40]});
  const lEggs=L({cls:"hot",off:[30,-50]}),lNext=L({off:[34,44]}),lTide=L({off:[38,-34]}),lChart=L({off:[0,-30]});
  const lCow=L({off:[-36,-44]}),lMow=L({off:[24,-50]}),lCulv=L({off:[36,-30]}),lSw=L({off:[30,34]}),lPlant=L({off:[-36,-46]}),lFence=L({off:[-40,-30]}),lRun=L({cls:"hot",off:[-30,-56]}),lYear=L({off:[0,-56]}),lWB=L({cls:"hot",off:[34,-34]});
  const allL=[lBank,lFish,lSea,lDial,lGauge,lStream,lZone,lSun,lEarth,lMoon,lSpring,lNeap,lCam,lEggs,lNext,lTide,lChart,lCow,lMow,lCulv,lSw,lPlant,lFence,lRun,lYear,lWB];
  const SHOW={bank:[lBank,lFish,lSea,lDial,lGauge,lStream,lZone],tides:[lSun,lEarth,lMoon,lGauge,lSpring,lNeap,lCam],spawn:[lTide,lEggs,lZone],eggs:[lEggs,lNext,lChart],
    sea:[lSea,lWB,lCulv,lStream,lYear],harm:[lCow,lMow,lCulv,lEggs,lSw],restore:[lFence,lPlant,lCulv,lEggs,lRun,lSw],test:[lGauge,lEggs,lCulv,lSw]};
  // ================================================================ views
  S.view("bank",[-0.8,6.3,14.8],[-0.7,1.4,-.8],{min:4,max:40});
  S.view("tides",[-6.4,4.0,8.6],[-7.4,2.0,-.2],{min:3,max:26});
  S.view("spawn",[.2,3.0,5.8],[-1.7,1.9,.1],{min:2,max:22});
  S.view("eggs",[-.3,2.75,4.4],[-1.9,1.95,.3],{min:1.6,max:20});
  S.view("sea",[5.4,5.8,10.6],[3.8,1.5,-1.3],{min:4,max:30});
  S.view("harm",[.9,5.6,10.4],[-.6,1.5,-.6],{min:4,max:30});
  S.view("restore",[-.2,5.0,10.0],[-.9,1.5,-.5],{min:4,max:30});
  S.view("all",[-.8,9.2,20.5],[-.6,1.4,-.7],{min:6,max:50});
  S.goView("bank",true);
  // ================================================================ the canvas screens
  function drawChart(g,w,h){const e=s.egg;g.fillStyle="#fff";g.fillRect(0,0,w,h);const x0=70,x1=w-22,y0=h-70,y1=62,XN=v=>x0+v/LAST*(x1-x0),YH=v=>y0-(v-1.1)/(1.95-1.1)*(y0-y1);
    g.fillStyle="#6E6A86";g.font=`600 22px ${FONT}`;g.textAlign="left";g.fillText("HIGHEST TIDE EACH NIGHT (MODEL)",22,38);
    for(let i=0;i<=LAST;i++){const ty=tideType(i);if(ty==="between")continue;g.fillStyle=ty==="spring"?"rgba(232,104,138,.16)":"rgba(111,163,232,.16)";g.fillRect(XN(i-.5),y1,XN(1)-XN(0),y0-y1)}
    g.font=`600 17px ${FONT}`;g.textAlign="right";g.strokeStyle="#E4E0EE";g.lineWidth=2;[1.25,1.55,1.85].forEach(v=>{g.beginPath();g.moveTo(x0,YH(v));g.lineTo(x1,YH(v));g.stroke();g.fillText(v.toFixed(2),x0-8,YH(v)+6)});
    g.setLineDash([8,6]);g.strokeStyle="#7DBA6A";g.beginPath();g.moveTo(x0,YH(EDGE));g.lineTo(x1,YH(EDGE));g.stroke();g.setLineDash([]);
    g.strokeStyle=PAL.product.blueberry;g.lineWidth=4;g.beginPath();for(let i=0;i<=LAST*4;i++){const v=i/4;i?g.lineTo(XN(v),YH(hw(v))):g.moveTo(XN(v),YH(hw(v)))}g.stroke();
    g.fillStyle="#3E4A7C";for(let i=0;i<=LAST;i++){g.beginPath();g.arc(XN(i),YH(hw(i)),3,0,7);g.fill()}
    for(let a=0;a<=LAST+.01;a+=LUNAR/4){const k=Math.round(a/(LUNAR/4))%4,cx=XN(a),cy=y0+30;g.lineWidth=2.5;g.strokeStyle="#3E4A7C";g.fillStyle=k===0?"#3E4A7C":"#fff";g.beginPath();g.arc(cx,cy,11,0,7);g.fill();g.stroke();
      if(k===1||k===3){g.fillStyle="#3E4A7C";g.beginPath();g.arc(cx,cy,11,-Math.PI/2,Math.PI/2,k===3);g.fill()}}
    if(e&&s.t>=e.n){g.strokeStyle=PAL.product.strawberry;g.lineWidth=5;g.beginPath();g.moveTo(XN(e.n),YH(e.h));g.lineTo(XN(e.end),YH(e.h));g.stroke();g.fillStyle=PAL.product.strawberry;g.beginPath();g.arc(XN(e.n),YH(e.h),8,0,7);g.fill();
      g.fillStyle=e.kind==="hatch"?PAL.product.lime:"#3E4A7C";g.beginPath();g.arc(XN(e.end),YH(e.h),9,0,7);g.fill()}
    if(s.guessSet){g.strokeStyle="#C9A43A";g.lineWidth=5;g.beginPath();g.moveTo(XN(s.guess),y1);g.lineTo(XN(s.guess),y0);g.stroke();g.fillStyle=PAL.product.butter;g.fillRect(XN(s.guess),y1,24,16)}
    g.strokeStyle="#222A55";g.lineWidth=4;g.beginPath();g.moveTo(XN(s.t),y1-8);g.lineTo(XN(s.t),y0);g.stroke();
    g.fillStyle="#6E6A86";g.font=`600 17px ${FONT}`;g.textAlign="left";g.fillText("NIGHT 0",x0,h-10);g.textAlign="right";g.fillText(`NIGHT ${LAST}`,x1,h-10)}
  function drawYear(g,w,h){g.clearRect(0,0,w,h);const cx=w/2,cy=h/2,ang=m=>-Math.PI/2+(m-1)/12*2*Math.PI;
    g.fillStyle="#fff";g.beginPath();g.arc(cx,cy,w/2-4,0,7);g.fill();g.lineCap="round";
    YEAR.forEach(([a,b,c],i)=>{g.strokeStyle=PAL.product[c];g.lineWidth=24;g.beginPath();g.arc(cx,cy,196-i*30,ang(a),ang(b));g.stroke()});
    g.fillStyle="#6E6A86";g.font=`600 24px ${FONT}`;g.textAlign="center";g.textBaseline="middle";MONTHS.forEach((mn,i)=>{const a=ang(i+1.5);g.fillText(mn[0],cx+232*Math.cos(a),cy+232*Math.sin(a))});
    const a=ang(s.month);g.strokeStyle="#222A55";g.lineWidth=7;g.beginPath();g.moveTo(cx,cy);g.lineTo(cx+214*Math.cos(a),cy+214*Math.sin(a));g.stroke();g.fillStyle="#222A55";g.beginPath();g.arc(cx,cy,12,0,7);g.fill();
    g.fillStyle="#222A55";g.font=`600 28px ${FONT}`;g.fillText(monthName(s.month),cx,cy+56);g.textBaseline="alphabetic"}
  // ================================================================ animation state (visual only; the model owns time)
  let eggRef=null,spawnT=99,hatchT=99,washT=99,lastSt="none",fenceK=s.fence?1:0,cowX=s.fence?-3.55:-1.55,mowK=s.mow?1:0,plantK=0,culvK=s.culvert?1:0;const levA=SWK.map(k2=>swOn(k2)?1:0);
  const path=(pts,u,out)=>{const n=pts.length-1,f=S.clamp(u,0,1)*n,i=Math.min(n-1,Math.floor(f));return out.copy(pts[i]).lerp(pts[i+1],f-i)};
  const lP=[V3(0,0,0),V3(0,0,0),W(4.1,.5,PZ),V3(px1+.05,PY,PZ),V3(0,0,0)];
  const dirV=V3(0,0,0),prevP=V3(0,0,0);
  return {
    step(st){const k=st.k;S.goView(k==="test"?"all":k);
      S.setShadowBox(k==="tides"?5.5:k==="spawn"||k==="eggs"?4:k==="sea"?8:k==="test"?13:9,k==="tides"?[-8,0,0]:k==="spawn"||k==="eggs"?[-1.6,0,0]:k==="sea"?[4,0,-1]:[-1,0,-.8]);
      allL.forEach(l=>l.hide());(SHOW[k]||[]).forEach(l=>l.show())},
    update(st0,st,dt,t){sync();const k=st.k,R=S.REDUCED?0:1,b=bank(),e=s.egg,es=eggStatus(),lvl=k==="sea"?HW0:hw(s.t),kk=x=>Math.min(1,dt*(R?x:60));
      // ---- water in the bank, the gauge and the dial
      water.scale.set(1,lvl,1);water.position.set(0,lvl/2,0);surf.position.set(0,lvl+.002,0);
      gLiq.scale.set(1,lvl,1);gLiq.position.set(GX,lvl/2,GZ);gFloat.position.set(GX,lvl+.06,GZ);
      const nn=k==="sea"?1:s.t,th=Math.PI+2*Math.PI*moonAge(nn)/LUNAR,sp=springness(nn);
      arm.rotation.z=th;moonG.rotation.z=-th;shell.rotation.z=th;shell.scale.set(1.22+.2*sp,1,1);camG.rotation.z=th;
      const ext=Math.sqrt((CA*Math.cos(th))**2+(CB*Math.sin(th))**2);rod.position.x=DX+ext+.05;
      // ---- grass (only re-posed while it changes)
      const gk=`${b.grazed}|${b.mown}`;let moving=gk!==grassKey;
      for(let i=0;i<NG;i++){const bl=blades[i],tg=gTarget(bl);if(bl.cur<0){bl.cur=tg;moving=true}else if(Math.abs(tg-bl.cur)>.002){bl.cur+=(tg-bl.cur)*kk(3);moving=true}}
      if(moving){grassKey=gk;for(let i=0;i<NG;i++){const bl=blades[i];eul.set(bl.rx,bl.ry,bl.rz);q.setFromEuler(eul);grass.putS(i,bl.x,bl.y,bl.z,1,Math.max(.001,bl.cur),1,q);
          col.copy(bl.c);if(!bl.strip)col.lerp(DRY,.3);else if(b.grazed)col.lerp(DRY,.4);else if(b.mown)col.lerp(DRY,.22);grass.tint(i,col)}grass.done()}
      // ---- fence, stock, mower, plants
      fenceK+=((s.fence?1:0)-fenceK)*kk(4);posts.forEach(p=>{p.scale.y=Math.max(.001,fenceK);p.position.y=fy+.4*fenceK});wires.forEach(w=>w.visible=fenceK>.92);
      const cTx=s.fence?-3.55:-1.55;cowX+=(cTx-cowX)*kk(2);const cy=yAt(cowX),sl=(yAt(cowX+.1)-yAt(cowX-.1))/.2;cow.position.set(cowX,cy-.01,.5);cow.rotation.set(0,0,Math.atan(sl));
      cowHead.rotation.z=s.fence?.1:-.55+Math.sin(t*1.3)*.08*R;
      mowK+=((s.mow?1:0)-mowK)*kk(4);mower.visible=mowK>.02;{const mx=-1.32,my=yAt(mx),ms=(yAt(mx+.1)-yAt(mx-.1))/.2;mower.position.set(mx,my,.92);mower.rotation.set(0,0,Math.atan(ms));mower.scale.setScalar(Math.max(.001,mowK))}
      plantK+=((s.plant?(s.fence?1:.35):0)-plantK)*kk(2.5);plants.visible=plantK>.02;plants.children.forEach(g=>g.scale.setScalar(Math.max(.001,plantK)));
      // ---- spawning and hatching events (visual timers)
      if(e!==eggRef){eggRef=e;spawnT=e&&Math.abs(s.t-e.n)<.01&&R?0:99;hatchT=99;washT=99}spawnT+=dt;
      if(es!==lastSt){if(es==="hatched"&&(lastSt==="developing"||lastSt==="ready"))hatchT=R?0:99;else if(es==="hatched")hatchT=99;if(es==="washed"&&(lastSt==="developing"||lastSt==="ready"))washT=R?0:99;else if(es==="washed")washT=99;lastSt=es}
      hatchT+=dt;washT+=dt;
      // ---- eggs
      const nSurv=Math.round(100*b.surv),showEggs=e&&es!=="none"&&!(es==="hatched"&&hatchT>.6)&&!(es==="washed"&&washT>2.4);
      for(let i=0;i<100;i++){if(!showEggs){eggsI.put(i,0,-9,0,.001);eyesI.put(i,0,-9,0,.001);continue}
        const appear=S.clamp((spawnT-1.1-i/100*1.3)*5,0,1);if(appear<=0){eggsI.put(i,0,-9,0,.001);eyesI.put(i,0,-9,0,.001);continue}
        eggPos(i,e,tmp);tmp.x-=CX;tmp.y-=TOP;const age=Math.max(0,Math.min(s.t,e.end)-e.n),lost=rank[i]>=nSurv&&e.kind==="hatch",lk=S.clamp(age/6,0,1);
        let sc=appear,sy=1;col.copy(FRESH).lerp(RIPE,S.clamp(age/DEV,0,1));
        if(lost){col.lerp(b.grazed?TROD:DRIED,lk);sc*=1-.3*lk;if(b.grazed)sy=1-.55*lk}
        if(es==="washed"){const u=S.clamp(washT/2.4,0,1);tmp.x+=u*1.6;tmp.y=Math.max(.38,yAt(tmp.x)+ej[i].dy-u*.2);sc*=1-u}
        if(es==="hatched")sc*=1-S.clamp(hatchT/.6,0,1);
        eggsI.putS(i,tmp.x,tmp.y,tmp.z,sc,sc*sy,sc);eggsI.tint(i,col);
        const eyes=!lost&&age>=DEV*.7&&es!=="washed";eyesI.put(i,tmp.x,tmp.y+.004,tmp.z+.026*sc,eyes?sc:.001)}
      eggsI.done();eyesI.done();
      // ---- adult īnanga: cruise up and down the channel; on a spawning, swim up into the flooded grass at the waterline
      const showAd=k!=="sea";for(let i=0;i<NF;i++){if(!showAd){hideFish(fb,ft,i);continue}const h=fh[i];const zz=h.z0+Math.sin(t*h.sp*R+h.ph)*1.0,vz=Math.cos(t*h.sp*R+h.ph);
        W(h.x,Math.min(h.y,lvl-.16),zz,tmp);dirV.set(0,0,vz>=0?1:-1);
        if(i<8&&e&&spawnT<3.6){const xw=xAt(lvl)+.14+(i%3)*.09;W(xw,lvl-.09-(i%2)*.05,-1.05+i*.3,tmp2);const u1=S.ease(S.clamp(spawnT/1.0,0,1)),u2=S.ease(S.clamp((spawnT-2.5)/1.0,0,1)),u=u1*(1-u2);
          prevP.copy(tmp);tmp.lerp(tmp2,u);if(u1<1)dirV.copy(tmp2).sub(prevP);else if(u2>0)dirV.copy(prevP).sub(tmp2);else dirV.set(-1,.2,0)}
        const wig=Math.sin(t*(spawnT<3.6&&i<8?14:5)+h.ph)*.18*R;putFish(fb,ft,i,tmp,dirV.setY(0).lengthSq()<1e-6?dirV.set(1,0,0):dirV,1.45,wig)}
      fb.done();ft.done();
      // ---- larvae: on hatching they drift down the slope, along the channel, through the pipe and into the sea tank
      const nL=e&&e.kind==="hatch"&&es==="hatched"&&k!=="sea"?Math.round(NL*b.surv):0;
      for(let i=0;i<NL;i++){if(i>=nL){lv.put(i,0,-9,0,.001);continue}const L2=lj[i],u=(hatchT-.3-L2.d)/4.2;
        if(u<1){const src=order[Math.floor(i/NL*nSurv)];eggPos(src,e,lP[0]);W(2.9,.55,L2.zc*.6,lP[1]);lP[4].set(L2.sx,TOP+L2.sy,L2.sz);path(lP,Math.max(0,u),tmp);if(u<0)tmp.copy(lP[0])}
        else tmp.set(L2.sx+Math.sin(t*.4*R+L2.ph)*.12,TOP+L2.sy+Math.sin(t*.7*R+L2.ph)*.05,L2.sz);
        lv.put(i,tmp.x,tmp.y,tmp.z,1,0,L2.ph,0)}lv.done();
      // ---- the culvert: perched (outlet high, a drop) or fixed (outlet low, baffles and a ramp)
      culvK+=((s.culvert?1:0)-culvK)*kk(3);const outY=2.12+(1.3-2.12)*culvK,O=W(CULV_X,outY,-1.42,V3(0,0,0)),I=V3(STX,TOP+STY+.2,STZ+.62);
      culv.position.copy(O);culv.lookAt(I);culv.rotateY(Math.PI);culv.scale.set(1,1,O.distanceTo(I)/CL);
      baffles.visible=culvK>.5;ramp.visible=culvK>.5;ramp.position.copy(W(CULV_X,(outY+Math.min(outY,lvl))/2-.18,-1.1));ramp.rotation.set(-.5,0,0);
      const drop=outY-.17-lvl;fall.visible=culvK<.5&&drop>.05;if(fall.visible){fall.scale.set(1,drop,1);fall.position.copy(W(CULV_X,lvl+drop/2,-1.33))}
      // ---- whitebait (the year step): grow at sea, run up through the pipe and channel to the culvert; those that get past live in the stream
      const showW=k==="sea",nW=showW?Math.max(3,Math.round(NW*Math.min(1,expected()/920))):0,nPass=Math.round(nW*passage()),m=s.month;
      for(let i=0;i<NW;i++){if(i>=nW){hideFish(wb,wt,i);continue}const w=wj[i];let sc=S.lerp(.35,.6,S.clamp((m-4)/4,0,1));
        const dep=8+(i/nW)*2.2,u=(m-dep)/.9;
        if(u<0){tmp.set(w.sx+Math.sin(t*.5*R+w.ph)*.25,TOP+w.sy,w.sz+Math.cos(t*.4*R+w.ph)*.2);dirV.set(Math.cos(t*.5*R+w.ph),0,-Math.sin(t*.4*R+w.ph))}
        else{const pts=[V3(w.sx,TOP+w.sy,w.sz),V3(px1+.05,PY,PZ),W(4.1,.5,PZ),W(3.2,Math.min(.9,lvl-.2),0),W(CULV_X,Math.min(outY-.3,lvl-.15),-1.15+w.mz*.1)];
          if(i<nPass){pts.push(O.clone(),I.clone(),V3(w.tx,TOP+w.ty,w.tz))}
          const uu=S.clamp(u/(i<nPass?1.4:1),0,1);prevP.copy(path(pts,uu,tmp2));path(pts,Math.min(1,uu+.01),dirV);dirV.sub(prevP);tmp.copy(prevP);
          if(uu>=1){if(i<nPass){sc=S.lerp(.6,1,S.clamp((m-11.5)/2.5,0,1));tmp.x+=Math.sin(t*.5*R+w.ph)*.15;tmp.z+=Math.cos(t*.4*R+w.ph)*.08;dirV.set(Math.cos(t*.5*R+w.ph),0,-.3)}
            else{tmp.y+=Math.abs(Math.sin(t*2.2*R+w.ph))*.35*R;tmp.z+=w.mz*.3;dirV.set(0,.4,-1)}}}
        putFish(wb,wt,i,tmp,dirV.setY(0).lengthSq()<1e-6?dirV.set(1,0,0):dirV,sc,Math.sin(t*6+w.ph)*.2*R)}
      wb.done();wt.done();
      // ---- the switch box
      SWK.forEach((key,i)=>{const on=swOn(key);levA[i]+=((on?1:0)-levA[i])*kk(8);levers[i].rotation.x=S.lerp(.5,-.5,levA[i]);leds[i].color.set(on?PAL.product.lime:PAL.product.strawberry);leds[i].emissive.set(on?PAL.product.lime:PAL.product.strawberry)});
      // ---- screens
      const ck=`${Math.round(s.t*4)}|${e?e.n+","+e.end+","+e.kind:""}|${s.guessSet?s.guess:"-"}`;if(ck!==chartKey){chartKey=ck;chart.redraw(drawChart)}
      const yk=Math.round(s.month*8)+"";if(yk!==ywKey){ywKey=yk;yw.redraw(drawYear)}
      // ---- labels
      const n=Math.round(s.t),tt=tideType(n),ew=e&&es!=="none"?eggPos(50,e,V3(0,0,0)):null;
      lBank.at(W(-2.6,2.9,0)).set("Estuary bank<small>a cut-away at the top of the tide</small>");
      lFish.at(W(3.3,.8,.6)).set("Adult īnanga<small>up to about 110 mm</small>");
      lSea.at(V3(SXc,TOP+1.8,0)).set(k==="sea"?`Sea tank<b>${monthName(m)}</b><small>${stageName(m).toLowerCase()}</small>`:"Sea tank<small>where the larvae grow</small>");
      lDial.at(con.localToWorld(V3(DX,DY+1.05,DZ))).set("Moon dial<small>drag the Moon to turn it</small>");
      lGauge.at(con.localToWorld(V3(GX,lvl+.1,GZ))).set(`Tonight's high tide<b>${lvl.toFixed(2)} m</b><small>${k==="sea"?"average":TIDE[tt].toLowerCase()} (model)</small>`).cls(tt==="spring"&&k!=="sea"?"big hot":"big");
      lStream.at(V3(STX,TOP+STY+.8,STZ)).set("Upstream stream<small>adult habitat</small>");
      lZone.at(W(xAt(1.85),1.95,1.1)).set("Spawning zone<small>the top edge of the spring tides</small>");
      lSun.at(con.localToWorld(V3(DX-1.75,DY+.2,DZ))).set("Sun");lEarth.at(con.localToWorld(V3(DX,DY-.15,DZ+.15))).set(`Earth<small>ocean bulge ${sp>.8?"biggest":sp<-.8?"smallest":"in between"}</small>`);
      lMoon.at(moonG.getWorldPosition(V3(0,0,0))).set(`Moon<b>${phaseName(nn)}</b>`);
      lSpring.at(con.localToWorld(V3(GX+.24,1.85,GZ))).set("Spring high tide");lNeap.at(con.localToWorld(V3(GX+.24,1.25,GZ))).set("Neap high tide");
      lCam.at(con.localToWorld(V3(DX+.4,DY-.3,DZ-.32))).set("Two-lobed cam<small>two spring tides a lunar month</small>");
      lTide.at(W(xAt(lvl)+.3,lvl,1.2)).set(`${TIDE[tt]}<small>the water reaches ${lvl.toFixed(2)} m</small>`).cls(tt==="spring"?"hot":"");
      if(ew){const ttl=es==="hatched"?`Hatched<b>night ${e.end}</b><small>${nf(e.count||0)} larvae head to sea</small>`:es==="washed"?`Washed out<b>night ${e.end}</b><small>flooded before they were ready</small>`:`Eggs<b>${Math.floor(Math.min(s.t,e.end)-e.n)} nights old</b><small>${k==="harm"||k==="restore"?`${nf(expected())} of ${nf(EGGS)} will hatch (model)`:e.onGrass?"damp, in the grass":"on bare mud, below the grass"}</small>`;lEggs.at(ew).set(ttl)}
      lEggs.show(!!ew&&(SHOW[k]||[]).includes(lEggs));
      lNext.at(W(3.75,hw(e?e.end:15),-.95)).set(e?`Next tide to reach them<b>night ${e.end}</b><small>${phaseName(e.end).toLowerCase()}</small>`:"");lNext.show(!!e&&k==="eggs");
      lChart.at(con.localToWorld(V3(0,4.4,-1.32))).set("Tide chart");
      lCow.at(cow.localToWorld(V3(0,.6,0))).set(b.grazed?"Stock on the bank<small>eat the grass, trample eggs</small>":"Stock in the paddock<small>fenced off the bank</small>");lCow.show(k==="harm");
      lMow.at(mower.localToWorld(V3(0,.3,0))).set("Mowing<small>short grass: eggs dry out</small>");lMow.show(k==="harm"&&s.mow);
      lCulv.at(O).set(s.culvert?`Fixed culvert<small>${Math.round(passage()*100)}% get through (model)</small>`:`Perched culvert<small>${Math.round(passage()*100)}% get through (model)</small>`).cls(s.culvert?"":"hot");
      lSw.at(swG.localToWorld(V3(0,.5,.4))).set("Switch box<small>fence · mowing · plants · culvert</small>");
      lPlant.at(W(-2.1,2.9,.5)).set(s.plant?(s.fence?"Native plants<small>thick roots and stems</small>":"Native plants<small>eaten by stock without a fence</small>"):"");lPlant.show(k==="restore"&&s.plant);
      lFence.at(W(FENCE_X,fy+.85,1.2)).set(s.fence?"Fence<small>stock kept off the bank</small>":"No fence");
      lRun.at(V3(SXc,TOP+1.75,.9)).set(`Next autumn's run<b>${runIdx(null)}%</b><small>of this year's (model)</small>`).cls(runIdx(null)>=100?"hot":"");
      lYear.at(V3(SXc+.2,TOP+3.7,-1.6)).set("The year");
      lWB.at(V3(SXc-.6,TOP+1.5,.6)).set(m<8?"Larvae at sea<small>growing for about six months</small>":`Whitebait run<b>${nPass} of ${nW} get past</b><small>the culvert (model)</small>`);
      if(k==="sea"){lWB.show(true)}
    }};
}

// ---------------------------------------------------------------- mount
const API=StudyKit.mount({kupu:KUPU,scene3d:inanga3d,
  eyebrow:"Science · Life cycles and ecosystems",title:"The īnanga machine",crumb:"Years 7–10 Science · life cycles, ecosystems, human impacts and restoration",homeHash:"y9",
  fig:"FIG. 32 · AN ESTUARY BANK AT THE TOP OF THE TIDE",railTitle:"From the top of the tide to the sea and back",
  badge:{label:"Years 7–10 Science"},
  mainBox:"0 0 640 330",mainPhoneBig:true,mainLabel:"A cut-away of an estuary bank with a moon dial, tide gauge, sea tank and culvert",closeBox:"0 0 420 260",
  state:s,steps,
  controls:[{type:"play"},
    {type:"button",id:"restart",label:"Back to night 0",onClick:()=>{s.t=0}},
    {type:"range",id:"night",label:"Moon dial",min:0,max:LAST,step:1,get:()=>Math.round(s.t),set:(x,v)=>{s.t=v},fmt:()=>`night ${Math.round(s.t)}`},
    {type:"button",id:"spawn",label:"Spawn on tonight's tide",onClick:()=>{s.t=Math.round(s.t);s.egg=layEggs(s.t)}},
    {type:"button",id:"relay",label:"Lay again on night 1",onClick:()=>{s.t=1;s.egg=layEggs(1)}},
    {type:"range",id:"guess",label:"Your hatch prediction",min:0,max:LAST,step:1,get:()=>s.guess,set:(x,v)=>{s.guess=v;s.guessSet=true},fmt:()=>s.guessSet?`night ${s.guess}`:"not set"},
    {type:"toggle",id:"fence",label:"Fence out stock",get:()=>s.fence,set:(x,v)=>{s.fence=v}},
    {type:"toggle",id:"mow",label:"Stop mowing",get:()=>!s.mow,set:(x,v)=>{s.mow=!v}},
    {type:"toggle",id:"plant",label:"Plant natives",get:()=>s.plant,set:(x,v)=>{s.plant=v}},
    {type:"toggle",id:"culvert",label:"Fix the culvert",get:()=>s.culvert,set:(x,v)=>{s.culvert=v}},
    {type:"select",id:"why",label:"Why did the neap-tide eggs fail?",options:[["","Choose an explanation"],["flood","Laid too low: flooded before they were ready"],["salt","Neap tides are too salty for eggs"],["dark","No moonlight, so fewer eggs were laid"],["cold","Neap tides only happen in winter"]],get:()=>s.why,set:(x,v)=>{s.why=v}},
    {type:"range",id:"month",label:"Month",min:4,max:16,step:0.25,get:()=>s.month,set:(x,v)=>{s.month=v},fmt:()=>monthName(s.month)},
    {type:"button",id:"reset",label:"Start again",onClick:(x,api)=>{const st=api.step;st.onStep&&st.onStep()}}],
  tick:(x,dt,st)=>{if(st.k==="sea"){s.month=Math.min(16,s.month+dt*0.9);if(s.month>=16)s.playing=false;return}
    const t0=s.t;let t1=t0+dt*RATE;if(st.k==="tides"&&t1>LAST)t1=0;s.t=Math.min(LAST,t1);const e=s.egg;
    if(e&&t0<e.end&&s.t>=e.end)StudyKit.sfx(e.kind==="hatch"?"ding":"whoosh");
    if(s.t>=LAST&&st.k!=="tides")s.playing=false;sync()},
  drawMain,drawClose,
  chips:()=>{sync();const n=Math.round(s.t),e=s.egg,b=bank(),es=eggStatus(),laid=e&&es!=="none",age=laid?Math.floor(Math.min(s.t,e.end)-e.n):0,tt=tideType(n);return{
    species:["SPECIES","Īnanga, Galaxias maculatus"],size:["ADULT SIZE","rarely over 110 mm"],status:["THREAT STATUS","At Risk – Declining"],
    night:["NIGHT",`${n} · ${phaseName(n).toLowerCase()}`],moon:["MOON",phaseName(n)],tide:["TONIGHT'S TIDE",TIDE[tt],tt==="spring"],hw:["HIGH TIDE (MODEL)",`${hw(s.t).toFixed(2)} m on the staff`],
    eggs:["EGGS",laid?`${nf(EGGS)} laid on night ${e.n}`:"none laid yet"],
    line:["EGG LINE",laid?(e.onGrass?`${e.h.toFixed(2)} m, in the grass`:`${e.h.toFixed(2)} m, bare mud below the grass`):"–"],
    age:["EGG AGE",laid?`${age} night${age===1?"":"s"}${age>=DEV&&es!=="washed"?", ready":""}`:"–"],
    next:["NEXT TIDE TO REACH THEM",laid?`night ${e.end}, ${phaseName(e.end).toLowerCase()}`:"–"],
    hatch:["HATCHING",{none:"no eggs yet",developing:"developing",ready:"ready, waiting for the tide",hatched:`${nf(e&&e.count||0)} hatched, night ${e?e.end:""}`,washed:`washed out, night ${e?e.end:""}`}[es],es==="hatched"],
    month:["MONTH",monthName(s.month)],stage:["LIFE-CYCLE STAGE",stageName(s.month)],life:["ADULT LIFE","most live about 1 year"],
    grass:["BANK GRASS",b.grazed?"grazed short and trampled":b.mown?"mown short":"long"+(s.plant?", with natives":"")],
    survive:["EGGS THAT HATCH (MODEL)",`${nf(expected())} of ${nf(EGGS)}`,true],
    pass:["PAST THE CULVERT (MODEL)",`${Math.round(passage()*100)}% of whitebait`],
    run:["NEXT AUTUMN'S RUN (MODEL)",`${runIdx(null)}% of this year's`,runIdx(null)>=100]}},
  challenges:CH,
  truth:"A simplified model for learning. From the sources: īnanga spawn in bankside vegetation at the upper edge of spring tides, mainly in late summer and autumn (DOC: January to June; Mountains to Sea Conservation Trust: mostly February to May), generally 1 or 2 days after new or full moon (NIWA); the eggs develop out of the water for 2–4 weeks and hatch on the next spring tide (NIWA; Waikato Regional Council); larvae grow at sea for about six months (NIWA; about 20 weeks, Waikato Regional Council) and return as whitebait in spring; most adults live about a year, some up to three (NIWA; Waikato Regional Council); adults rarely exceed 110 mm and are classed At Risk – Declining (NIWA); spawning habitat is estimated at under 100 ha nationally (DOC). Spring tides come about every two weeks, around new and full moon (Ministry for the Environment; NIWA). The machine's own, illustrative numbers: the tide heights on the staff, the 13 nights its eggs need, the rule that eggs flooded before they're ready are washed out, the 1,000 eggs, the share of eggs that hatch with each bank setting, the 20% of whitebait that get past a perched culvert, and the run index. The rig is not to scale.",
  footer:"Covers Years 7–10 science: life cycles, habitats and ecosystems, the Moon and tides, human impacts on biodiversity and restoration (the Year 9 and 10 ecosystems topics in the refreshed curriculum). Sources: <a href=\"https://www.doc.govt.nz/nature/native-animals/freshwater-fish/inanga/find-protect-and-create-inanga-spawning-habitat/\" target=\"_blank\" rel=\"noopener\">DOC: find, protect and create īnanga spawning habitat</a>; <a href=\"https://niwa.co.nz/taonga-species/taonga-species-series/inanga\" target=\"_blank\" rel=\"noopener\">NIWA: īnanga (Taonga Species Series)</a>; <a href=\"https://www.gdc.govt.nz/__data/assets/pdf_file/0011/9011/a-guide-to-restoring-inanga-habitat.pdf\" target=\"_blank\" rel=\"noopener\">NIWA: A guide to restoring inanga habitat</a>; <a href=\"https://mountainstosea.org.nz/post/inanga-spawning\" target=\"_blank\" rel=\"noopener\">Whitebait Connection: īnanga spawning</a>. Add ?lite to the address for the drawing instead of the 3D model."
});
window.__inanga={s,api:API};   // for checks: the live model state and the kit API
})();
