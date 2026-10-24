
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
function moonDisc(cx,cy,r,age,south=true,cls=""){
  // lit fraction by terminator ellipse; waxing lit on left in the south
  const f=lit(age), wax=age<SYN/2, k=1-2*f, rx=Math.abs(k)*r;
  let side=(wax?-1:1)*(south?1:-1); // -1 lit on left
  const sweepOuter=side<0?0:1;
  const top=`${cx},${cy-r}`, bot=`${cx},${cy+r}`;
  const outer=`M${top} A${r},${r} 0 0,${sweepOuter} ${bot}`;
  const inner=`A${rx},${r} 0 0,${(k>0)?(sweepOuter?0:1):sweepOuter} ${top}`;
  return `<g class="${cls}"><circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--night)" stroke="var(--ink)" stroke-width="1"/>
    <path d="${outer} ${inner}Z" fill="var(--moon)"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--ink)" stroke-width="1"/></g>`;
}

function drawOrrery(){
  const W=640,H=330,cx=320,cy=168,OR=228,K=.38,big=innerWidth<600,ER=big?25:17,MRr=big?11:7;
  const ls=sunLon(t), earthA=ls+180+90; // screen angle; Dec solstice -> left
  const [ex,ey]=[cx+OR*Math.cos(earthA*D),cy-OR*K*Math.sin(earthA*D)];
  const sunDir=Math.atan2(-(cy-ey),cx-ex)/D; // screen angle from Earth to Sun (y up)
  const e=elong(t), s=CUR;
  const mA=sunDir+e, MR=big?64:48;
  const mx=ex+MR*Math.cos(mA*D), my=ey-MR*.55*Math.sin(mA*D)-moonLat(t)*(s.k==="eclipse"?2.2:0);
  let o=`<rect width="${W}" height="${H}" fill="var(--chalk)"/>`;
  // month ticks on orbit
  const months=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  o+=`<ellipse cx="${cx}" cy="${cy}" rx="${OR}" ry="${OR*K}" fill="none" stroke="var(--rose)" stroke-width="1" stroke-dasharray="2 4"/>`;
  months.forEach((m,i)=>{const lsm=360*((new Date(Date.UTC(2026,i,15))-Date.UTC(2026,0,1))/864e5+1-80)/365.25;const a=lsm+270;
    const [x1,y1]=[cx+(OR-5)*Math.cos(a*D),cy-(OR-5)*K*Math.sin(a*D)],[x2,y2]=[cx+(OR+5)*Math.cos(a*D),cy-(OR+5)*K*Math.sin(a*D)];
    const [tx,ty]=[cx+(OR+22)*Math.cos(a*D),cy-(OR*K+16)*Math.sin(a*D)];
    o+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--rose)"/><text class="t-lab" x="${tx}" y="${ty+3}" text-anchor="middle">${m}</text>`});
  // node line (eclipse step)
  if(s.k==="eclipse"){const na=nodeLon(t)+180+90;for(const sg of[1,-1]){const [x,y]=[cx+sg*(OR+8)*Math.cos(na*D),cy-sg*(OR+8)*K*Math.sin(na*D)];
    o+=`<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="var(--ink)" stroke-width=".8" stroke-dasharray="1 3"/>`}
    o+=`<text class="t-lab" x="16" y="${H-14}">dotted line: where the Moon's orbit crosses ours (eclipse seasons)</text>`}
  // sun
  o+=`<circle cx="${cx}" cy="${cy}" r="44" fill="var(--sunglow)"/><circle cx="${cx}" cy="${cy}" r="27" fill="var(--sun)" stroke="var(--ink)" stroke-width="1.2"/>
      <text class="t-lab" x="${cx}" y="${cy+52}" text-anchor="middle">SUN</text>`;
  // sunlight beam to earth
  o+=`<line x1="${cx}" y1="${cy}" x2="${ex}" y2="${ey}" stroke="var(--sun)" stroke-width="1" opacity=".55"/>`;
  // moon orbit
  if(["phase","tide","eclipse","test"].includes(s.k))o+=`<ellipse cx="${ex}" cy="${ey}" rx="${MR}" ry="${MR*.55}" fill="none" stroke="var(--rose)" stroke-dasharray="1 3"/>`;
  const behind=Math.sin(mA*D)>0; // moon behind earth (further from viewer)
  const moonSvg=()=>{if(!["phase","tide","eclipse","test"].includes(s.k))return"";const ang=Math.atan2(-(cy-my),cx-mx)/D;
    return `<g><circle cx="${mx}" cy="${my}" r="${MRr}" fill="var(--night)" stroke="var(--ink)"/><path d="${halfDisc(mx,my,MRr,ang)}" fill="var(--moon)"/><circle cx="${mx}" cy="${my}" r="${MRr}" fill="none" stroke="var(--ink)"/></g>`};
  if(behind)o+=moonSvg();
  // tide bulges
  if(s.k==="tide"){const p=tidePull(e),a=ER+9*p,b=ER;
    const rot=-(sunDir+e);o+=`<ellipse cx="${ex}" cy="${ey}" rx="${a}" ry="${b}" transform="rotate(${rot} ${ex} ${ey})" fill="var(--sea)" opacity=".35"/>`;
    const ra=-(sunDir);o+=`<ellipse cx="${ex}" cy="${ey}" rx="${ER+4.2}" ry="${b}" transform="rotate(${ra} ${ex} ${ey})" fill="none" stroke="var(--sun)" stroke-dasharray="2 2" opacity=".8"/>`}
  // earth
  o+=`<circle cx="${ex}" cy="${ey}" r="${ER}" fill="var(--earth)" stroke="var(--ink)" stroke-width="1.2"/>`;
  o+=`<path d="${halfDisc(ex,ey,ER,sunDir+180)}" fill="var(--night)"/>`;
  // axis: fixed in space, north leans left
  const tl=23.44, L=ER+13, axx=-Math.sin(tl*D)*L, axy=-Math.cos(tl*D)*L;
  o+=`<line x1="${ex-axx}" y1="${ey-axy}" x2="${ex+axx}" y2="${ey+axy}" stroke="var(--ink)" stroke-width="${s.k==="tilt"?2:1.2}"/>
      <text class="t-lab" x="${ex+axx-4}" y="${ey+axy-4}" text-anchor="end">N</text><text class="t-lab" x="${ex-axx+4}" y="${ey-axy+10}">S</text>`;
  // place dot circling (spin view)
  const P=PLACES[placeIdx], hA=(solarHour(t,P.lon)-12)*15;
  if(["spin","season","lat","tilt"].includes(s.k)){const da=sunDir+hA, [px,py]=[ex+ER*.6*Math.cos(da*D),ey-ER*.3*Math.sin(da*D)+ER*.3];
    const day=isDay();o+=`<circle cx="${px}" cy="${py}" r="3.2" fill="${day?"var(--sun)":"var(--paper)"}" stroke="var(--ink)"/>`}
  if(!behind)o+=moonSvg();
  o+=`<text class="t-lab" x="${ex+ER+10}" y="${ey+4}">EARTH</text>`;
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
  let o=`<rect width="${W}" height="${H}" fill="var(--chalk)"/>`;
  // rays from left
  for(let y=cy-Rr+8;y<=cy+Rr-8;y+=16)o+=`<line x1="14" y1="${y}" x2="${cx-Math.sqrt(Math.max(0,Rr*Rr-(y-cy)**2))-3}" y2="${y}" stroke="var(--sun)" stroke-width="1" opacity=".6"/>`;
  o+=`<text class="t-lab" x="14" y="22">SIDE VIEW · SUNLIGHT FROM THE LEFT</text>`;
  // globe
  o+=`<circle cx="${cx}" cy="${cy}" r="${Rr}" fill="var(--earth)" stroke="var(--ink)" stroke-width="1.4"/>`;
  o+=`<path d="M${cx},${cy-Rr} A${Rr},${Rr} 0 0,1 ${cx},${cy+Rr}Z" fill="var(--night)"/>`;
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
  const W=420,H=260,a=moonAge(t);let o=`<rect width="${W}" height="${H}" fill="var(--chalk)"/>`;
  o+=`<text class="t-lab" x="14" y="22">TONIGHT'S MOON, AS SEEN FROM…</text>`;
  o+=moonDisc(130,120,62,a,true)+`<text class="t-big" x="130" y="214" text-anchor="middle">Aotearoa</text>`;
  o+=moonDisc(318,128,40,a,false)+`<text class="t-lab" x="318" y="190" text-anchor="middle">NORTHERN HEMISPHERE</text>`;
  o+=`<text class="t-ink" x="130" y="238" text-anchor="middle">${phaseName(a)} · ${Math.round(lit(a)*100)}% lit</text>`;
  // 29.5 day strip
  const y=H-14;o+=`<line x1="250" y1="${y}" x2="400" y2="${y}" stroke="var(--rose)"/>`;
  [0,7.38,14.77,22.15,29.53].forEach(d=>{const x=250+150*d/SYN;o+=`<line x1="${x}" y1="${y-4}" x2="${x}" y2="${y+4}" stroke="var(--rose)"/>`});
  o+=`<circle cx="${250+150*a/SYN}" cy="${y}" r="4" fill="var(--sun)" stroke="var(--ink)"/><text class="t-lab" x="250" y="${y-10}">DAY ${a.toFixed(1)} OF 29.5</text>`;
  return o;
}
function drawTide(){
  const W=420,H=260,e=elong(t),p=tidePull(e);let o=`<rect width="${W}" height="${H}" fill="var(--chalk)"/>`;
  o+=`<text class="t-lab" x="14" y="22">TIDE RANGE THROUGH THE MONTH (RELATIVE)</text>`;
  // curve
  const x0=24,x1=W-24,ym=150,amp=60;let d="";
  for(let i=0;i<=120;i++){const ee=i/120*360,x=x0+(x1-x0)*i/120,yy=ym-amp*(tidePull(ee)-1)/.46*.9;d+=(i?"L":"M")+x+","+yy}
  o+=`<line x1="${x0}" y1="${ym}" x2="${x1}" y2="${ym}" stroke="var(--line)"/><path d="${d}" fill="none" stroke="var(--sea)" stroke-width="2"/>`;
  [["New",0],["1st qtr",90],["Full",180],["Last qtr",270],["New",360]].forEach(([n,ee])=>{const x=x0+(x1-x0)*ee/360;
    o+=`<line x1="${x}" y1="${ym+70}" x2="${x}" y2="${ym+76}" stroke="var(--rose)"/><text class="t-lab" x="${x}" y="${ym+90}" text-anchor="middle">${n.toUpperCase()}</text>`});
  o+=`<text class="t-lab" x="${x0}" y="${ym-amp-6}">SPRING</text><text class="t-lab" x="${x0+(x1-x0)/4}" y="${ym+amp+4}" text-anchor="middle">NEAP</text>`;
  const cxp=x0+(x1-x0)*e/360,cyp=ym-amp*(p-1)/.46*.9;
  o+=`<circle cx="${cxp}" cy="${cyp}" r="6" fill="var(--sun)" stroke="var(--ink)" stroke-width="1.3"/><text class="t-big" x="${Math.min(cxp+10,W-110)}" y="${cyp-10}">${Math.round(p*100)}% of average</text>`;
  return o;
}
function drawEclipse(){
  const W=420,H=260,e=elong(t),b=moonLat(t);let o=`<rect width="${W}" height="${H}" fill="var(--chalk)"/>`;
  o+=`<text class="t-lab" x="14" y="22">EDGE-ON VIEW · MOON'S HEIGHT ABOVE OUR ORBIT</text>`;
  const ym=135,sx=40,ex_=240;
  o+=`<line x1="20" y1="${ym}" x2="${W-20}" y2="${ym}" stroke="var(--rose)" stroke-dasharray="3 3"/><text class="t-lab" x="${W-20}" y="${ym-6}" text-anchor="end">EARTH'S ORBIT PLANE</text>`;
  o+=`<circle cx="${sx}" cy="${ym}" r="22" fill="var(--sun)" stroke="var(--ink)"/>`;
  // earth shadow
  o+=`<path d="M${ex_},${ym-16} L${W-20},${ym-6} L${W-20},${ym+6} L${ex_},${ym+16}Z" fill="var(--night)" opacity=".5"/>`;
  o+=`<circle cx="${ex_}" cy="${ym}" r="16" fill="var(--earth)" stroke="var(--ink)"/>`;
  // moon x: between sun and earth at new, behind earth at full
  const mx=ex_-Math.cos(e*D)*95, my=ym-b*14;
  o+=`<line x1="${ex_}" y1="${ym}" x2="${mx}" y2="${my}" stroke="var(--rose)" stroke-width=".8"/>`;
  o+=`<circle cx="${mx}" cy="${my}" r="7" fill="var(--moon)" stroke="var(--ink)" opacity="${Math.abs(Math.sin(e*D))>.35?.45:1}"/>`;
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
StudyKit.mount({kupu:KUPU,
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