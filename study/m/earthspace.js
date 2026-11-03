(()=>{
// The Earth & Space machine: one Blender-built scene (assets/models/earthspace/build_earthspace.py) for the Year 9
// topic list "types of stars, distances in space, the Earth, Moon and Sun and their interactions".
// Five plain steps: stars, distances, day/night and seasons, the Moon's phases, tides and eclipses.
// The 3D scene (earthspace-scene.js) is lit by a real point light at the Sun, so day and night, phases and eclipse
// shadows are actual lighting, not drawings. Every number here is a rounded, well-documented figure.
const fmt=(x,d=0)=>Number(x).toLocaleString("en-NZ",{maximumFractionDigits:d,minimumFractionDigits:d});
const esc=t=>String(t??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
const FONT="'Instrument Sans',Helvetica,Arial,sans-serif",MONO="'IBM Plex Mono',Menlo,monospace";
const C={sky:"#0B1026",sky2:"#16204A",ink:"#240B21",paper:"#FFFDFB",chalk:"#F5F1F2",muted:"#654A4E",rose:"#916A70",line:"#E4D9DE",star:"#F4F1FF",sea:"#1B5E86",land:"#5C7A3A",sun:"#FFD27A",coral:"#E8606A"};
const T=(x,y,t,o={})=>`<text x="${x}" y="${y}" font-family="${o.mono?MONO:FONT}" font-size="${o.s||14}" font-weight="${o.w||400}" fill="${o.c||C.star}" text-anchor="${o.a||"start"}"${o.op?` opacity="${o.op}"`:""}>${esc(t)}</text>`;
const RM=matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- 1. Types of stars. Colour tells you the surface temperature: red is coolest, blue is hottest.
const STARS=[
 {id:"red",node:"STAR_RED_DWARF",n:"Red dwarf",col:"#FF8A5B",temp:"about 3,000 °C",tempN:3000,size:"about 0.1 to 0.6 times the Sun's width",r:.38,
  life:"trillions of years: longer than the universe has existed so far",end:"slowly fades; none has had time to die yet",eg:"Proxima Centauri, the nearest star to the Sun",fact:"About three in every four stars in the Milky Way are red dwarfs."},
 {id:"sun",node:"STAR_SUN",n:"Yellow dwarf (our Sun)",col:"#FFD27A",temp:"about 5,500 °C",tempN:5500,size:"1 × (1.4 million km wide)",r:.8,
  life:"about 10 billion years in total; it is about 4.6 billion years old now",end:"swells into a red giant, then leaves a white dwarf",eg:"the Sun, Tamanuiterā",fact:"A medium-sized, medium-hot star: about halfway through its life."},
 {id:"blue",node:"STAR_BLUE_GIANT",n:"Blue giant",col:"#9DB8FF",temp:"about 20,000 °C or more",tempN:20000,size:"about 5 to 10 times wider than the Sun",r:1.6,
  life:"only a few million to tens of millions of years",end:"explodes as a supernova, leaving a neutron star or a black hole",eg:"Spica, the brightest star in Virgo",fact:"The biggest, hottest stars use their fuel fastest, so they live the shortest lives."},
 {id:"rgiant",node:"STAR_RED_GIANT",n:"Red giant",col:"#FF9D6E",temp:"about 3,500 °C",tempN:3500,size:"about 10 to 100 times wider than the Sun",r:2.4,
  life:"a late stage of a Sun-like star's life",end:"puffs its outer layers into a glowing cloud (a planetary nebula); the core is left as a white dwarf",eg:"Aldebaran, the orange eye of Taurus",fact:"In about 5 billion years the Sun will become a red giant."},
 {id:"super",node:"STAR_SUPERGIANT",n:"Red supergiant",col:"#FF6E48",temp:"about 3,500 °C",tempN:3500,size:"hundreds of times wider than the Sun (Betelgeuse is roughly 700 times; estimates vary)",r:3.6,
  life:"a short final stage of a very massive star",end:"explodes as a supernova",eg:"Betelgeuse, in Orion",fact:"If Betelgeuse took the Sun's place, it would reach past the orbit of Mars."},
 {id:"white",node:"STAR_WHITE_DWARF",n:"White dwarf",col:"#E8F0FF",temp:"about 10,000 °C or more when young",tempN:10000,size:"about the size of the Earth: about 1/100 of the Sun's width",r:.14,
  life:"cools down slowly over billions of years",end:"it is already the end: the leftover core of a Sun-like star",eg:"Sirius B, the tiny partner of Sirius (Takurua), the brightest star in the night sky",fact:"A teaspoon of white dwarf would weigh several tonnes."}];
const starNow=()=>STARS.find(x=>x.id===s.star)||STARS[1];

// ---------- 2. Distances in space, with how long light takes to cross them. Light travels about 300,000 km every second.
const LY=9.461e12,AU=1.496e8;
const DIST=[
 {id:"moon",n:"The Moon",km:384400,light:"1.3 seconds",lightS:1.28,unit:()=>`${fmt(384400)} km`,note:"The only other world people have walked on."},
 {id:"sun",n:"The Sun",km:1.496e8,light:"8 minutes 20 seconds",lightS:499,unit:()=>"1 AU (about 150 million km)",note:"You always see the Sun as it was about 8 minutes ago."},
 {id:"neptune",n:"Neptune",km:4.5e9,light:"about 4 hours",lightS:14400,unit:()=>"about 30 AU",note:"The farthest planet from the Sun."},
 {id:"proxima",n:"Proxima Centauri",km:4.0e13,light:"about 4.2 years",lightS:4.2*3.156e7,unit:()=>"about 4.2 light-years",note:"The nearest star after the Sun, close to Alpha Centauri, one of the Pointers to the Southern Cross. Too faint to see without a telescope."},
 {id:"centre",n:"Centre of the Milky Way",km:2.6e4*LY,light:"about 26,000 years",lightS:2.6e4*3.156e7,unit:()=>"about 26,000 light-years",note:"Our galaxy is about 100,000 light-years across, with hundreds of billions of stars."},
 {id:"andromeda",n:"The Andromeda Galaxy",km:2.5e6*LY,light:"about 2.5 million years",lightS:2.5e6*3.156e7,unit:()=>"about 2.5 million light-years",note:"One of the most distant things you can see without a telescope (low in the northern sky from New Zealand)."}];
const kmWords=km=>km<1e6?`${fmt(km)} km`:km<1e9?`${fmt(km/1e6)} million km`:km<1e12?`${fmt(km/1e9,1)} billion km`:km<1e15?`${fmt(km/1e12)} trillion km`:km<1e18?`${fmt(km/1e15)} thousand trillion km`:`${fmt(km/1e18)} million trillion km`;

// ---------- 3. Day, night and seasons in Wellington (41.3° S). Simple solar formulas; good to a few minutes.
const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
const MIDDAY=[15,46,74,105,135,166,196,227,258,288,319,349],LAT=-41.3*Math.PI/180;
const decl=m=>-23.44*Math.cos(2*Math.PI*(MIDDAY[m]+10)/365)*Math.PI/180;
const dayLen=m=>24/Math.PI*Math.acos(Math.max(-1,Math.min(1,-Math.tan(LAT)*Math.tan(decl(m)))));
const noonAlt=m=>90-Math.abs(LAT-decl(m))*180/Math.PI;
const sunAlt=(m,h)=>Math.asin(Math.sin(LAT)*Math.sin(decl(m))+Math.cos(LAT)*Math.cos(decl(m))*Math.cos((h-12)*15*Math.PI/180))*180/Math.PI;
const season=m=>["summer","summer","autumn","autumn","autumn","winter","winter","winter","spring","spring","spring","summer"][m];
const hm=h=>`${Math.floor(h)} h ${String(Math.round((h%1)*60)).padStart(2,"0")} min`;
const clock=h=>{const hh=Math.floor(h)%24,mm=Math.round((h%1)*60);return `${hh===0?12:hh>12?hh-12:hh}:${String(mm).padStart(2,"0")} ${hh<12?"am":"pm"}`};

// ---------- 4. The Moon. Phase names as seen from New Zealand: in the Southern Hemisphere a waxing Moon is lit on the LEFT.
const LUNAR=29.53;
const phase=a=>{const d=((a%LUNAR)+LUNAR)%LUNAR;return d<1?"New moon":d<6.4?"Waxing crescent":d<8.4?"First quarter":d<13.8?"Waxing gibbous":d<15.8?"Full moon":d<21.1?"Waning gibbous":d<23.1?"Last quarter":d<28.5?"Waning crescent":"New moon"};
const lit=a=>(1-Math.cos(2*Math.PI*a/LUNAR))/2;
const tideKind=a=>{const d=((a%LUNAR)+LUNAR)%LUNAR,k=Math.abs(Math.cos(4*Math.PI*d/LUNAR));return k>.7?"spring tides (biggest range)":k<.35?"neap tides (smallest range)":"in between"};
const eclipseNow=()=>{const d=((s.moonDay%LUNAR)+LUNAR)%LUNAR;if(!s.lined)return null;if(d<.6||d>LUNAR-.6)return "solar";if(Math.abs(d-LUNAR/2)<.6)return "lunar";return null};

// ---------- state
const s={view:"stars",star:"sun",far:1,pulse:-1,month:11,hour:14,moonDay:7.4,ev:"tides",lined:false,spin:true};
const viewNow=()=>s.view;

// ---------- 2D drawings (shown when 3D can't load, and on phones in lite mode). 800 × 420.
const BG=()=>`<rect width="800" height="420" rx="14" fill="${C.sky}"/>`+Array.from({length:70},(_,i)=>`<circle cx="${(i*137.5)%800}" cy="${(i*71.3)%420}" r="${i%7?0.8:1.4}" fill="#fff" opacity="${.35+((i*13)%10)/20}"/>`).join("");
const DRAW={
 stars(){const x0=70;let x=x0,g=BG()+T(400,40,"Six types of star · sizes squashed so they fit",{s:15,w:600,a:"middle",c:"#C9C6E6"});
   STARS.forEach((st,i)=>{const r=Math.max(5,st.r*22),cx=x+r;g+=`<circle cx="${cx}" cy="210" r="${r+8}" fill="${st.col}" opacity=".18"/><circle cx="${cx}" cy="210" r="${r}" fill="${st.col}" ${st.id===s.star?`stroke="#fff" stroke-width="3"`:""}/>`+T(cx,210+r+28,st.n.replace(" (our Sun)",""),{s:12,a:"middle",w:st.id===s.star?700:400});x=cx+r+34});
   const st=starNow();return g+T(400,380,`${st.n}: ${st.temp}, ${st.size.split("(")[0].trim()}`,{s:15,a:"middle",w:600})},
 distance(){const d=DIST[s.far];let g=BG()+T(400,40,"Each step along the line is roughly 10 to 1,000 times further",{s:15,w:600,a:"middle",c:"#C9C6E6"});
   const X=k=>60+(Math.log10(k)-5)/(19.6-5)*680;g+=`<line x1="40" y1="220" x2="760" y2="220" stroke="#5B6496" stroke-width="2"/><circle cx="40" cy="220" r="10" fill="${C.sea}"/>`+T(40,250,"Earth",{s:12,a:"middle"});
   DIST.forEach((p,i)=>{const x=X(p.km);g+=`<circle cx="${x}" cy="220" r="${i===s.far?9:5}" fill="${i===s.far?C.sun:"#C9C6E6"}"/>`+T(x,i%2?262:196,p.n.replace("The ",""),{s:12,a:"middle",w:i===s.far?700:400})});
   return g+T(400,340,`${d.n}: ${kmWords(d.km)}`,{s:18,w:700,a:"middle"})+T(400,370,`Light takes ${d.light} to get here`,{s:15,a:"middle",c:C.sun})},
 day(){let g=BG();const R=130,cx=400,cy=225;g+=`<ellipse cx="${cx}" cy="${cy}" rx="${R*1.9}" ry="${R*.55}" fill="none" stroke="#5B6496" stroke-dasharray="4 6"/><circle cx="${cx}" cy="${cy}" r="34" fill="${C.sun}"/>`;
   const th=Math.PI+2*Math.PI*(MIDDAY[s.month]-172)/365.25,ex=cx+Math.cos(th)*R*1.9,ey=cy-Math.sin(th)*R*.55;
   g+=`<g transform="translate(${ex},${ey}) rotate(${-23.4})"><circle r="24" fill="${C.sea}"/><path d="M0,-24 a24,24 0 0 ${ex>cx?0:1} 0,48z" fill="#000" opacity=".55"/><line y1="-36" y2="36" stroke="#fff" stroke-width="2"/></g>`;
   return g+T(400,44,`${MONTHS[s.month]}: ${season(s.month)} in New Zealand`,{s:18,w:700,a:"middle"})+T(400,396,`Wellington daylight ${hm(dayLen(s.month))} · noon Sun ${fmt(noonAlt(s.month))}° above the horizon`,{s:14,a:"middle",c:"#C9C6E6"})},
 moon(){let g=BG();const cx=400,cy=215,R=120,ang=2*Math.PI*s.moonDay/LUNAR,mx=cx+Math.cos(ang)*R,my=cy-Math.sin(ang)*R;
   g+=`<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#5B6496" stroke-dasharray="4 6"/><circle cx="${cx}" cy="${cy}" r="30" fill="${C.sea}"/><path d="M${cx},${cy-30} a30,30 0 0 0 0,60z" fill="#000" opacity=".55"/>`+T(cx,cy+50,"Earth",{s:12,a:"middle"})+T(770,40,"← Sunlight from this side",{s:13,a:"end",c:C.sun});
   g+=`<circle cx="${mx}" cy="${my}" r="14" fill="#3A3C48"/><path d="M${mx},${my-14} a14,14 0 0 1 0,28z" fill="#E8E6DE"/>`;
   return g+T(400,396,`Day ${fmt(s.moonDay,1)} · ${phase(s.moonDay)} · ${fmt(lit(s.moonDay)*100)}% of the face lit`,{s:16,w:600,a:"middle"})},
 eclipse(){let g=BG()+`<circle cx="120" cy="210" r="60" fill="${C.sun}"/>`+T(120,300,"Sun",{s:13,a:"middle"});const e=eclipseNow(),d=((s.moonDay%LUNAR)+LUNAR)%LUNAR;
   const ex=520,mx=ex+Math.cos(Math.PI-2*Math.PI*d/LUNAR)*120,my=210-Math.sin(Math.PI-2*Math.PI*d/LUNAR)*60+(s.lined?0:-18*Math.cos(2*Math.PI*d/LUNAR));
   g+=`<circle cx="${ex}" cy="210" r="34" fill="${C.sea}"/><circle cx="${mx}" cy="${my}" r="10" fill="${e==="lunar"?"#A0402A":"#BDBDB8"}"/>`;
   if(s.ev==="tides")g+=`<ellipse cx="${ex}" cy="210" rx="48" ry="38" fill="#5AA9E6" opacity=".35" transform="rotate(${-Math.atan2(210-my,mx-ex)*180/Math.PI} ${ex} 210)"/>`;
   return g+T(400,40,s.ev==="tides"?`Tides: ${tideKind(s.moonDay)}`:e?`${e==="solar"?"Solar":"Lunar"} eclipse`:"No eclipse right now",{s:18,w:700,a:"middle"})}};
DRAW.test=()=>DRAW[s.view==="test"?"stars":s.view]();

// ---------- the close-up card: what you'd actually see, or the key facts for this step. 420 × 260.
function drawClose(){const v=s.view;let g=`<rect width="420" height="260" rx="14" fill="${C.sky2}"/>`;
  if(v==="stars"||v==="test"){const st=starNow();g+=`<circle cx="80" cy="130" r="56" fill="${st.col}" opacity=".25"/><circle cx="80" cy="130" r="40" fill="${st.col}"/>`+T(150,58,st.n,{s:18,w:700})+T(150,88,`Surface ${st.temp}`,{s:13})+T(150,112,`Size ${st.size.split("(")[0].trim()}`,{s:13})+T(150,136,`Lives ${st.life.split(":")[0]}`,{s:13})+T(150,160,`Ends: ${st.end.split(",")[0].split(";")[0]}`,{s:13})+T(150,196,`e.g. ${st.eg.split(",")[0]}`,{s:12,c:"#C9C6E6",mono:true});
    const k=(Math.log10(st.tempN)-3.4)/(4.4-3.4);g+=`<defs><linearGradient id="tg"><stop offset="0" stop-color="#FF6E48"/><stop offset=".45" stop-color="#FFD27A"/><stop offset="1" stop-color="#9DB8FF"/></linearGradient></defs><rect x="150" y="216" width="240" height="10" rx="5" fill="url(#tg)"/><circle cx="${150+Math.max(0,Math.min(1,k))*240}" cy="221" r="8" fill="#fff" stroke="${C.ink}"/>`+T(150,246,"cooler",{s:11,c:"#C9C6E6"})+T(390,246,"hotter",{s:11,c:"#C9C6E6",a:"end"});return g}
  if(v==="distance"){const d=DIST[s.far];return g+T(24,50,d.n,{s:20,w:700})+T(24,84,kmWords(d.km),{s:15})+T(24,110,d.unit(),{s:15})+T(24,146,`Light takes ${d.light}`,{s:16,w:600,c:C.sun})+`<foreignObject x="24" y="164" width="372" height="80"><div xmlns="http://www.w3.org/1999/xhtml" style="font:13px ${FONT};color:#DCD8F2;line-height:1.4">${esc(d.note)}</div></foreignObject>`}
  if(v==="day"){const a=sunAlt(s.month,s.hour),day=a>0;g+=`<rect x="24" y="24" width="372" height="150" rx="10" fill="${day?"#7FB3E0":"#0B1026"}"/>`;
    const sx=24+((s.hour%24)/24)*372,sy=174-Math.max(-20,a)*1.4;if(day)g+=`<circle cx="${sx}" cy="${sy}" r="14" fill="${C.sun}"/>`;else g+=Array.from({length:18},(_,i)=>`<circle cx="${30+(i*61)%360}" cy="${34+(i*37)%120}" r="1.2" fill="#fff"/>`).join("");
    g+=`<path d="M24,174 q90,-26 186,-6 t186,-4 v16 h-372z" fill="#3B5A2E"/>`;
    return g+T(24,200,`Wellington, ${clock(s.hour)} (sun time) · ${MONTHS[s.month]}`,{s:14,w:600})+T(24,224,day?`Day: the Sun is ${fmt(a)}° above the horizon`:"Night: Wellington faces away from the Sun",{s:13})+T(24,246,`Daylight today: ${hm(dayLen(s.month))}`,{s:13,c:"#C9C6E6"})}
  if(v==="moon"){const a=((s.moonDay%LUNAR)+LUNAR)%LUNAR,f=lit(a),waxing=a<LUNAR/2,r=70,cx=110,cy=130;
    // as seen from New Zealand: waxing = lit on the left
    const k=1-2*f,side=waxing?0:1;g+=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="#2A2C3A"/>`;
    const sweep=k<0?side:1-side;g+=f<.01?"":f>.99?`<circle cx="${cx}" cy="${cy}" r="${r}" fill="#E8E6DE"/>`:`<path d="M${cx},${cy-r} A${r},${r} 0 0 ${side} ${cx},${cy+r} A${Math.abs(k)*r},${r} 0 0 ${sweep} ${cx},${cy-r}z" fill="#E8E6DE"/>`;
    return g+T(220,60,"From New Zealand",{s:12,c:"#C9C6E6",mono:true})+T(220,92,phase(a),{s:20,w:700})+T(220,122,`${fmt(f*100)}% of the face lit`,{s:14})+T(220,148,`Day ${fmt(a,1)} of 29.5`,{s:14})+T(220,190,waxing?"Waxing: lit side growing":"Waning: lit side shrinking",{s:13,c:"#C9C6E6"})+T(220,212,"(in NZ the lit side is",{s:12,c:"#C9C6E6"})+T(220,230,"the mirror of the UK view)",{s:12,c:"#C9C6E6"})}
  if(v==="eclipse"){const e=eclipseNow();if(s.ev==="tides")return g+T(24,52,"Tides today",{s:20,w:700})+T(24,86,tideKind(s.moonDay),{s:15,c:C.sun})+T(24,122,"Two high tides about every 24 h 50 min:",{s:13})+T(24,144,"one bulge under the Moon, one on the far side.",{s:13})+T(24,180,"Spring tides: new and full moon (Sun and Moon line up).",{s:12,c:"#C9C6E6"})+T(24,202,"Neap tides: first and last quarter (at right angles).",{s:12,c:"#C9C6E6"});
    return g+T(24,52,e?`${e==="solar"?"Solar":"Lunar"} eclipse`:"No eclipse",{s:20,w:700})+T(24,86,e==="solar"?"The Moon is between the Sun and Earth: its shadow falls on Earth.":e==="lunar"?"Earth is between the Sun and Moon: the Moon goes red in Earth's shadow.":s.lined?"Line up a new moon (solar) or a full moon (lunar).":"The Moon's orbit is tilted about 5°, so it passes above or below.",{s:12})+T(24,124,`${phase(s.moonDay)} · orbits ${s.lined?"lined up":"not lined up"}`,{s:14,c:C.sun})+T(24,170,"Solar eclipses only happen at new moon,",{s:12,c:"#C9C6E6"})+T(24,190,"lunar eclipses only at full moon, and only when",{s:12,c:"#C9C6E6"})+T(24,210,"the Moon crosses Earth's orbital plane.",{s:12,c:"#C9C6E6"})}
  return g}

// ---------- steps
const steps=[
 {k:"stars",lab:"Types of stars",cap:"Pick a star. Its colour tells you how hot it is; its size tells you what stage of life it's at.",big:"<b>Colour shows temperature</b>: red stars are the coolest, yellow in the middle, blue the hottest. Big, hot stars live <b>short</b> lives; small red dwarfs live the longest.",trap:"Thinking red means hot (like a stove). For stars, red is the <b>coolest</b> colour and blue is the hottest.",exam:()=>{const t=starNow();return `A ${t.n.replace(" (our Sun)","").toLowerCase()} has a surface temperature of ${t.temp} and is ${t.size.split("(")[0].trim()}. It ${t.end.split(";")[0]}.`},chips:["star","temp","size","life"],controls:["star"]},
 {k:"distance",lab:"Distances in space",cap:"Slide outwards from Earth, then send a pulse of light and see how long it takes.",big:"A <b>light-year</b> is a <b>distance</b>: how far light travels in a year, about 9.5 trillion km. An <b>astronomical unit</b> (AU) is the Earth–Sun distance, about 150 million km.",trap:"A light-year is not a time. It measures distance, even though it has “year” in it.",exam:()=>{const d=DIST[s.far];return `${d.n} is ${d.unit()} away, so its light takes ${d.light} to reach us: we see it as it was, not as it is now.`},chips:["place","km","light"],controls:["far","pulse"]},
 {k:"day",lab:"Day, night and seasons",cap:"Change the time to spin the Earth, and the month to move it around the Sun. Watch the pin on Aotearoa.",big:"<b>Day and night</b>: the Earth spins once every 24 hours. <b>Seasons</b>: the Earth's axis is tilted 23.4°, so for half the year the Southern Hemisphere leans towards the Sun (summer) and for half it leans away (winter).",trap:"Seasons are <b>not</b> caused by the Earth getting closer to the Sun. Earth is actually closest in early January, but it's winter in the UK then.",exam:()=>`In ${MONTHS[s.month]} the Southern Hemisphere is ${({summer:"tilted towards",winter:"tilted away from",autumn:"turning away from",spring:"turning towards"})[season(s.month)]} the Sun, so New Zealand has ${season(s.month)}, with about ${hm(dayLen(s.month))} of daylight in Wellington.`,chips:["season","daylen","now"],controls:["month","hour"]},
 {k:"moon",lab:"The Moon's phases",cap:"Move the Moon around the Earth. The card shows the Moon as you'd see it from New Zealand.",big:"<b>Half the Moon is always lit</b> by the Sun. The phases are how much of that lit half we can see from Earth as the Moon orbits, about every 29.5 days.",trap:"Phases are <b>not</b> caused by the Earth's shadow. (That's a lunar eclipse, and it only happens at full moon.)",exam:()=>`At day ${fmt(s.moonDay,0)} the Moon is a ${phase(s.moonDay).toLowerCase()}: we see ${fmt(lit(s.moonDay)*100)}% of its sunlit half from Earth.`,chips:["phase","lit","nzview"],controls:["moonDay"]},
 {k:"eclipse",lab:"Tides and eclipses",cap:"Choose tides or an eclipse, then move the Moon. Most months the Moon's tilted orbit misses; line the orbits up to get an eclipse.",big:"<b>Tides</b>: the Moon's gravity pulls the oceans into two bulges. <b>Solar eclipse</b>: the Moon blocks the Sun (new moon). <b>Lunar eclipse</b>: Earth's shadow covers the Moon (full moon).",trap:"Expecting an eclipse every month. The Moon's orbit is tilted about 5°, so usually it passes just above or below the line.",exam:()=>s.ev==="tides"?`At a ${phase(s.moonDay).toLowerCase()} New Zealand gets ${tideKind(s.moonDay).split(" (")[0]}, because the Sun and Moon are ${tideKind(s.moonDay).startsWith("spring")?"lined up and pull together":"at right angles and partly cancel"}.`:s.ev==="solar"?"In a solar eclipse the Moon passes between the Sun and Earth, and its shadow falls on part of Earth. It can only happen at new moon.":"In a lunar eclipse Earth passes between the Sun and the Moon, and Earth's shadow falls on the Moon. It can only happen at full moon.",chips:["event","phase","tide"],controls:["ev","moonDay","lined"]},
 {k:"test",lab:"Test yourself",cap:"Seven challenges across the whole topic. Use the controls, then press Check.",chips:["star","place","season","phase","event"],controls:["star","far","month","hour","moonDay","ev","lined"]}];

const KUPU=[{mi:"whetū",en:"star",ta:10293},{mi:"rā",en:"sun",ta:6405},{mi:"whānau a Tamanuiterā",en:"solar system",ta:13026},{mi:"tau aho",en:"light year",ta:40314},{mi:"pou tāwhirowhiro",en:"axis of rotation",ta:40009},{mi:"kaupeka",en:"season",ta:2441},{mi:"marama",en:"moon",ta:3673,note:"Also means month."},{mi:"mata o te marama",en:"phases of the moon",ta:39883},{mi:"tai pari",en:"high tide",ta:40275},{mi:"tai timu",en:"low tide",ta:7187},{mi:"āraitanga",en:"eclipse",ta:347},{mi:"tō ā-papa",en:"gravity",ta:12845},{mi:"Takurua",en:"Sirius",ta:7316}];
Object.entries({stars:["whetū","rā","Takurua"],distance:["tau aho","whānau a Tamanuiterā"],day:["pou tāwhirowhiro","kaupeka","rā"],moon:["marama","mata o te marama"],eclipse:["tai pari","tai timu","āraitanga","tō ā-papa"]}).forEach(([k,a])=>{const st=steps.find(x=>x.k===k);if(st)st.kupu=a});

// ---------- practice questions: written for this machine in the style of a Year 9 science test, not real exam questions
const QUESTIONS=[
 {step:"stars",q:"Describe two differences between a red dwarf star and a blue giant star."},
 {step:"stars",q:"Explain why stars are different colours, and what the colour tells us about a star."},
 {step:"stars",q:"Our Sun is a yellow dwarf. Describe what will happen to the Sun at the end of its life."},
 {step:"distance",q:"What is a light-year? Explain why astronomers use light-years instead of kilometres for distances to stars."},
 {step:"distance",q:"Light from the Sun takes about 8 minutes to reach Earth. Explain what this means about the Sun we see in the sky."},
 {step:"distance",q:"Proxima Centauri is about 4.2 light-years away. If it suddenly stopped shining today, when would we notice? Explain."},
 {step:"day",q:"Explain what causes day and night on Earth."},
 {step:"day",q:"Explain why New Zealand has summer in December while the United Kingdom has winter."},
 {step:"day",q:"Wellington has about 15 hours of daylight in December but only about 9 hours in June. Explain why."},
 {step:"moon",q:"Explain why we see different phases of the Moon. Use a labelled diagram of the Sun, Earth and Moon."},
 {step:"moon",q:"Draw what a first quarter Moon looks like from New Zealand, and show where the Moon is in its orbit."},
 {step:"eclipse",q:"Describe the difference between a solar eclipse and a lunar eclipse. Explain why eclipses don't happen every month."},
 {step:"eclipse",q:"Explain how the Moon causes two high tides each day, and why spring tides happen at new and full moon."}];
const QB_KEY="earthspace-questions-v1";let ADDED=[];try{ADDED=JSON.parse(localStorage.getItem(QB_KEY)||"[]")}catch(e){}

const sel=(id,label,options,get,set)=>({type:"select",id,label,options,get,set});
let API;
API=StudyKit.mount({kupu:KUPU,scene3d:earthspace3d,
  eyebrow:"Science · Earth and space", title:"The Earth & Space machine", crumb:"Types of stars, distances in space, and the Earth, Moon and Sun: day and night, seasons, the Moon's phases, tides and eclipses", homeHash:"y9",
  fig:"FIG. 22 · EARTH, MOON, SUN AND STARS", railTitle:"Stars, distances, Earth, Moon and Sun",
  badge:{label:"Year 9 science"},
  mainBox:"0 0 800 420", mainPhoneBig:true, mainLabel:"A realistic 3D Earth with NASA imagery and city lights at night, the Moon and Sun, made in Blender, with six types of star and a ruler out to the Andromeda Galaxy", closeBox:"0 0 420 260",
  state:s, steps,
  onStep:(x,stp)=>{if(stp.k!=="test")s.view=stp.k},
  controls:[
    sel("star","Star",STARS.map(x=>[x.id,x.n]),()=>s.star,(x,v)=>{s.star=v;s.view="stars"}),
    {type:"range",id:"far",label:"How far out",min:0,max:5,step:1,get:()=>s.far,set:(x,v)=>{s.far=v;s.view="distance";s.pulse=-1},fmt:()=>DIST[s.far].n},
    {type:"button",id:"pulse",label:"✦ Send a pulse of light",onClick:()=>{s.pulse=performance.now();s.view="distance"}},
    {type:"range",id:"month",label:"Month",min:0,max:11,step:1,get:()=>s.month,set:(x,v)=>{s.month=v;s.view="day"},fmt:()=>MONTHS[s.month]},
    {type:"range",id:"hour",label:"Time of day in Wellington",min:0,max:24,step:.5,get:()=>s.hour,set:(x,v)=>{s.hour=v;s.view="day"},fmt:()=>clock(s.hour)},
    {type:"range",id:"moonDay",label:"Days since new moon",min:0,max:29.5,step:.25,get:()=>s.moonDay,set:(x,v)=>{s.moonDay=v;if(s.view!=="eclipse")s.view="moon"},fmt:()=>`${fmt(s.moonDay,1)} · ${phase(s.moonDay)}`},
    sel("ev","Show",[["tides","Tides"],["solar","Solar eclipse"],["lunar","Lunar eclipse"]],()=>s.ev,(x,v)=>{s.ev=v;s.view="eclipse";if(v==="solar"){s.moonDay=0;s.lined=true}if(v==="lunar"){s.moonDay=14.75;s.lined=true}}),
    {type:"toggle",id:"lined",label:"Orbits lined up",labelFn:()=>s.lined?"Orbits lined up":"Moon's orbit tilted 5°",get:()=>s.lined,set:(x,v)=>{s.lined=v;s.view="eclipse"}}],
  drawMain:()=>DRAW[viewNow()](),
  drawClose,
  chips:()=>{const st=starNow(),d=DIST[s.far],a=sunAlt(s.month,s.hour),e=eclipseNow();
    return{star:["STAR",st.n.replace(" (our Sun)","")],temp:["SURFACE",st.temp.replace("about ",""),true],size:["SIZE",st.size.split("(")[0].replace("about ","").trim()],life:["LIFETIME",st.life.split(":")[0].split(";")[0]],
      place:["PLACE",d.n.replace("The ","")],km:["DISTANCE",kmWords(d.km)],light:["LIGHT TAKES",d.light,true],
      season:["NZ SEASON",`${season(s.month)} · ${MONTHS[s.month]}`,true],daylen:["DAYLIGHT",hm(dayLen(s.month))],now:["WELLINGTON",a>0?`day · Sun ${fmt(a)}° up`:"night"],
      phase:["PHASE",phase(s.moonDay),true],lit:["LIT",`${fmt(lit(s.moonDay)*100)}%`],nzview:["FROM NZ",s.moonDay%LUNAR<LUNAR/2?"lit on the left":"lit on the right"],
      event:["NOW",s.ev==="tides"?"tides":e?`${e} eclipse`:"no eclipse",!!e],tide:["TIDES",tideKind(s.moonDay).split(" (")[0]]}},
  challenges:[
    {q:"Show the hottest type of star.",check:()=>s.star==="blue",ok:"Yes: blue giants are the hottest, about 20,000 °C or more on the surface.",no:"Hot stars aren't red. Think about the colour of the hottest part of a flame."},
    {q:"Show the kind of star the Sun will end its life as.",check:()=>s.star==="white",ok:"Yes: after it has been a red giant, the Sun will leave its core behind as a white dwarf, about the size of the Earth.",no:"Not that one. What's left when a Sun-like star has puffed off its outer layers?"},
    {q:"Go to the place whose light takes about 8 minutes to reach us.",check:()=>s.far===1,ok:"Yes: sunlight takes about 8 minutes 20 seconds, so we always see the Sun as it was 8 minutes ago.",no:()=>`${DIST[s.far].n}: light takes ${DIST[s.far].light}. Try somewhere nearer or further.`},
    {q:"Go to the nearest star after the Sun.",check:()=>s.far===3,ok:"Yes: Proxima Centauri, about 4.2 light-years away (about 40 trillion km).",no:"That's not a single star. Look for the one measured in a few light-years."},
    {q:"Set the month when Wellington has its shortest days.",check:()=>s.month===5,ok:()=>`Yes: June, with about ${hm(dayLen(5))} of daylight. The Southern Hemisphere is tilted away from the Sun.`,no:()=>`${MONTHS[s.month]} has ${hm(dayLen(s.month))}. Find a shorter day.`},
    {q:"Show a first quarter moon.",check:()=>phase(s.moonDay)==="First quarter",ok:"Yes: half the face is lit. From New Zealand the lit half is on the left.",no:()=>`That's a ${phase(s.moonDay).toLowerCase()}. A first quarter comes about a week after new moon.`},
    {q:"Set up a lunar eclipse.",check:()=>eclipseNow()==="lunar",ok:"Yes: Sun, Earth and Moon in a line, with the Earth in the middle, at full moon.",no:()=>!s.lined?"The orbits need to line up first.":"Which phase must the Moon be at for the Earth to sit between it and the Sun?"}],
  papers:[{label:"NZQA past exams: Earth and Space Science (NCEA, for later years)",url:"https://www2.nzqa.govt.nz/ncea/subjects/past-exams-and-exemplars/"}],
  truth:"Sizes and distances in the 3D scene are squashed so everything fits on one screen: the real Sun is about 109 times wider than Earth and 150 million km away, and the Moon is 30 Earth-widths away. Star colours, temperatures, sizes and lifetimes are rounded textbook figures; real stars vary. The Earth's surface and its city lights are NASA images (Blue Marble and Black Marble, public domain); the clouds and the Moon and Sun surfaces are generated, not photographed. Day length is for Wellington, from a simple formula (within a few minutes), using sun time rather than clock time.",
  footer:"Covers Year 9 Earth and space: types of stars (colour, temperature, size, lifetime, life cycle), distances in space (km, astronomical units and light-years, light travel time), day and night, seasons and the tilted axis, the Moon's phases as seen from New Zealand, tides (spring and neap) and solar and lunar eclipses."
});

// ---------- the practice question bank. Allen can add to it (study/tutor.js, add_question).
const bank={list:()=>[...QUESTIONS,...ADDED.map(x=>({...x,added:true}))],
  add(q){const item={step:steps.some(x=>x.k===q.step&&x.k!=="test")?q.step:"",q:String(q.question||"").replace(/[<>]/g,"").slice(0,900)};if(item.q.length<10)return null;ADDED.push(item);ADDED=ADDED.slice(-30);try{localStorage.setItem(QB_KEY,JSON.stringify(ADDED))}catch(e){}paintBank();return item}};
try{window.StudyKit.current.cfg.questionBank=bank}catch(e){}
const host=document.createElement("section");host.className="card qbank";host.setAttribute("aria-labelledby","qb-h");
const qcss=document.createElement("style");qcss.textContent=`.qbank{margin-top:18px}.qbank h3{margin:0 0 4px}.qbank>p{margin:0 0 14px;color:var(--as-muted,#654A4E);font-size:14px}.qbank ol{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.qbank li{border:1px solid var(--as-line,#E4D9DE);border-radius:14px;padding:12px 14px;display:grid;gap:8px}.qbank li b{font:600 11px "IBM Plex Mono",monospace;letter-spacing:.06em;color:#916A70;text-transform:uppercase}.qbank li .acts{display:flex;gap:8px;flex-wrap:wrap}
.qbank li.added{border-style:dashed}.qbank .q{font-size:15px;line-height:1.5}`;document.head.appendChild(qcss);
function paintBank(){const list=bank.list();host.innerHTML=`<h3 id="qb-h">Practice questions</h3><p>Written for this machine in the style of a Year 9 science test, not real exam questions. Open the tool for each one, or work through it with Allen. Ask Allen for more and he'll add them here.</p><ol>${list.map((x,i)=>`<li class="${x.added?"added":""}"><b>${esc((steps.find(st=>st.k===x.step)||{lab:"Earth and space"}).lab)}${x.added?" · added by Allen":""}</b><span class="q">${esc(x.q)}</span><span class="acts">${x.step?`<button class="btn" type="button" data-qopen="${x.step}">Open the tool</button>`:""}<button class="btn primary" type="button" data-qallen="${i}">Work through it with Allen</button></span></li>`).join("")}</ol>`}
paintBank();
(document.querySelector(".card.practise")||document.querySelector(".bench")).insertAdjacentElement("afterend",host);
// ---------- Go further: four of the best free space sites on the web (not made by assembl; they open in a new tab)
const FURTHER=[["NASA's Eyes on the Solar System","https://eyes.nasa.gov/apps/solar-system/","Fly anywhere in the real solar system, with spacecraft where they are right now."],
 ["Stellarium Web","https://stellarium-web.org/","The real night sky in your browser. Set your location to your town and find the Southern Cross, Matariki and the planets tonight."],
 ["NASA Astronomy Picture of the Day","https://apod.nasa.gov/apod/","A new space photo every day, explained by an astronomer."],
 ["The Scale of the Universe","https://htwins.net/scale2/","Zoom from the smallest things to the size of the universe."]];
const further=document.createElement("section");further.className="card further";further.setAttribute("aria-labelledby","gf-h");
further.innerHTML=`<h3 id="gf-h">Go further</h3><p>Four of the best free space sites on the web. They're not made by assembl and open in a new tab.</p><ul>${FURTHER.map(([n,u,d])=>`<li><a href="${u}" target="_blank" rel="noopener">${esc(n)} ↗</a><span>${esc(d)}</span></li>`).join("")}</ul><p class="credit">Earth images: NASA Visible Earth (Blue Marble and Black Marble).</p>`;
const fcss=document.createElement("style");fcss.textContent=`.further{margin-top:18px}.further h3{margin:0 0 4px}.further>p{margin:0 0 12px;color:var(--as-muted,#654A4E);font-size:14px}.further ul{list-style:none;margin:0;padding:0;display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}
.further li{border:1px solid var(--as-line,#E4D9DE);border-radius:14px;padding:12px 14px;display:grid;gap:4px}.further a{font-weight:600;color:var(--as-plum,#240B21)}.further a:focus-visible{outline:2px solid #916A70;outline-offset:2px}.further li span{font-size:14px;color:var(--as-muted,#654A4E);line-height:1.45}
.further .credit{margin:12px 0 0;font:500 11px "IBM Plex Mono",monospace;color:#916A70}`;document.head.appendChild(fcss);
host.insertAdjacentElement("afterend",further);
host.addEventListener("click",e=>{const o=e.target.closest("[data-qopen]"),a=e.target.closest("[data-qallen]");
  if(o){const i=steps.findIndex(x=>x.k===o.dataset.qopen);if(i>=0){API.setStep(i);try{document.querySelector(".bench").scrollIntoView({behavior:RM?"auto":"smooth",block:"start"})}catch(err){}}}
  if(a){const x=bank.list()[+a.dataset.qallen];dispatchEvent(new CustomEvent("allen:ask",{detail:{display:"Work through this practice question with me:\n\n"+x.q,
    text:`Here is a practice question for my Year 9 science test on Earth and space. Work through it with me step by step, and use this machine to show each part (switch to the right step and move the controls: the star, the distance, the month and time, the Moon). Let me try each part before you give the answer.\n\n---\n${x.q}`}}))}});

// ---------- the 3D scene (Blender model, earthspace-scene.js). Lazy, so the lesson works if 3D can't load.
function earthspace3d(S){let world=null;const host3=S.canvas.parentElement,figure=host3.parentElement;host3.style.visibility="hidden";figure.classList.remove("s3-on");
  import("./earthspace-scene.js").then(m=>{world=m.earthspaceScene(S,{state:s,view:viewNow,STARS,DIST,MIDDAY,LUNAR,eclipseNow,phase,dayLen,MONTHS,clock});const r=host3.getBoundingClientRect();world.resize?.(r.width,r.height)}).catch(e=>{host3.style.visibility="hidden";figure.classList.remove("s3-on");console.warn("Earth and space 3D unavailable",e)});
  return {resize(...a){world?.resize?.(...a)},update(...a){world?.update?.(...a)}}}
})();
