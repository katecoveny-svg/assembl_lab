
(()=>{
const D=Math.PI/180, SYN=29.530589, NEWREF=Date.UTC(2000,0,6,18,14);
const PLACES=[{n:"Cape Reinga",lat:-34.43,lon:172.68},{n:"Auckland",lat:-36.85,lon:174.76},{n:"Wellington",lat:-41.29,lon:174.78},{n:"Invercargill",lat:-46.41,lon:168.35},{n:"Equator",lat:0,lon:174.8}];
const START=Date.UTC(2026,9,22,11,0); // 23 Oct 2026, 00:00 NZDT

// ---------- model (one source for motion and numbers)
const yearFrac=t=>{const d=new Date(t);const s=Date.UTC(d.getUTCFullYear(),0,1);return (t-s)/864e5+1};
const decl=t=>23.44*Math.sin(2*Math.PI*(yearFrac(t)-80)/365.25);
const sunLon=t=>((360*(yearFrac(t)-80)/365.25)%360+360)%360; // 0 at March equinox
const moonAge=t=>(((t-NEWREF)/864e5)%SYN+SYN)%SYN;
const elong=t=>moonAge(t)/SYN*360; // 0 new, 180 full
const nodeLon=t=>332.5-19.35*((t-Date.UTC(2026,6,2))/(365.25*864e5));
const moonLat=t=>5.145*Math.sin((sunLon(t)+elong(t)-nodeLon(t))*D);
function dayLen(lat,dec){const c=(Math.sin(-0.833*D)-Math.sin(lat*D)*Math.sin(dec*D))/(Math.cos(lat*D)*Math.cos(dec*D));if(c<=-1)return 24;if(c>=1)return 0;return 2*Math.acos(c)/D/15}
const noonAlt=(lat,dec)=>90-Math.abs(lat-dec);
const hm=h=>{let H=Math.floor(h),M=Math.round((h-H)*60);if(M===60){H++;M=0}return `${H}h ${String(M).padStart(2,"0")}m`};
const solarHour=(t,lon)=>{const d=new Date(t);return ((d.getUTCHours()+d.getUTCMinutes()/60+lon/15)%24+24)%24};
function phaseName(a){if(a<1.85||a>27.68)return"New";if(a<6.38)return"Waxing crescent";if(a<8.38)return"First quarter";if(a<13.77)return"Waxing gibbous";if(a<15.77)return"Full";if(a<21.15)return"Waning gibbous";if(a<23.15)return"Last quarter";return"Waning crescent"}
const lit=a=>(1-Math.cos(a/SYN*2*Math.PI))/2;
const tidePull=e=>1+0.46*Math.cos(2*e*D);
function season(t){const m=+new Date(t).toLocaleString("en-NZ",{timeZone:"Pacific/Auckland",month:"numeric"});return m===12||m<=2?"Summer":m<=5?"Autumn":m<=8?"Winter":"Spring"}
function eclipse(t){const e=elong(t),b=Math.abs(moonLat(t));
  if((e<10||e>350)&&b<1.5)return"Solar eclipse";if(Math.abs(e-180)<10&&b<1.0)return"Lunar eclipse";
  if(e<10||e>350||Math.abs(e-180)<10)return"Missed (Moon "+(moonLat(t)>0?"above":"below")+")";return"No"}
const fmtDate=t=>new Date(t).toLocaleDateString("en-NZ",{timeZone:"Pacific/Auckland",day:"numeric",month:"short",year:"numeric"});
const fmtTime=t=>new Date(t).toLocaleTimeString("en-NZ",{timeZone:"Pacific/Auckland",hour:"numeric",minute:"2-digit"});

// ---------- steps
const STEPS=[
 {k:"spin",lab:"Spin it",speed:1/24*4,view:"globe",
  cap:"The Earth turns once every 24 hours. Watch the dot for your place ride into the sunlight (sunrise) and out of it (sunset).",
  big:"<b>The big idea:</b> the Sun does not go round us. The Earth spins 15° every hour, so each place takes turns facing the Sun.",
  exam:"Day and night happen because the Earth spins on its axis once every 24 hours. The half of the Earth facing the Sun has day. As Aotearoa turns into the Sun's light we get sunrise, and as it turns away we get sunset.",
  trap:"Saying “the Sun moves across the sky” as the cause. It only looks that way because the Earth is turning.",
  chips:["date","time","daynight","daylen","spin"]},
 {k:"tilt",lab:"Tilt it",speed:12,view:"globe",
  cap:"The axis leans 23.4° and keeps pointing the same way in space all year. Watch the axis on the orrery: it never swings round to follow the Sun.",
  big:"<b>The big idea:</b> one tilt that never changes direction is enough to make the Southern Hemisphere lean towards the Sun in December and away in June.",
  exam:"The Earth's axis is tilted at 23.4° and points in the same direction in space as the Earth orbits the Sun. This means the Southern Hemisphere is tilted towards the Sun for part of the year and away from it six months later.",
  trap:"Drawing the axis tilting back and forth during the year. The tilt stays fixed; it is the Earth's position around the Sun that changes.",
  chips:["date","overhead","season"]},
 {k:"season",lab:"Seasons",speed:12,view:"globe",
  cap:"Run the year. In December the south leans in: sunlight hits Aotearoa more directly and the day lasts longer. In June it leans away.",
  big:"<b>The big idea:</b> summer means direct sunlight plus long days, so more energy lands on each square metre for longer. Winter is the reverse.",
  exam:"In December the Southern Hemisphere is tilted towards the Sun, so sunlight hits New Zealand more directly and is concentrated on a smaller area, and the days are longer. More energy reaches each square metre for longer, so it is summer. In June we are tilted away, so the light is spread out and days are short, giving winter.",
  trap:"Blaming distance. The Earth is closest to the Sun in early January, which is summer for us but winter in the Northern Hemisphere, so distance cannot be the cause.",
  chips:["date","season","daylen","noon","overhead"]},
 {k:"lat",lab:"Compare places",speed:12,view:"globe",
  cap:"Change the place. Invercargill swings from about 8½ to almost 16 hours of daylight. At the equator it barely moves from 12.",
  big:"<b>The big idea (Excellence):</b> the effect varies with latitude. The further from the equator, the bigger the change in day length and Sun height through the year.",
  exam:"The further a place is from the equator, the more its day length changes through the year. On 21 December Invercargill gets about 15 h 49 min of daylight but Cape Reinga gets about 14 h 28 min, while at the equator day length stays close to 12 hours all year. This is because the tilt makes the circle of latitude cross more of the lit half of the Earth at higher latitudes.",
  trap:"Giving the pattern without numbers. Comparing two named places with real figures is what lifts an answer from Merit to Excellence.",
  chips:["date","place","daylen","noon","compare"]},
 {k:"phase",lab:"Moon phases",speed:2,view:"moon",
  cap:"Half the Moon is always lit by the Sun. As it goes round us we see more or less of that lit half. From Aotearoa a growing Moon is lit on the left.",
  big:"<b>The big idea:</b> phases are about viewing angle, not shadow. The Moon orbits in 27.3 days, but phases repeat every 29.5 days because the Earth has moved on too.",
  exam:"Half of the Moon is always lit by the Sun. As the Moon orbits the Earth we see different amounts of its lit half, which gives the phases. A full cycle of phases takes 29.5 days, a bit longer than the 27.3-day orbit, because the Earth has also moved along its orbit around the Sun.",
  trap:"Saying the phases are the Earth's shadow on the Moon. Earth's shadow only reaches the Moon during a lunar eclipse.",
  chips:["date","phase","litpct","age"]},
 {k:"tide",lab:"Tides",speed:2,view:"tide",
  cap:"The Moon's pull makes two bulges of ocean. When the Sun lines up with the Moon (new or full) the bulges grow: spring tides. At right angles they shrink: neap tides.",
  big:"<b>The big idea:</b> the Sun's tidal pull is about 46% of the Moon's. Lined up they add, at right angles they partly cancel.",
  exam:"The Moon's gravity pulls the ocean into two bulges, one facing the Moon and one on the opposite side. As the Earth spins through both, each place gets two high tides about every 24 h 50 min, so high tide is about 50 minutes later each day. At new and full Moon the Sun and Moon line up and their pulls add, giving spring tides with the biggest range. At first and last quarter they pull at right angles, giving neap tides with the smallest range.",
  trap:"Thinking spring tides only happen in spring. They happen twice every month, at new and full Moon.",
  chips:["date","phase","tide","tidetype"]},
 {k:"eclipse",lab:"Eclipses",speed:6,view:"eclipse",
  cap:"The Moon's orbit is tilted about 5°. Most months the new or full Moon sails above or below the Sun–Earth line. Run it until they line up.",
  big:"<b>The big idea:</b> an eclipse needs a new or full Moon that also sits where the two orbits cross. That only lines up in two short eclipse seasons a year.",
  exam:"The Moon's orbit is tilted about 5° to the Earth's orbit, so most months the new or full Moon passes above or below the line between the Sun and the Earth. An eclipse only happens when a new or full Moon occurs near the points where the two orbits cross. A solar eclipse needs a new Moon, when the Moon's shadow falls on the Earth. A lunar eclipse needs a full Moon, when the Moon moves into the Earth's shadow.",
  trap:"Asking why there isn't an eclipse every month and leaving out the 5° tilt of the Moon's orbit. That tilt is the whole answer.",
  chips:["date","phase","mlat","eclipse"]},
 {k:"test",lab:"Test yourself",speed:0,view:"globe",
  cap:"Use the date slider and the place menu to set up each one, then press Check. The machine marks you using the same model that moves it.",
  big:"<b>Exam tip:</b> for Merit, explain why with a linking word (because, so, which means). For Excellence, compare how the effect changes with place or time, using numbers.",
  exam:"", trap:"",
  chips:["date","place","daylen","phase","tidetype","eclipse"]}
];

// ---------- drawing helpers
const R=(cx,cy,r,a)=>[cx+r*Math.cos(a*D),cy-r*Math.sin(a*D)];
// bench figure look (StudyKit.fig): paper floor, painted spheres with a lit side, a sky-tint acrylic orrery plate, label pills
const F=StudyKit.fig,PAL=F.palette,TINT=PAL.case.sky,TD=F.deep(TINT),SUNC=PAL.product.butter,EARTHC=PAL.product.blueberry,MOONC="#E4E2DA",NIGHT="#1B2452";
// a painted sphere: radial shading lit from the direction lit (screen degrees, y up); self:true for the Sun, which lights itself
function sphere(id,cx,cy,r,col,o){o=o||{};const m=F.mat("painted",col),a=(o.lit!=null?o.lit:135)*D,fx=50+28*Math.cos(a),fy=50-28*Math.sin(a);
  const g=o.self?`<radialGradient id="${id}" cx="50%" cy="50%" r="55%"><stop offset="0" stop-color="#FFF6D2"/><stop offset=".55" stop-color="${col}"/><stop offset="1" stop-color="${m.shade}"/></radialGradient>`
    :`<radialGradient id="${id}" cx="${fx}%" cy="${fy}%" r="78%"><stop offset="0" stop-color="${m.hi}"/><stop offset=".5" stop-color="${col}"/><stop offset="1" stop-color="${m.shade}"/></radialGradient>`;
  return `<defs>${g}</defs><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${id})" stroke="${m.stroke}" stroke-width="${o.sw||1.1}"/>`}
const spec=(cx,cy,r,lit)=>{const a=(lit!=null?lit:135)*D;return `<ellipse cx="${cx+r*.45*Math.cos(a)}" cy="${cy-r*.45*Math.sin(a)}" rx="${r*.22}" ry="${r*.14}" transform="rotate(${-lit+90} ${cx+r*.45*Math.cos(a)} ${cy-r*.45*Math.sin(a)})" fill="#fff" opacity=".55"/>`};
// one soft navy shadow on the floor, falling to the lower right of a sphere
const floorShadow=(cx,cy,r,op)=>`<ellipse cx="${cx+r*.55}" cy="${cy+r*.82}" rx="${r*1.15}" ry="${r*.36}" transform="rotate(10 ${cx+r*.55} ${cy+r*.82})" fill="${PAL.shadow}" opacity="${op||.16}"/>`;
function moonDisc(cx,cy,r,age,south=true,cls=""){
  // lit fraction by terminator ellipse; waxing lit on left in the south
  const f=lit(age), wax=age<SYN/2, k=1-2*f, rx=Math.abs(k)*r;
  let side=(wax?-1:1)*(south?1:-1); // -1 lit on left
  const sweepOuter=side<0?0:1;
  const top=`${cx},${cy-r}`, bot=`${cx},${cy+r}`;
  const outer=`M${top} A${r},${r} 0 0,${sweepOuter} ${bot}`;
  const inner=`A${rx},${r} 0 0,${(k>0)?(sweepOuter?0:1):sweepOuter} ${top}`;
  const id="skyMd"+Math.round(cx);
  return `<g class="${cls}">${floorShadow(cx,cy,r,.13)}<defs><radialGradient id="${id}" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#FBF9F2"/><stop offset=".7" stop-color="${MOONC}"/><stop offset="1" stop-color="#BDBAB0"/></radialGradient></defs><circle cx="${cx}" cy="${cy}" r="${r}" fill="#666D8E" stroke="#3A3F5C" stroke-width="1"/>
    <path d="${outer} ${inner}Z" fill="url(#${id})"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#3A3F5C" stroke-width="1.2"/></g>`;
}

function drawOrrery(){
  const W=640,H=330,cx=320,cy=168,OR=228,K=.38,big=innerWidth<600,ER=big?25:17,MRr=big?11:7;
  const ls=sunLon(t), earthA=ls+180+90; // screen angle; Dec solstice -> left
  const [ex,ey]=[cx+OR*Math.cos(earthA*D),cy-OR*K*Math.sin(earthA*D)];
  const sunDir=Math.atan2(-(cy-ey),cx-ex)/D; // screen angle from Earth to Sun (y up)
  const e=elong(t), s=CUR;
  const mA=sunDir+e, MR=big?64:48;
  const mx=ex+MR*Math.cos(mA*D), my=ey-MR*.55*Math.sin(mA*D)-moonLat(t)*(s.k==="eclipse"?2.2:0);
  let o=F.floor(W,H);
  // the orrery plate: a frosted sky-tint acrylic disc on the paper floor, the orbit drawn on it as a clean diagram
  const PR=OR+40,PRy=OR*K+26,TH=10;
  o+=`<ellipse cx="${cx+38}" cy="${cy+30}" rx="${PR}" ry="${PRy}" fill="${PAL.shadow}" opacity=".1"/>`;
  o+=`<path d="M${cx-PR},${cy} A${PR},${PRy} 0 0,0 ${cx+PR},${cy} v${TH} A${PR},${PRy} 0 0,1 ${cx-PR},${cy+TH}Z" fill="${TD}" fill-opacity=".38" stroke="${TD}" stroke-width="1.1"/>`;
  o+=`<ellipse cx="${cx}" cy="${cy}" rx="${PR}" ry="${PRy}" fill="#DCEBF8" fill-opacity=".92" stroke="${TD}" stroke-width="1.3"/><ellipse cx="${cx}" cy="${cy}" rx="${PR-12}" ry="${PRy-6}" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1.2"/>`;
  o+=`<path d="M${cx-PR*.86},${cy-PRy*.5} A${PR},${PRy} 0 0,1 ${cx-PR*.3},${cy-PRy*.95}" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="2.4" stroke-linecap="round"/>`;
  // month ticks on orbit
  const months=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  o+=`<ellipse cx="${cx}" cy="${cy}" rx="${OR}" ry="${OR*K}" fill="none" stroke="#5E7FA6" stroke-width="1.1" stroke-dasharray="2 4"/>`;
  months.forEach((m,i)=>{const lsm=360*((new Date(Date.UTC(2026,i,15))-Date.UTC(2026,0,1))/864e5+1-80)/365.25;const a=lsm+270;
    const [x1,y1]=[cx+(OR-5)*Math.cos(a*D),cy-(OR-5)*K*Math.sin(a*D)],[x2,y2]=[cx+(OR+5)*Math.cos(a*D),cy-(OR+5)*K*Math.sin(a*D)];
    const [tx,ty]=[cx+(OR+22)*Math.cos(a*D),cy-(OR*K+16)*Math.sin(a*D)];
    o+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#5E7FA6"/><text class="t-lab" x="${tx}" y="${ty+3}" text-anchor="middle">${m}</text>`});
  // node line (eclipse step)
  if(s.k==="eclipse"){const na=nodeLon(t)+180+90;for(const sg of[1,-1]){const [x,y]=[cx+sg*(OR+8)*Math.cos(na*D),cy-sg*(OR+8)*K*Math.sin(na*D)];
    o+=`<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="var(--ink)" stroke-width=".8" stroke-dasharray="1 3"/>`}
    o+=`<text class="t-lab" x="16" y="${H-14}">dotted line: where the Moon's orbit crosses ours (eclipse seasons)</text>`}
  // sun
  o+=floorShadow(cx,cy,27,.14)+`<circle cx="${cx}" cy="${cy}" r="44" fill="var(--sunglow)"/>`+sphere("skySun",cx,cy,27,SUNC,{self:true,sw:1.2});
  const sunPill=F.pill(cx,cy+40,"Sun",{anchor:"middle",size:9});
  // sunlight beam to earth
  o+=`<line x1="${cx}" y1="${cy}" x2="${ex}" y2="${ey}" stroke="${SUNC}" stroke-width="1.4" opacity=".7"/>`;
  // moon orbit
  if(["phase","tide","eclipse","test"].includes(s.k))o+=`<ellipse cx="${ex}" cy="${ey}" rx="${MR}" ry="${MR*.55}" fill="none" stroke="#5E7FA6" stroke-dasharray="1 3"/>`;
  const behind=Math.sin(mA*D)>0; // moon behind earth (further from viewer)
  const moonSvg=()=>{if(!["phase","tide","eclipse","test"].includes(s.k))return"";const ang=Math.atan2(-(cy-my),cx-mx)/D;
    return `<g>${floorShadow(mx,my,MRr,.14)}${sphere("skyMoon",mx,my,MRr,MOONC,{lit:ang})}<path d="${halfDisc(mx,my,MRr,ang+180)}" fill="${NIGHT}" opacity=".55"/><circle cx="${mx}" cy="${my}" r="${MRr}" fill="none" stroke="#3A3F5C"/></g>`};
  if(behind)o+=moonSvg();
  // tide bulges
  if(s.k==="tide"){const p=tidePull(e),a=ER+9*p,b=ER;
    const rot=-(sunDir+e);o+=`<ellipse cx="${ex}" cy="${ey}" rx="${a}" ry="${b}" transform="rotate(${rot} ${ex} ${ey})" fill="var(--sea)" opacity=".35"/>`;
    const ra=-(sunDir);o+=`<ellipse cx="${ex}" cy="${ey}" rx="${ER+4.2}" ry="${b}" transform="rotate(${ra} ${ex} ${ey})" fill="none" stroke="var(--sun)" stroke-dasharray="2 2" opacity=".8"/>`}
  // earth
  o+=floorShadow(ex,ey,ER,.15)+sphere("skyEarth",ex,ey,ER,EARTHC,{lit:sunDir,sw:1.2});
  o+=`<path d="${halfDisc(ex,ey,ER,sunDir+180)}" fill="${NIGHT}" opacity=".5"/>`+spec(ex,ey,ER,sunDir);
  // axis: fixed in space, north leans left
  const tl=23.44, L=ER+13, axx=-Math.sin(tl*D)*L, axy=-Math.cos(tl*D)*L;
  o+=`<line x1="${ex-axx}" y1="${ey-axy}" x2="${ex+axx}" y2="${ey+axy}" stroke="var(--ink)" stroke-width="${s.k==="tilt"?2:1.2}"/>
      <text class="t-lab" x="${ex+axx-4}" y="${ey+axy-4}" text-anchor="end">N</text><text class="t-lab" x="${ex-axx+4}" y="${ey-axy+10}">S</text>`;
  // place dot circling (spin view)
  const P=PLACES[placeIdx], hA=(solarHour(t,P.lon)-12)*15;
  if(["spin","season","lat","tilt"].includes(s.k)){const da=sunDir+hA, [px,py]=[ex+ER*.6*Math.cos(da*D),ey-ER*.3*Math.sin(da*D)+ER*.3];
    const day=isDay();o+=`<circle cx="${px}" cy="${py}" r="3.2" fill="${day?"var(--sun)":"var(--paper)"}" stroke="var(--ink)"/>`}
  if(!behind)o+=moonSvg();
  o+=sunPill+F.pill(ex+ER+9,ey-8,"Earth",{size:8,ax:ex+ER*.75,ay:ey});
  o+=`<text class="t-lab" x="16" y="22">TOP VIEW · NOT TO SCALE</text><text class="t-ink" x="${W-16}" y="22" text-anchor="end">${fmtDate(t)}${s.k==="spin"?" · "+fmtTime(t):""}</text>`;
  return o;
}
function halfDisc(cx,cy,r,towardDeg){ // half disc facing towardDeg (screen, y up)
  const a1=(towardDeg-90)*D,a2=(towardDeg+90)*D;
  const p1=[cx+r*Math.cos(a1),cy-r*Math.sin(a1)],p2=[cx+r*Math.cos(a2),cy-r*Math.sin(a2)];
  return `M${p1} A${r},${r} 0 0,0 ${p2}Z`}
function isDay(){const P=PLACES[placeIdx];const dec=decl(t),H=(solarHour(t,P.lon)-12)*15;
  const alt=Math.asin(Math.sin(P.lat*D)*Math.sin(dec*D)+Math.cos(P.lat*D)*Math.cos(dec*D)*Math.cos(H*D))/D;return alt>-0.833}

// close-ups
function drawGlobe(){
  const W=420,H=260,cx=300,cy=124,Rr=82,dec=decl(t),P=PLACES[placeIdx],s=CUR;
  let o=F.floor(W,H);
  // rays from left
  for(let y=cy-Rr+8;y<=cy+Rr-8;y+=16)o+=`<line x1="14" y1="${y}" x2="${cx-Math.sqrt(Math.max(0,Rr*Rr-(y-cy)**2))-3}" y2="${y}" stroke="${SUNC}" stroke-width="1.3" opacity=".75"/>`;
  o+=`<text class="t-lab" x="14" y="22">SIDE VIEW · SUNLIGHT FROM THE LEFT</text>`;
  // globe
  o+=floorShadow(cx,cy,Rr,.08)+sphere("skyGlobe",cx,cy,Rr,EARTHC,{lit:180,sw:1.4});
  o+=`<path d="M${cx},${cy-Rr} A${Rr},${Rr} 0 0,1 ${cx},${cy+Rr}Z" fill="${NIGHT}" opacity=".5"/>`;
  const rho=dec; // rotate globe by declination
  const g=(lat,H)=>{const x=-Math.cos(lat*D)*Math.cos(H*D),y=Math.sin(lat*D),z=Math.cos(lat*D)*Math.sin(H*D);
    const sx=x*Math.cos(rho*D)-y*Math.sin(rho*D),sy=x*Math.sin(rho*D)+y*Math.cos(rho*D);return [cx+Rr*sx,cy-Rr*sy,z]};
  // axis
  const [nx,ny]=g(90,0),[sx_,sy_]=g(-90,0),ext=1.22;
  o+=`<line x1="${cx+(nx-cx)*ext}" y1="${cy+(ny-cy)*ext}" x2="${cx+(sx_-cx)*ext}" y2="${cy+(sy_-cy)*ext}" stroke="var(--ink)" stroke-width="1.6"/>`;
  o+=`<text class="t-ink" x="${cx+(nx-cx)*1.32}" y="${cy+(ny-cy)*1.32+4}" text-anchor="middle">N</text><text class="t-ink" x="${cx+(sx_-cx)*1.32}" y="${cy+(sy_-cy)*1.32+4}" text-anchor="middle">S</text>`;
  // latitude lines: equator, tropics, place
  const latLine=(lat,stroke,w,dash)=>{const [x1,y1]=g(lat,0),[x2,y2]=g(lat,180);return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${w}" ${dash?`stroke-dasharray="${dash}"`:""}/>`};
  o+=latLine(0,"var(--paper)",.8,"3 3")+latLine(23.44,"var(--paper)",.6,"1 3")+latLine(-23.44,"var(--paper)",.6,"1 3");
  // place circle split lit/dark (front half)
  const pts=[];for(let H=-180;H<=180;H+=4)pts.push(g(P.lat,H));
  let litPath="",darkPath="";pts.forEach((p,i)=>{if(i===0)return;const q=pts[i-1];const seg=`M${q[0]},${q[1]}L${p[0]},${p[1]}`;
    if((p[0]+q[0])/2<cx)litPath+=seg;else darkPath+=seg});
  o+=`<path d="${darkPath}" stroke="var(--paper)" stroke-width="3" opacity=".5"/><path d="${litPath}" stroke="var(--sun)" stroke-width="3.2" stroke-linecap="round"/>`;
  // subsolar point
  const [ssx,ssy]=g(dec,0);o+=`<circle cx="${ssx}" cy="${ssy}" r="4" fill="var(--sun)" stroke="var(--ink)"/>`;
  // place dot moving with spin
  const Hh=(solarHour(t,P.lon)-12)*15,[px,py,pz]=g(P.lat,Hh);
  o+=`<circle cx="${px}" cy="${py}" r="5" fill="${isDay()?"var(--sun)":"var(--paper)"}" stroke="var(--ink)" stroke-width="1.4" opacity="${pz>=0?1:.45}"/>`;
  // labels column right
  const dl=dayLen(P.lat,dec);
  o+=`<text class="t-lab" x="14" y="${H-48}">YELLOW = ${P.n.toUpperCase()} IN DAYLIGHT</text>
      <text class="t-big" x="14" y="${H-28}">${P.n}: ${hm(dl)} of daylight</text>
      <text class="t-lab" x="14" y="${H-12}">Sun overhead at ${Math.abs(dec).toFixed(1)}°${dec<0?"S":"N"}${Math.abs(Math.abs(dec)-23.44)<.4?(dec<0?" · Tropic of Capricorn":" · Tropic of Cancer"):""}</text>`;
  return o;
}
function drawMoon(){
  const W=420,H=260,a=moonAge(t);let o=F.floor(W,H);
  o+=`<text class="t-lab" x="14" y="22">TONIGHT'S MOON, AS SEEN FROM…</text>`;
  o+=moonDisc(130,120,62,a,true)+`<text class="t-big" x="130" y="214" text-anchor="middle">Aotearoa</text>`;
  o+=moonDisc(318,128,40,a,false)+`<text class="t-lab" x="318" y="190" text-anchor="middle">NORTHERN HEMISPHERE</text>`;
  o+=`<text class="t-ink" x="130" y="238" text-anchor="middle">${phaseName(a)} · ${Math.round(lit(a)*100)}% lit</text>`;
  // 29.5 day strip
  const y=H-14;o+=`<line x1="250" y1="${y}" x2="400" y2="${y}" stroke="#8F9BAA" stroke-width="1.4"/>`;
  [0,7.38,14.77,22.15,29.53].forEach(d=>{const x=250+150*d/SYN;o+=`<line x1="${x}" y1="${y-4}" x2="${x}" y2="${y+4}" stroke="#8F9BAA"/>`});
  o+=`<circle cx="${250+150*a/SYN}" cy="${y}" r="4" fill="var(--sun)" stroke="var(--ink)"/><text class="t-lab" x="250" y="${y-10}">DAY ${a.toFixed(1)} OF 29.5</text>`;
  return o;
}
function drawTide(){
  const W=420,H=260,e=elong(t),p=tidePull(e);let o=F.floor(W,H);
  o+=`<text class="t-lab" x="14" y="22">TIDE RANGE THROUGH THE MONTH (RELATIVE)</text>`;
  // curve
  const x0=24,x1=W-24,ym=150,amp=60;let d="";
  for(let i=0;i<=120;i++){const ee=i/120*360,x=x0+(x1-x0)*i/120,yy=ym-amp*(tidePull(ee)-1)/.46*.9;d+=(i?"L":"M")+x+","+yy}
  o+=`<path d="${d} L${x1},${ym} L${x0},${ym}Z" fill="${EARTHC}" opacity=".16"/><line x1="${x0}" y1="${ym}" x2="${x1}" y2="${ym}" stroke="#8F9BAA"/><path d="${d}" fill="none" stroke="${EARTHC}" stroke-width="2.4"/>`;
  [["New",0],["1st qtr",90],["Full",180],["Last qtr",270],["New",360]].forEach(([n,ee])=>{const x=x0+(x1-x0)*ee/360;
    o+=`<line x1="${x}" y1="${ym+70}" x2="${x}" y2="${ym+76}" stroke="#8F9BAA"/><text class="t-lab" x="${x}" y="${ym+90}" text-anchor="middle">${n.toUpperCase()}</text>`});
  o+=`<text class="t-lab" x="${x0}" y="${ym-amp-6}">SPRING</text><text class="t-lab" x="${x0+(x1-x0)/4}" y="${ym+amp+4}" text-anchor="middle">NEAP</text>`;
  const cxp=x0+(x1-x0)*e/360,cyp=ym-amp*(p-1)/.46*.9;
  o+=`<circle cx="${cxp}" cy="${cyp}" r="6" fill="${SUNC}" stroke="var(--ink)" stroke-width="1.3"/><text class="t-big" x="${Math.min(cxp+10,W-110)}" y="${cyp-10}">${Math.round(p*100)}% of average</text>`;
  return o;
}
function drawEclipse(){
  const W=420,H=260,e=elong(t),b=moonLat(t);let o=F.floor(W,H);
  o+=`<text class="t-lab" x="14" y="22">EDGE-ON VIEW · MOON'S HEIGHT ABOVE OUR ORBIT</text>`;
  const ym=135,sx=40,ex_=240;
  o+=`<line x1="20" y1="${ym}" x2="${W-20}" y2="${ym}" stroke="#8F9BAA" stroke-dasharray="3 3"/><text class="t-lab" x="${W-20}" y="${ym-6}" text-anchor="end">EARTH'S ORBIT PLANE</text>`;
  o+=`<circle cx="${sx}" cy="${ym}" r="34" fill="var(--sunglow)"/>`+sphere("skyESun",sx,ym,22,SUNC,{self:true});
  // earth shadow
  o+=`<path d="M${ex_},${ym-16} L${W-20},${ym-6} L${W-20},${ym+6} L${ex_},${ym+16}Z" fill="${NIGHT}" opacity=".22"/>`;
  o+=sphere("skyEEarth",ex_,ym,16,EARTHC,{lit:180})+`<path d="${halfDisc(ex_,ym,16,0)}" fill="${NIGHT}" opacity=".45"/>`;
  // moon x: between sun and earth at new, behind earth at full
  const mx=ex_-Math.cos(e*D)*95, my=ym-b*14;
  o+=`<line x1="${ex_}" y1="${ym}" x2="${mx}" y2="${my}" stroke="#8F9BAA" stroke-width=".8"/>`;
  o+=`<g opacity="${Math.abs(Math.sin(e*D))>.35?.45:1}">${sphere("skyEMoon",mx,my,7,MOONC,{lit:180})}<path d="${halfDisc(mx,my,7,0)}" fill="${NIGHT}" opacity=".45"/></g>`;
  const ec=eclipse(t),good=ec.includes("eclipse");
  o+=`<text class="t-big" x="14" y="${H-28}" ${good?'fill="var(--warn)"':""}>${good?ec+"!":ec==="No"?"Not lined up: no eclipse":"Lined up, but the Moon "+(b>0?"passes above":"passes below")}</text>
      <text class="t-lab" x="14" y="${H-12}">MOON ${Math.abs(b).toFixed(1)}° ${b>0?"ABOVE":"BELOW"} · ${phaseName(moonAge(t)).toUpperCase()}</text>`;
  return o;
}

function chipMap(){
  const P=PLACES[placeIdx],dec=decl(t),a=moonAge(t),e=elong(t),s=CUR;
  const tp=tidePull(e),tt=tp>1.3?"Spring tide":tp<.7?"Neap tide":"In between";
  const map={
    date:["DATE",fmtDate(t)],time:["TIME (NZ)",fmtTime(t)],daynight:[P.n.toUpperCase(),isDay()?"Day":"Night",isDay()],
    daylen:["DAYLIGHT",hm(dayLen(P.lat,dec)),s.k==="season"||s.k==="lat"],spin:["SPIN","15° per hour"],
    overhead:["SUN OVERHEAD",Math.abs(dec).toFixed(1)+"°"+(dec<0?"S":"N"),s.k==="tilt"],season:["SEASON (NZ)",season(t),s.k==="season"],
    noon:["SUN AT NOON",noonAlt(P.lat,dec).toFixed(0)+"° up"],place:["PLACE",P.n+" "+Math.abs(P.lat).toFixed(1)+"°"+(P.lat<0?"S":"")],
    compare:["VS AUCKLAND",(dayLen(P.lat,dec)>=dayLen(-36.85,dec)?"+":"−")+hm(Math.abs(dayLen(P.lat,dec)-dayLen(-36.85,dec)))],
    phase:["MOON",phaseName(a),s.k==="phase"],litpct:["LIT",Math.round(lit(a)*100)+"%"],age:["MOON AGE",a.toFixed(1)+" d"],
    tide:["TIDE PULL",Math.round(tp*100)+"%"],tidetype:["TIDE",tt,s.k==="tide"&&tt!=="In between"],
    mlat:["MOON VS ORBIT",Math.abs(moonLat(t)).toFixed(1)+"° "+(moonLat(t)>0?"above":"below")],eclipse:["ECLIPSE",eclipse(t),eclipse(t).includes("eclipse")]
  };
  return map;
}
const CH=[
 {q:"Give Invercargill its longest day of the year.",check:()=>placeIdx===3&&decl(t)<-23.2,ok:"Yes. Around 21 December the south is tilted most towards the Sun, so Invercargill gets about 15 h 49 min of daylight.",no:()=>placeIdx!==3?"Pick Invercargill in the place menu first.":`Not yet: daylight is ${hm(dayLen(-46.41,decl(t)))}. Find when the Sun is overhead at 23.4°S.`},
 {q:"Find a spring tide.",check:()=>tidePull(elong(t))>1.38,ok:"Yes. The Sun and Moon are lined up (new or full Moon), so their pulls add.",no:()=>`Not yet: the Moon is ${phaseName(moonAge(t)).toLowerCase()}. Spring tides come at new and full Moon.`},
 {q:"Make an eclipse happen.",check:()=>eclipse(t).includes("eclipse"),ok:()=>`Yes: ${eclipse(t).toLowerCase()}. The Moon is at a crossing point of the two orbits at the right phase.`,no:()=>`Not yet: ${eclipse(t)==="No"?"the Moon isn't new or full":"the Moon is "+Math.abs(moonLat(t)).toFixed(1)+"° off our orbit"}. Try early February or early August 2027 on the slider.`}
];

let t=START, placeIdx=1, CUR=STEPS[0];
STEPS.forEach(s=>{s.speedLabel=s.speed?(s.speed<1?"1 day ≈ 6 s":s.speed>=12?"1 year ≈ 30 s":s.speed>=6?"1 month ≈ 5 s":"1 month ≈ 15 s"):"";
  s.controls=s.k==="test"?["today","date","place"]:["play","today","date","place"]});
// ---- kupu Māori: te reo terms for this machine, each checked in Te Aka Māori Dictionary (ta = word id). Sources and notes: te-reo-notes.md
const KUPU=[
 {mi:"rā",en:"sun",ta:6405},
 {mi:"marama",en:"moon",ta:3673},
 {mi:"pou tāwhirowhiro",en:"axis of rotation",ta:40009},
 {mi:"kaupeka",en:"season",ta:2441},
 {mi:"mata o te marama",en:"phases of the moon",ta:39883},
 {mi:"tai pari",en:"high tide",ta:40275},
 {mi:"tai timu",en:"low tide",ta:7187},
 {mi:"āraitanga",en:"eclipse",ta:347}];
Object.entries({"spin": ["rā", "pou tāwhirowhiro"], "tilt": ["pou tāwhirowhiro", "kaupeka"], "season": ["kaupeka"], "lat": ["rā"], "phase": ["marama", "mata o te marama"], "tide": ["tai pari", "tai timu", "marama"], "eclipse": ["āraitanga", "rā", "marama"]}).forEach(([k,a])=>{const st=STEPS.find(x=>x.k===k);if(st)st.kupu=a});
// ---------- the 3D bench (../kit3d.js): a working orrery. The Sun lights the Earth and Moon for real (a day/night terminator
// computed per pixel), the Earth's axis keeps its 23.4° lean in one direction all year, the Moon's orbit is tilted 5.1° with its
// node line, and the tide bulges follow the Moon and Sun. Every position comes from the same model as the drawing (t, decl, elong…).
function sky3d(S){const {THREE,mat,PAL}=S;const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
  const OR=7.2,ER=.85,MR=.24,MD=2.3,Y0=1.9,EPS=23.44*D;
  // the orrery plate: frosted acrylic on a plinth, the orbit and months printed on it
  const plate=S.panel(1024,1024,OR*2+3.6);plate.rotation.x=-Math.PI/2;plate.position.y=.36;plate.material.transparent=true;S.scene.add(plate);
  const disc=S.cyl(OR+1.8,OR+1.9,.3,mat("plastic",PAL.case.sky,{rough:.6,coat:.1}),{at:[0,.15,0],seg:96,cast:false});disc.renderOrder=1;S.scene.add(disc);
  S.scene.add(S.torus(OR+1.85,.05,mat("plastic","#ffffff",{rough:.3}),{at:[0,.31,0],rot:[Math.PI/2,0,0],ts:128}));
  const months=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const lonOfDay=d=>((360*(d+1-80)/365.25)%360+360)%360;
  plate.redraw((g,w,h)=>{const c=w/2,k=w/(OR*2+3.6);g.strokeStyle="rgba(58,111,184,.55)";g.lineWidth=3;g.setLineDash([6,10]);g.beginPath();g.arc(c,c,OR*k,0,7);g.stroke();g.setLineDash([]);
    g.font="600 26px Instrument Sans, system-ui";g.textAlign="center";g.textBaseline="middle";
    months.forEach((m,i)=>{const d=(Date.UTC(2026,i,15)-Date.UTC(2026,0,1))/864e5;const ls=lonOfDay(d)*D;const a=ls+Math.PI;   // Earth sits opposite the Sun's longitude
      g.strokeStyle="rgba(58,111,184,.7)";g.lineWidth=3;
      g.beginPath();g.moveTo(c+Math.cos(a)*(OR-.25)*k,c-Math.sin(a)*(OR-.25)*k);g.lineTo(c+Math.cos(a)*(OR+.25)*k,c-Math.sin(a)*(OR+.25)*k);g.stroke();
      g.fillStyle="#3A6FB8";g.fillText(m.toUpperCase(),c+Math.cos(a)*(OR+.9)*k,c-Math.sin(a)*(OR+.9)*k)})});
  // the Sun: a glowing ball on a brass stem, with a soft corona; it does not cast the bench shadow
  const sunM=new THREE.MeshBasicMaterial({color:new THREE.Color("#FFD45A").multiplyScalar(1.6),toneMapped:true});
  const sun=S.sphere(1.05,sunM,{cast:false,seg:48});sun.position.set(0,Y0,0);S.scene.add(sun);
  const corona=S.puffs(1,"#FFC94A",{additive:true});corona.put(0,0,Y0,0,.75,5200);corona.done();S.scene.add(corona);
  S.scene.add(S.cyl(.08,.14,Y0-.3,mat("metal","#D8B16A",{rough:.25}),{at:[0,.36+(Y0-.3)/2-.05,0],seg:20}));
  // a lit-by-the-Sun material: day side from a texture, night side navy, a soft terminator
  const sunU={value:V3(0,Y0,0)};
  function litMat(tex,night){return new THREE.ShaderMaterial({uniforms:{map:{value:tex},sunPos:sunU,night:{value:new THREE.Color(night)}},
    vertexShader:`varying vec3 vN;varying vec3 vW;varying vec2 vUv;void main(){vUv=uv;vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;vN=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader:`uniform sampler2D map;uniform vec3 sunPos;uniform vec3 night;varying vec3 vN;varying vec3 vW;varying vec2 vUv;
      void main(){vec3 l=normalize(sunPos-vW);float d=dot(normalize(vN),l);vec3 c=texture2D(map,vUv).rgb;float lit=smoothstep(-.06,.12,d);
      vec3 day=c*(.55+.55*max(d,0.));vec3 nt=mix(night,c*.25,.25);vec3 col=mix(nt,day,lit);
      float rim=pow(1.-max(dot(normalize(vN),normalize(cameraPosition-vW)),0.),3.);col+=vec3(.55,.75,1.)*rim*.25*lit;gl_FragColor=vec4(col,1.);
      #include <colorspace_fragment>
      }`})}
  // a pastel Earth: oceans, rough continents, Aotearoa picked out
  const LAND={nzN:[[172.7,-34.4],[174.5,-35.5],[175.5,-37],[178.5,-37.7],[177,-39.5],[176.5,-41.3],[174.8,-41.3],[174,-39.5],[173.8,-39],[174.6,-37.5]],
    nzS:[[172.7,-40.5],[174.3,-41.3],[173,-43],[171.2,-44.5],[170.6,-45.9],[169,-46.6],[166.5,-46],[167,-45],[168.4,-44],[170.5,-43],[172,-41.5]],
    aus:[[113,-22],[114,-26],[115,-34],[118,-35],[123,-34],[129,-31.5],[132,-32],[135,-34.5],[138,-35],[140,-38],[146,-39],[150,-37.5],[153,-32],[153,-25],[146,-19],[145,-15],[142,-11],[141,-17],[136,-12],[131,-11.5],[129,-15],[125,-14],[122,-17],[114,-21.5]],
    sam:[[-80,9],[-77,1],[-81,-5],[-76,-14],[-71,-18],[-71,-30],[-73,-40],[-75,-52],[-68,-55],[-65,-47],[-58,-38],[-48,-28],[-40,-22],[-35,-8],[-50,0],[-60,10],[-72,12]],
    afr:[[-17,15],[-17,21],[-10,30],[-5,36],[10,37],[22,32],[32,31],[35,28],[43,12],[51,12],[40,-2],[40,-15],[35,-24],[32,-29],[27,-34],[20,-35],[17,-29],[12,-17],[13,-6],[9,4],[-8,4],[-14,10]],
    eur:[[-10,36],[-9,43],[-2,47],[-5,48],[2,51],[8,54],[10,58],[5,62],[16,69],[30,71],[45,68],[70,73],[100,77],[140,72],[180,68],[180,62],[163,58],[156,51],[141,46],[135,35],[122,30],[120,22],[108,21],[105,10],[100,13],[98,8],[100,3],[104,1],[98,16],[92,22],[88,22],[80,15],[77,8],[73,19],[67,25],[58,25],[56,27],[50,30],[48,29],[56,22],[58,17],[52,15],[43,13],[39,21],[34,28],[32,31],[27,36],[23,36],[19,40],[13,45],[12,42],[15,38],[8,44],[3,43],[-1,37]],
    nam:[[-168,66],[-162,70],[-140,70],[-120,70],[-95,72],[-80,68],[-62,60],[-55,52],[-66,45],[-70,41],[-76,35],[-80,32],[-81,25],[-83,29],[-90,30],[-97,27],[-97,22],[-87,21],[-88,16],[-83,10],[-79,9],[-85,11],[-92,15],[-105,20],[-110,24],[-115,32],[-121,35],[-124,42],[-124,48],[-132,55],[-140,60],[-152,59],[-165,62]],
    grl:[[-55,60],[-43,60],[-20,70],[-20,82],[-60,82],[-70,77],[-58,70]]};
  const ec=document.createElement("canvas");ec.width=1024;ec.height=512;{const g=ec.getContext("2d");const X=l=>(l+180)/360*1024,Y=b=>(90-b)/180*512;
    const gr=g.createLinearGradient(0,0,0,512);gr.addColorStop(0,"#9CC8F2");gr.addColorStop(.5,"#7FB4EC");gr.addColorStop(1,"#9CC8F2");g.fillStyle=gr;g.fillRect(0,0,1024,512);
    g.fillStyle="#F4F7FB";g.fillRect(0,Y(-68),1024,512);g.fillRect(0,0,1024,Y(80));
    for(const [k,pts] of Object.entries(LAND)){g.fillStyle=k.startsWith("nz")?"#7CC48A":"#B9E2A6";g.beginPath();pts.forEach((p,i)=>g[i?"lineTo":"moveTo"](X(p[0]),Y(p[1])));g.closePath();g.fill();
      g.strokeStyle=k.startsWith("nz")?"#3E8F55":"rgba(62,143,85,.35)";g.lineWidth=k.startsWith("nz")?2:1.5;g.stroke()}}
  const earthTex=new THREE.CanvasTexture(ec);earthTex.colorSpace=THREE.SRGBColorSpace;earthTex.anisotropy=8;
  const mc=document.createElement("canvas");mc.width=256;mc.height=128;{const g=mc.getContext("2d");g.fillStyle="#E9E6DD";g.fillRect(0,0,256,128);let sd=3;const r=()=>(sd=(sd*16807)%2147483647)/2147483647;
    for(let i=0;i<40;i++){g.fillStyle=`rgba(150,145,135,${.15+r()*.2})`;g.beginPath();g.arc(r()*256,r()*128,2+r()*9,0,7);g.fill()}}
  const moonTex=new THREE.CanvasTexture(mc);moonTex.colorSpace=THREE.SRGBColorSpace;
  const earthSys=S.group();      // moves around the orbit
  const tilt=S.group(earthSys);  // holds the fixed axis direction
  const AX=V3(0,Math.cos(EPS),-Math.sin(EPS));tilt.quaternion.setFromUnitVectors(V3(0,1,0),AX);
  const spin=S.group(tilt);
  const earth=S.mesh(new THREE.SphereGeometry(ER,96,64),litMat(earthTex,"#1B2452"),{cast:false});spin.add(earth);
  const axisRod=S.cyl(.022,.022,ER*3.1,mat("metal",PAL.steelDark,{rough:.3}),{seg:10,cast:false});tilt.add(axisRod);
  tilt.add(S.sphere(.05,mat("plastic",PAL.product.strawberry),{at:[0,ER*1.55,0],cast:false}));tilt.add(S.sphere(.05,mat("plastic",PAL.product.blueberry),{at:[0,-ER*1.55,0],cast:false}));
  const eq=S.torus(ER*1.003,.006,new THREE.MeshBasicMaterial({color:"#ffffff",transparent:true,opacity:.55}),{rot:[Math.PI/2,0,0],cast:false});tilt.add(eq);
  // the place pin rides on the spinning Earth
  const pin=S.group(spin);const pinBall=S.sphere(.055,mat("glow",PAL.product.strawberry,1.4),{cast:false});pin.add(pinBall);
  const pinStem=S.cyl(.012,.012,.16,mat("plastic",PAL.product.strawberry),{at:[0,-.08,0],cast:false});pin.add(pinStem);
  const placeDir=p=>{const l=p.lon*D,b=p.lat*D;return V3(Math.cos(b)*Math.cos(l),Math.sin(b),-Math.cos(b)*Math.sin(l))};
  // the Moon and its tilted orbit ring
  const moon=S.mesh(new THREE.SphereGeometry(MR,48,32),litMat(moonTex,"#2A3158"),{cast:false});earthSys.add(moon);
  const mOrbit=S.torus(MD,.008,new THREE.MeshBasicMaterial({color:PAL.deep.sky,transparent:true,opacity:.5}),{rot:[Math.PI/2,0,0],ts:128,cast:false});
  const mOrbitG=S.group(earthSys);mOrbitG.add(mOrbit);
  const nodeLine=S.cyl(.008,.008,MD*2.3,new THREE.MeshBasicMaterial({color:PAL.ink,transparent:true,opacity:.45}),{rot:[0,0,Math.PI/2],cast:false,seg:6});mOrbitG.add(nodeLine);
  // tide bulges: a translucent ocean shell stretched towards the Moon (and a little towards the Sun)
  const tide=S.mesh(new THREE.SphereGeometry(ER*1.04,64,48),new THREE.MeshPhysicalMaterial({color:"#5FA3EA",transparent:true,opacity:.35,roughness:.1,clearcoat:1,depthWrite:false}),{cast:false});earthSys.add(tide);
  // shadows in space for the eclipse step: Earth's and the Moon's
  const shadowM=new THREE.MeshBasicMaterial({color:"#1B2452",transparent:true,opacity:.22,depthWrite:false,side:THREE.DoubleSide});
  const eShadow=S.mesh(new THREE.CylinderGeometry(ER,ER*.25,5,48,1,true),shadowM,{cast:false});const eShG=S.group(earthSys);eShG.add(eShadow);eShadow.position.y=2.5;
  const mShadow=S.mesh(new THREE.CylinderGeometry(MR,0.0,MD*1.05,32,1,true),shadowM,{cast:false});const mShG=S.group(earthSys);mShG.add(mShadow);mShadow.position.y=MD*.525;
  // a sunbeam from the Sun to the Earth
  const beam=S.mesh(new THREE.CylinderGeometry(.03,.03,1,8),new THREE.MeshBasicMaterial({color:"#FFD45A",transparent:true,opacity:.55}),{cast:false});S.scene.add(beam);
  const lPlace=S.label({cls:"hot",off:[26,-20]}),lSun=S.label({off:[0,-40]}).set("Sun"),lMoon=S.label({off:[22,-22]}),lAxis=S.label({off:[22,-14]}),lEarth=S.label({off:[-26,-30]}),lTide=S.label({off:[-30,24]});
  S.pick(earth,()=>{S.api.state.playing=!S.api.state.playing});
  S.view("globe",[0,0,0],[0,0,0]);let viewName="globe";
  const ep=V3(),tmp=V3(),q=new THREE.Quaternion();
  const camFor=(k,E)=>{   // camera offsets around the moving Earth, with the Sun in the background where it helps
    const toSun=V3(0,Y0,0).sub(E).normalize(),side=V3().crossVectors(toSun,V3(0,1,0)).normalize();
    if(k==="globe")return [E.clone().addScaledVector(toSun,2.3).addScaledVector(side,3.9).add(V3(0,1.4,0)),E.clone()];
    if(k==="moon")return [E.clone().add(V3(0,5.4,0)).addScaledVector(toSun,2.8).addScaledVector(side,.6),E.clone()];
    if(k==="tide")return [E.clone().add(V3(0,3.4,0)).addScaledVector(side,1.8).addScaledVector(toSun,1.6),E.clone()];
    if(k==="eclipse")return [E.clone().addScaledVector(side,5.6).add(V3(0,.8,0)).addScaledVector(toSun,1.4),E.clone().addScaledVector(toSun,.8)];
    return [V3(4,13,15),V3(0,1,0)]};
  function place(){earthSys.position.copy(ep)}
  return {
    step(st){viewName=st.k==="test"?"wide":st.view;const E=earthPos();const [p,tg]=camFor(viewName,E);S.view("cur",p.toArray(),tg.toArray(),{min:1.6,max:40,dur:1.8});S.goView("cur");
      S.setFollow(viewName==="wide"?null:()=>earthSys.position.clone(),.2,true);S.setShadowBox(10,[0,0,0])},
    update(s,st,dt,tt){
      const E=earthPos();ep.copy(E);place();
      // spin: put the subsolar longitude under the Sun
      const ls=sunLon(t)*D,toSunW=V3(0,Y0,0).sub(E).normalize();
      tilt.updateMatrixWorld();q.copy(tilt.quaternion).invert();const dL=toSunW.clone().applyQuaternion(q);const lt=Math.atan2(-dL.z,dL.x);
      const d=new Date(t),utc=d.getUTCHours()+d.getUTCMinutes()/60+d.getUTCSeconds()/3600,lsub=(12-utc)*15*D;spin.rotation.y=lt-lsub;
      const P=PLACES[placeIdx];const pd=placeDir(P);pin.position.copy(pd).multiplyScalar(ER*1.05);pin.quaternion.setFromUnitVectors(V3(0,1,0),pd);
      // Moon: ecliptic longitude Sun + elongation, latitude from the tilted orbit
      const e=elong(t)*D,b=moonLat(t)*D*(st.k==="eclipse"?3:1),L=ls+e;
      moon.position.set(Math.cos(L)*Math.cos(b)*MD,Math.sin(b)*MD,-Math.sin(L)*Math.cos(b)*MD);
      const showM=["phase","tide","eclipse","test"].includes(st.k);moon.visible=mOrbitG.visible=showM;
      const nl=nodeLon(t)*D;mOrbitG.rotation.set(0,nl,0);mOrbit.rotation.set(Math.PI/2+5.145*D*(st.k==="eclipse"?3:1),0,0);nodeLine.visible=st.k==="eclipse";
      // tides: bulge towards the Moon, size from the Sun–Moon alignment
      tide.visible=st.k==="tide";if(tide.visible){const k=tidePull(elong(t))*.14;const md=moon.position.clone().normalize();tide.quaternion.setFromUnitVectors(V3(1,0,0),md);tide.scale.set(1+k,1-k*.35,1-k*.35)}
      eShG.visible=mShG.visible=st.k==="eclipse";if(eShG.visible){const away=toSunW.clone().negate();eShG.quaternion.setFromUnitVectors(V3(0,1,0),away);mShG.position.copy(moon.position);mShG.quaternion.setFromUnitVectors(V3(0,1,0),away)}
      const bl=E.distanceTo(sun.position)-ER-1.05;beam.scale.y=Math.max(.01,bl);beam.position.copy(sun.position).addScaledVector(toSunW.clone().negate(),1.05+bl/2);beam.quaternion.setFromUnitVectors(V3(0,1,0),toSunW);
      const dec=decl(t);
      lPlace.at(pin.getWorldPosition(tmp)).set(`${P.n}<small>${hm(dayLen(P.lat,dec))} of daylight · ${fmtTime(t)}</small>`);
      lSun.at(sun.position.clone().add(V3(0,1.1,0)));
      lMoon.show(showM).at(moon.getWorldPosition(tmp)).set(`Moon<small>${phaseName(moonAge(t))} · ${Math.round(lit(moonAge(t))*100)}% lit</small>`);
      lAxis.show(["tilt","season","test","spin"].includes(st.k)).at(tmp.set(0,ER*1.55,0).applyQuaternion(tilt.quaternion).add(E)).set(`Axis<small>23.4°, always the same way</small>`);
      lEarth.show(st.k!=="test").at(tmp.copy(E).add(V3(0,ER*1.2,0))).set(`${fmtDate(t)}<small>${season(t)} in Aotearoa · Sun overhead ${Math.abs(dec).toFixed(1)}°${dec<0?"S":"N"}</small>`);
      lTide.show(st.k==="tide").at(tmp.copy(E).addScaledVector(moon.position.clone().normalize(),ER*1.2)).set(`${tidePull(elong(t))>1.25?"Spring tides":tidePull(elong(t))<.75?"Neap tides":"Tides"}<small>bulges follow the Moon</small>`);
    }};
  function earthPos(){const ls=sunLon(t)*D;return V3(-Math.cos(ls)*OR,Y0,Math.sin(ls)*OR)}
}
StudyKit.mount({kupu:KUPU,scene3d:sky3d,
  eyebrow:"Earth & Space · made for Aotearoa", title:"The Sun–Earth–Moon machine", crumb:"NCEA Level 1 · Physics, Earth and Space Science · also Year 9–10 science", homeHash:"l1",
  fig:"FIG. 01 · AOTEAROA SKY", railTitle:"How the sky runs our days",
  badge:{label:"NCEA L1 PESS 92046", exam:"2026-11-12T14:00:00+13:00", examText:"Thu 12 Nov, 2pm"},
  mainBox:"0 0 640 330", mainPhoneBig:true, mainLabel:"Orrery: the Sun at the centre, the Earth on its orbit, the Moon around the Earth", closeBox:"0 0 420 260",
  state:{}, steps:STEPS,
  controls:[{type:"play"},{type:"button",id:"today",label:"Today",onClick:()=>{t=Date.now()}},
    {type:"range",id:"date",label:"Date",min:0,max:365,step:0.25,get:()=>Math.max(0,Math.min(365,(t-START)/864e5)),set:(s,v)=>{t=START+v*864e5},fmt:()=>fmtDate(t).replace(/ \d{4}$/,"")},
    {type:"select",id:"place",label:"Place",options:PLACES.map((p,i)=>[i,p.n]),get:()=>placeIdx,set:(s,v)=>{placeIdx=+v}}],
  tick:(s,dt,st)=>{t+=dt*st.speed*864e5;if(t>START+365*864e5)t=START},
  drawMain:(s,st)=>{CUR=st;return drawOrrery()},
  drawClose:(s,st)=>{CUR=st;const v=st.view;return v==="globe"?drawGlobe():v==="moon"?drawMoon():v==="tide"?drawTide():drawEclipse()},
  chips:(s,st)=>{CUR=st;return chipMap()},
  challenges:CH.map(c=>({q:c.q,check:()=>c.check(),ok:c.ok,no:c.no})),
  onStep:(s,st)=>{if(st.k==="lat"&&placeIdx===1)placeIdx=3},
  papers:[{label:"NZQA: Physics, Earth and Space Science",url:"https://www2.nzqa.govt.nz/ncea/subjects/subject/physics-earth-and-space-science"}],
  truth:"A simplified model of the real sky, not a live feed. Sizes and distances are not to scale. Day lengths, noon Sun heights and Moon phases are calculated from standard formulas and are close to real values for 2026–27; tide sizes are relative, not metres for a real harbour.",
  footer:"Covers the observable patterns in AS 92046: day and night, seasons, Moon phases, tides, eclipses, and how they vary by place."
});
})();