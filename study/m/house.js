(()=>{
// The house design machine: an original practice design (a split-level house on a north-facing hillside in Aotearoa) taken
// from site to finished drawings, the way an architecture portfolio board does it: site analysis, a "metamorphosis" of the
// form, floor plans with a legend, a section you slide through the model, and the same house in plan, elevation, isometric
// and perspective. One Blender model (assets/models/house/build_house.py) drives the 3D (house-scene.js); every drawing below
// is computed from the same numbers, so 3D and 2D never disagree. Not a buildable design: no structure, insulation or Code.
const fmt=(x,d=0)=>Number(x).toLocaleString("en-NZ",{maximumFractionDigits:d,minimumFractionDigits:d});
const esc=t=>String(t??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
const FONT="'Instrument Sans',Helvetica,Arial,sans-serif",MONO="'IBM Plex Mono',Menlo,monospace";
const C={ink:"#240B21",paper:"#FFFDFB",chalk:"#F5F1F2",muted:"#654A4E",rose:"#916A70",line:"#E4D9DE",red:"#D2463C",poche:"#2B2228",
  site:"#DCE8D0",siteDk:"#7FA06A",siteLt:"#B4CDA3",water:"#D4E6EE",street:"#DEDAD4",card:"#F6F3EE",timber:"#D8B98F",sun:"#E39B2D",glass:"#BFD8E0",view:"#7FB7E8"};
const T=(x,y,t,o={})=>`<text x="${(+x).toFixed(1)}" y="${(+y).toFixed(1)}" font-family="${o.mono?MONO:FONT}" font-size="${o.s||12}" font-weight="${o.w||400}" fill="${o.c||C.ink}" text-anchor="${o.a||"start"}"${o.ls?` letter-spacing="${o.ls}"`:""}${o.op?` opacity="${o.op}"`:""}${o.rot!=null?` transform="rotate(${o.rot} ${(+x).toFixed(1)} ${(+y).toFixed(1)})"`:""}>${esc(t)}</text>`;
const PT=a=>a.map(p=>p[0].toFixed(1)+","+p[1].toFixed(1)).join(" ");
const PG=(a,fill,o={})=>`<polygon points="${PT(a)}" fill="${fill}"${o.st?` stroke="${o.st}" stroke-width="${o.sw||1}" stroke-linejoin="round"`:""}${o.op!=null?` opacity="${o.op}"`:""}${o.dash?` stroke-dasharray="${o.dash}"`:""}/>`;
const PL=(a,st,sw=1,o={})=>`<polyline points="${PT(a)}" fill="none" stroke="${st}" stroke-width="${sw}" stroke-linecap="${o.cap||"round"}" stroke-linejoin="round"${o.dash?` stroke-dasharray="${o.dash}"`:""}${o.op!=null?` opacity="${o.op}"`:""}/>`;
const RM=matchMedia("(prefers-reduced-motion: reduce)").matches;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));

// ---------- the design, in metres: x east, y north, z height above the lower floor (RL 10.000). Matches build_house.py.
const LO={x0:-7,x1:7,y0:0,y1:5.5,ffl:0},UP={x0:-7,x1:7,y0:-4.5,y1:0,ffl:1.4},RL0=10;
const ceilL=y=>2.7+y*.6/5.5,ceilU=y=>3.8+(y+4.5)*.2;
const ROOF={lower:{x0:-7.4,x1:7.4,y0:0,y1:6.5,u:ceilL},upper:{x0:-7.4,x1:7.4,y0:-5.1,y1:.6,u:ceilU},t:.25};
const STAIR={x0:5.6,x1:6.8,top:-1.56,bottom:.4,risers:8,rise:.175,going:.28};
const DECK={x0:-3.5,x1:5.5,y0:5.5,y1:8};
const OPEN=[["LN",-6.4,-2.2,0,2.4,"slider"],["LN",-1,6.4,0,2.4,"slider"],["LE",1.4,4.4,.8,2.4,"window"],["LW",2,4,.9,2.1,"window"],["LS",5.6,6.8,0,2.6,"open"],
  ["UN",-6.6,-2.9,3.15,4.45,"window"],["UN",-2.1,-.4,3.15,4.45,"window"],["UN",.4,3.1,3.15,4.45,"window"],["UN",3.9,5.4,3.15,4.45,"window"],["UN",5.6,6.8,1.4,2.6,"open"],
  ["US",4.6,5.6,1.4,3.5,"door"],["US",5.8,6.6,1.4,3.5,"window"],["US",-6.2,-1,3,3.5,"window"],["UE",-3.8,-1.8,2.3,3.6,"window"],["UW",-2.6,-.8,2.3,3.6,"window"]];
const WALLS={LN:["x",-7,7,5.3,5.5,-1.6,"lower"],LS:["x",-7,7,0,.2,-1.6,"lower"],LE:["y",.2,5.3,6.8,7,-1.6,"lower"],LW:["y",.2,5.3,-7,-6.8,-1.6,"lower"],
  UN:["x",-7,7,-.2,0,1.4,"upper"],US:["x",-7,7,-4.5,-4.3,-.5,"upper"],UE:["y",-4.3,-.2,6.8,7,-.5,"upper"],UW:["y",-4.3,-.2,-7,-6.8,-.5,"upper"]};
const INNER=[["x",-6.8,3.5,-3.3,[[-4.6,-3.8],[-1.7,-.9],[.9,1.7]]],["y",-3.25,-.2,-2.5,[]],["y",-3.25,-.2,0,[]],["y",-3.25,-.2,3.5,[]]];
const FURN={lower:[[-6.8,-2.6,.2,.8],[-5.6,-3,2,2.9],[-5.7,-3.5,3.9,4.8],[.6,3.6,1.5,2.4],[1.4,2.8,2.9,3.6]],upper:[[-6.2,-4.6,-3.1,-.8],[1.6,3,-3.1,-.9],[-2.35,-.65,-.95,-.25],[-2.3,-1.4,-3.15,-2.7]]};
const ROOMS=[
 {id:"living",sh:"living",n:"Living",lv:"lower",zone:"public",x0:-1.5,x1:7,y0:0,y1:5.5,node:"ROOM_LIVING",col:"#F2C6A8"},
 {id:"kitchen",sh:"kitchen",n:"Kitchen + dining",lv:"lower",zone:"public",x0:-7,x1:-1.5,y0:0,y1:5.5,node:"ROOM_KITCHEN",col:"#F5DC9E"},
 {id:"deck",sh:"deck",n:"Deck",lv:"lower",zone:"public",x0:-3.5,x1:5.5,y0:5.5,y1:8,node:"DECK",col:"#DDBF95",out:true},
 {id:"bed1",sh:"bed 1",n:"Bedroom 1",lv:"upper",zone:"private",x0:-7,x1:-2.5,y0:-3.3,y1:0,node:"ROOM_BED1",col:"#BCCBEE"},
 {id:"bath",sh:"bath",n:"Bathroom",lv:"upper",zone:"private",x0:-2.5,x1:0,y0:-3.3,y1:0,node:"ROOM_BATH",col:"#B4E0DA"},
 {id:"bed2",sh:"bed 2",n:"Bedroom 2",lv:"upper",zone:"private",x0:0,x1:3.5,y0:-3.3,y1:0,node:"ROOM_BED2",col:"#D3C8F0"},
 {id:"hall",sh:"hall",n:"Hall",lv:"upper",zone:"circ",x0:-7,x1:3.5,y0:-4.5,y1:-3.3,node:"ROOM_HALL",col:"#ECE3C8"},
 {id:"entry",sh:"entry",n:"Entry + stair",lv:"upper",zone:"circ",x0:3.5,x1:7,y0:-4.5,y1:0,node:"ROOM_ENTRY",col:"#E9D6BD"}];
const ZONES={public:{n:"Public: living, kitchen, deck",col:"#F0B48F"},private:{n:"Private: bedrooms, bathroom",col:"#9FB8E8"},circ:{n:"Circulation: entry, hall, stair",col:"#E9D27E"}};
const roomCol=(r,mode)=>mode==="zones"?ZONES[r.zone].col:r.col;
const area=r=>(r.x1-r.x0)*(r.y1-r.y0);
const roomAt=(lv,x,y)=>ROOMS.find(r=>r.lv===lv&&x>=r.x0&&x<=r.x1&&y>=r.y0&&y<=r.y1&&!r.out);
// the site: a slope of about 1 in 6 falling to the north (to the view and the sun), a little steeper at the sides
const ground=(x,y)=>10.6-.16*y+.01*Math.max(0,Math.abs(x)-7)**2;
const terr=(x,y)=>Math.floor(ground(x,y)*2)/2-RL0;   // top of the card contour layer under a point (the model is stepped)
const SITE={x0:-12,x1:12,y0:-12.6,y1:12};            // the legal boundary (the model board runs wider, to the neighbours)

// ---------- the sun at about Wellington's latitude (41.3° S). East, north, up components of the direction to the Sun.
const LAT=-41.3*Math.PI/180;
const SEASONS={winter:{n:"Midwinter, 21 June",short:"midwinter",d:23.44},equinox:{n:"Equinox, March or September",short:"equinox",d:0},summer:{n:"Midsummer, 21 December",short:"midsummer",d:-23.44}};
const sunVec=(season,h)=>{const d=SEASONS[season].d*Math.PI/180,H=(h-12)*15*Math.PI/180;
  return{e:-Math.cos(d)*Math.sin(H),n:Math.sin(d)*Math.cos(LAT)-Math.cos(d)*Math.cos(H)*Math.sin(LAT),u:Math.sin(d)*Math.sin(LAT)+Math.cos(d)*Math.cos(H)*Math.cos(LAT)}};
const sunAlt=(season,h)=>Math.asin(clamp(sunVec(season,h).u,-1,1))*180/Math.PI;
const sunAz=(season,h)=>{const v=sunVec(season,h);return(Math.atan2(v.e,v.n)*180/Math.PI+360)%360};   // degrees from north, clockwise
const dayRange=season=>{let a=null,b=null;for(let h=3;h<=21;h+=.05){if(sunVec(season,h).u>0){if(a===null)a=h;b=h}}return[a,b]};
// hours the low winter sun shines on the living room's big north glass (within 75° of square-on, and above 3°)
const facing=rot=>({e:Math.sin(rot*Math.PI/180),n:Math.cos(rot*Math.PI/180)});
const glassSun=(rot,season="winter")=>{const f=facing(rot);let n=0;for(let h=4;h<=20;h+=.1){const v=sunVec(season,h);if(v.u<.05)continue;const hz=Math.hypot(v.e,v.n);if((v.e*f.e+v.n*f.n)/hz>.26)n+=.1}return n};
const COMPASS=["north","north-north-east","north-east","east-north-east","east","east-south-east","south-east","south-south-east","south","south-south-west","south-west","west-south-west","west","west-north-west","north-west","north-north-west"];
const faceWord=rot=>COMPASS[Math.round(((rot%360)+360)%360/22.5)%16];
const faceAbbr=rot=>faceWord(rot).split("-").map(w=>w[0].toUpperCase()).join("");
const clock=h=>{const hh=Math.floor(h+1e-6),mm=Math.round((h-hh)*60);return `${hh>12?hh-12:hh===0?12:hh}:${String(mm).padStart(2,"0")} ${hh<12?"am":"pm"}`};
const viewWord=rot=>Math.abs(rot)<=30?"straight out to the harbour":Math.abs(rot)<=60?"at an angle to the harbour":"side-on: the harbour is to one side";

// ---------- the metamorphosis: five stages, each a design move
const STAGES=[
 {n:"Site",chip:"none yet",node:null,move:"Start with the empty section: a slope falling about 1 in 6 to the north, towards the sun and the harbour view. The road and the neighbours are to the south, east and west.",form:"No form yet: just the site and its constraints."},
 {n:"Block",chip:"one box",node:"MASS_1",move:"Put all the rooms in one simple block. It works on paper, but on this slope it digs about 1.3 m into the hill at the back and floats at the front.",form:"One box: easy to build, but it fights the slope."},
 {n:"Split-level",chip:"two blocks",node:"MASS_2",move:"Split the block in two and step the back half up 1.4 m, half a storey. Now each half sits close to the ground, and a short stair joins them.",form:"Two blocks that follow the slope. Function: public rooms below, private rooms above."},
 {n:"Roof",chip:"saw-tooth",node:"MASS_3",move:"Give each block a mono-pitch (skillion) roof that rises to the north. The higher back roof leaves a band of wall for clerestory windows above the front roof.",form:"A saw-tooth profile: both roofs lift towards the sun."},
 {n:"Final",chip:"finished",node:"HOUSE",move:"Open the north side with big sliding doors onto a deck, add clerestory windows, keep small high windows on the street side for privacy, and add 1 m eaves to shade the summer sun.",form:"The finished form: function (sun, view, privacy) shaped the form."}];

// ---------- state
const s={view:"site",rot:0,season:"winter",hour:14.5,stage:4,level:"lower",colour:"rooms",cut:1.2,dview:"persp"};
const viewNow=()=>s.view;
const levelName=lv=>lv==="lower"?"Lower level":"Upper level";
const cutRooms=(x,short)=>["lower","upper"].map(lv=>ROOMS.filter(r=>r.lv===lv&&x>=r.x0&&x<=r.x1&&!r.out).map(r=>short?r.sh:r.n.toLowerCase())).flat();
const cutsStair=x=>x>=STAIR.x0&&x<=STAIR.x1;

// ================================================================== 2D drawings
const paper=(w,h)=>`<rect width="${w}" height="${h}" rx="14" fill="${C.paper}"/>`;
const title=(x,y,a,b)=>T(x,y,a,{s:10.5,w:600,mono:true,ls:".08em",c:C.ink})+(b?T(x,y+14,b,{s:10,mono:true,c:C.rose}):"");
function northPoint(x,y,r=13,rot=0){return `<g transform="translate(${x},${y}) rotate(${rot})"><circle r="${r}" fill="none" stroke="${C.ink}" stroke-width="1"/><path d="M0,${-r-5} L${r*.42},${r*.55} L0,${r*.2} L${-r*.42},${r*.55}Z" fill="${C.red}"/></g>`+T(x,y-r-9,"N",{s:11,w:700,a:"middle"})}
function scaleBar(x,y,k,m=5){let g="";for(let i=0;i<m;i++)g+=`<rect x="${x+i*k}" y="${y}" width="${k}" height="5" fill="${i%2?C.paper:C.ink}" stroke="${C.ink}" stroke-width=".8"/>`;
  return g+T(x,y+16,"0",{s:9,mono:true,a:"middle"})+T(x+m*k,y+16,`${m} m`,{s:9,mono:true,a:"middle"})}
// architectural dimension lines: oblique ticks, the number in millimetres above the line
function dimH(x0,x1,y,label,o={}){const c=o.c||C.muted;return `<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="${c}" stroke-width=".8"/>`+[x0,x1].map(x=>`<line x1="${x-4}" y1="${y+4}" x2="${x+4}" y2="${y-4}" stroke="${c}" stroke-width="1.4"/><line x1="${x}" y1="${y-7}" x2="${x}" y2="${y+7}" stroke="${c}" stroke-width=".6"/>`).join("")+T((x0+x1)/2,y-4,label,{s:o.s||9.5,mono:true,a:"middle",c})}
function dimV(x,y0,y1,label,o={}){const c=o.c||C.muted;return `<line x1="${x}" y1="${y0}" x2="${x}" y2="${y1}" stroke="${c}" stroke-width=".8"/>`+[y0,y1].map(y=>`<line x1="${x-4}" y1="${y+4}" x2="${x+4}" y2="${y-4}" stroke="${c}" stroke-width="1.4"/><line x1="${x-7}" y1="${y}" x2="${x+7}" y2="${y}" stroke="${c}" stroke-width=".6"/>`).join("")+T(x-5,(y0+y1)/2,label,{s:o.s||9.5,mono:true,a:"middle",c,rot:-90})}
const mm=m=>fmt(Math.round(m*1000)).replace(/,/g," ");
const levelMark=(x,y,txt,o={})=>`<path d="M${x-6},${y-8} L${x+6},${y-8} L${x},${y}Z" fill="${o.fill||C.paper}" stroke="${C.ink}" stroke-width="1"/><line x1="${x-8}" y1="${y}" x2="${x+(o.len||60)}" y2="${y}" stroke="${C.ink}" stroke-width=".8"/>`+T(x+10,y-4,txt,{s:9,mono:true});

// ---------- site plan: natural 380 × 300 (9 px per metre). rot turns the house (degrees, + towards the east).
function sitePlan(o={}){const k=9,ox=190,oy=146,P=(x,y)=>[ox+x*k,oy-y*k],rot=o.rot??s.rot,season=o.season??s.season,hour=o.hour??s.hour;
  let g=`<rect x="${ox-20*k}" y="${oy-15.5*k}" width="${40*k}" height="${31*k}" fill="${C.site}"/>`;
  // water to the north where the land drops below the model's base, and the street to the south
  {const top=[];for(let x=-20;x<=20.01;x+=.5)top.push(P(x,Math.min(15.5,(10.6-8.5+.01*Math.max(0,Math.abs(x)-7)**2)/.16)));g+=PG([P(-20,15.5),...top,P(20,15.5)],C.water)}
  g+=`<rect x="${ox-20*k}" y="${oy+12.6*k}" width="${40*k}" height="${2.9*k}" fill="${C.street}"/>`+T(ox-18*k,oy+14.4*k,"STREET",{s:8.5,mono:true,ls:".1em",c:C.muted});
  g+=T(ox-18*k,oy-14*k,"HARBOUR VIEW",{s:8.5,mono:true,ls:".1em",c:"#4F7F95"});
  // contours every 0.5 m (darker every whole metre), labelled with their reduced level
  for(let L=9;L<=14.5;L+=.5){const pts=[];for(let x=-20;x<=20.01;x+=.5){const y=(10.6-L+.01*Math.max(0,Math.abs(x)-7)**2)/.16;if(y>=-12.6&&y<=15.5)pts.push(P(x,y))}
    if(pts.length>1){const major=L%1===0;g+=PL(pts,major?C.siteDk:C.siteLt,major?1.1:.7);if(major){const y=(10.6-L+.01*Math.max(0,19-7)**2)/.16;if(y>-12&&y<15)g+=T(P(19.3,y)[0],P(19.3,y)[1]-2,`${L}`,{s:7.5,mono:true,c:C.siteDk,a:"end"})}}}
  // neighbours and trees
  [[-19.6,-14.6,-7,1],[14.6,19.6,-4,4]].forEach(([a,b,c,d])=>{const p=P(a,d);g+=`<rect x="${p[0]}" y="${p[1]}" width="${(b-a)*k}" height="${(d-c)*k}" fill="#EAE6E0" stroke="#9C948C" stroke-width=".8"/>`});
  g+=T(P(-17.1,-3)[0],P(-17.1,-3)[1],"NEIGHBOUR",{s:7,mono:true,a:"middle",c:C.muted})+T(P(17.1,0)[0],P(17.1,0)[1],"NEIGHBOUR",{s:7,mono:true,a:"middle",c:C.muted});
  [[-10,8],[-13.5,3.8],[-9.4,-9.6],[10.6,9.2],[13,-8.4],[-17,10.6],[17.4,11.2],[9.4,-10.6],[-16.4,-10.8],[-11.8,12.6]].forEach(([x,y],i)=>{const p=P(x,y);g+=`<circle cx="${p[0]}" cy="${p[1]}" r="${(1.1+.3*((i*7)%3)/2)*k}" fill="#F7F5EF" stroke="#8FA882" stroke-width=".8"/>`});
  // the boundary: a red chain line
  {const a=P(SITE.x0,SITE.y1),b=P(SITE.x1,SITE.y0);g+=`<rect x="${a[0]}" y="${a[1]}" width="${b[0]-a[0]}" height="${b[1]-a[1]}" fill="none" stroke="${C.red}" stroke-width="1.2" stroke-dasharray="10 3 2 3"/>`}
  {const p=P(4.2,-4.5);g+=`<rect x="${p[0]}" y="${p[1]}" width="${1.8*k}" height="${8.1*k}" fill="${C.street}"/>`}
  // the sun path for the season (zenith in the middle, horizon at the ring), the other seasons faint
  const R=12.5,cx=0,cy=1;
  const sp=(se,h)=>{const az=sunAz(se,h)*Math.PI/180,al=Math.max(0,sunAlt(se,h)),r=R*(1-al/90);return P(cx+r*Math.sin(az),cy+r*Math.cos(az))};
  g+=`<circle cx="${P(cx,cy)[0]}" cy="${P(cx,cy)[1]}" r="${R*k}" fill="none" stroke="${C.sun}" stroke-width=".6" stroke-dasharray="2 3" opacity=".7"/>`;
  Object.keys(SEASONS).forEach(se=>{const [a,b]=dayRange(se),pts=[];for(let h=a;h<=b;h+=.25)pts.push(sp(se,h));pts.push(sp(se,b));const on=se===season;
    g+=PL(pts,C.sun,on?2.2:1,{dash:on?"":"4 4",op:on?1:.55});
    if(on)for(let h=Math.ceil(a);h<=b;h++){const p=sp(se,h);g+=`<circle cx="${p[0]}" cy="${p[1]}" r="2.2" fill="${C.sun}"/>`+(h%3===0?T(p[0],p[1]-5,h===12?"noon":h>12?`${h-12} pm`:`${h} am`,{s:7.5,mono:true,a:"middle",c:"#9A5F10"}):"")}});
  // the house (roof plan) turned on the site, with its view
  const H=P(0,0);let hg=`<path d="M${P(2.75,2.75)[0]},${P(2.75,2.75)[1]} L${P(2.75+16*Math.sin(-.44),2.75+16*Math.cos(-.44)).join(",")} A${16*k},${16*k} 0 0 1 ${P(2.75+16*Math.sin(.44),2.75+16*Math.cos(.44)).join(",")}Z" fill="${C.view}" opacity=".22"/>`;
  {const p=P(DECK.x0,DECK.y1);hg+=`<rect x="${p[0]}" y="${p[1]}" width="${(DECK.x1-DECK.x0)*k}" height="${(DECK.y1-DECK.y0)*k}" fill="${C.timber}" stroke="${C.ink}" stroke-width=".6"/>`}
  [["lower",ROOF.lower],["upper",ROOF.upper]].forEach(([n,r])=>{const p=P(r.x0,r.y1);hg+=`<rect x="${p[0]}" y="${p[1]}" width="${(r.x1-r.x0)*k}" height="${(r.y1-r.y0)*k}" fill="${n==="upper"?"#FFFFFF":"#F1EEE9"}" stroke="${C.ink}" stroke-width="1.3"/>`;
    // roof fall arrows (both skillions fall to the south)
    [-4,0,4].forEach(x=>{const a=P(x,r.y1-.8),b=P(x,r.y0+.8);hg+=`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${C.muted}" stroke-width=".7"/><path d="M${b[0]-2.5},${b[1]-4} L${b[0]},${b[1]} L${b[0]+2.5},${b[1]-4}" fill="none" stroke="${C.muted}" stroke-width=".7"/>`})});
  g+=`<defs><clipPath id="sitemap"><rect x="${ox-20*k}" y="${oy-15.5*k}" width="${40*k}" height="${31*k}"/></clipPath></defs><g clip-path="url(#sitemap)"><g transform="rotate(${rot} ${H[0]} ${H[1]})">${hg}</g></g>`;
  // the sun now, and its rays to the house
  const alt=sunAlt(season,hour);if(alt>0){const p=sp(season,hour);g+=`<line x1="${p[0]}" y1="${p[1]}" x2="${H[0]}" y2="${H[1]}" stroke="${C.sun}" stroke-width="1" stroke-dasharray="3 3"/><circle cx="${p[0]}" cy="${p[1]}" r="9" fill="${C.sun}" opacity=".25"/><circle cx="${p[0]}" cy="${p[1]}" r="5.5" fill="${C.sun}"/>`}
  g+=northPoint(ox+17.2*k,oy-12.2*k,10)+scaleBar(ox+8*k,oy+13.4*k,k*2,5).replace(/5 m/,"10 m");
  return {w:380,h:300,svg:`<g>${g}</g>`,clip:[ox-20*k,oy-15.5*k,40*k,31*k]}}

// a section through the north glass: how high the Sun is decides how far it reaches into the room. Natural 420 × 260.
function sunSection(){const rot=s.rot,f=facing(rot),v=sunVec(s.season,s.hour),alt=sunAlt(s.season,s.hour);
  // the profile angle: the Sun's height seen in a section square to the glass
  const along=v.e*f.e+v.n*f.n,prof=v.u>0&&along>0?Math.atan2(v.u,along)*180/Math.PI:null;
  const k=36,ox=240,oy=200,P=(y,z)=>[ox-(y-5.5)*k,oy-z*k];   // the glass at x = 240; the room runs to the right (south)
  let g=paper(420,260)+title(18,24,"SUN THROUGH THE NORTH GLASS",`${SEASONS[s.season].n} · ${clock(s.hour)}`);
  g+=`<rect x="0" y="${oy}" width="420" height="${260-oy}" fill="${C.site}" rx="0"/>`;
  // floor, glass, roof with its 1 m eave
  g+=PG([P(5.5,0),P(1,0),P(1,-.3),P(5.5,-.3)],C.poche)+PG([P(5.5,2.4),P(5.3,2.4),P(5.3,ceilL(5.3)),P(5.5,ceilL(5.5))],C.poche);
  g+=`<rect x="${P(5.5,2.4)[0]-1}" y="${P(5.5,2.4)[1]}" width="2" height="${2.4*k}" fill="${C.glass}" stroke="#5E8A99" stroke-width=".8"/>`;
  g+=PG([P(6.5,ceilL(6.5)),P(1,ceilL(1)),P(1,ceilL(1)+.25),P(6.5,ceilL(6.5)+.25)],C.poche)+T(P(6,ceilL(6.5)+.6)[0],P(6,ceilL(6.5)+.6)[1],"1 m eave",{s:9,mono:true,a:"middle",c:C.muted});
  g+=PG([P(8,-.02),P(5.5,-.02),P(5.5,-.15),P(8,-.15)],C.timber)+T(P(6.75,-.6)[0],P(6.75,-.6)[1],"deck",{s:9,mono:true,a:"middle",c:C.muted});
  // a sun ray: through the eave line if it can, else to the head of the glass
  const ray=(deg,col,label,w)=>{const t=Math.tan(deg*Math.PI/180),edge=[6.5,ceilL(6.5)];
    let reach;const zAtGlass=edge[1]-t*1;   // height where the ray past the eave edge meets the glass line
    const zTop=Math.min(2.4,zAtGlass);if(zTop<=0)return{g:"",reach:0};
    reach=zTop/t;const a=P(5.5+(edge[1]+1.2-zTop)/t,edge[1]+1.2),b=P(5.5,zTop),c=P(5.5-reach,0);
    return{g:PL([a,b,c],col,w)+`<circle cx="${c[0]}" cy="${c[1]}" r="3" fill="${col}"/>`+T(a[0]-6,a[1]-4,label,{s:9.5,w:600,c:col,a:"end"}),reach:Math.min(reach,4.5)}};
  const wN=ray(sunAlt("winter",12),"#C77B12",`midwinter noon ${fmt(sunAlt("winter",12))}°`,1.2),sN=ray(sunAlt("summer",12),"#B98A3E",`midsummer noon ${fmt(sunAlt("summer",12))}°`,1.2);
  g+=wN.g;if(sN.reach>0)g+=sN.g;else g+=T(P(4,3.6)[0],P(4,3.6)[1]-14,`midsummer noon ${fmt(sunAlt("summer",12))}°: the eave shades the glass`,{s:9.5,c:"#B98A3E"});
  let now="";if(prof!==null&&alt>0){const r=ray(prof,C.red,"now",2);g+=r.g;now=r.reach>0?`Now: sun reaches about ${fmt(r.reach,1)} m into the room`:"Now: the eave shades the glass"}
  else now=alt<=0?"Now: the Sun is below the horizon":"Now: the Sun is behind the house";
  g+=T(18,236,now,{s:11.5,w:600})+T(18,252,`Winter sun reaches about ${fmt(wN.reach,1)} m in; summer sun ${sN.reach>0.2?`only ${fmt(sN.reach,1)} m`:"is kept out"}.`,{s:10,c:C.muted});
  g+=T(404,24,"N ←",{s:10,mono:true,a:"end",c:C.muted});
  return g}

// ---------- the metamorphosis in 2D: extruded profiles drawn isometric (30°) or in two-point perspective
const tz=y=>terr(0,y);
function stepped(ya,yb){const pts=[[ya,tz(ya)]];let z=tz(ya);const dir=yb>ya?1:-1;
  for(let i=1;i<=400;i++){const y=ya+dir*i*.05;if(dir>0?y>yb:y<yb)break;const zz=tz(y);if(zz!==z){pts.push([y,z],[y,zz]);z=zz}}pts.push([yb,tz(yb)]);return pts}
const onGround=(ya,yb,top)=>[...stepped(ya,yb),[yb,top(yb)],[ya,top(ya)]];   // a block standing on the stepped site, top(y) its roof line
function prisms(stage,o={}){const ex=o.extent||[-11,11,-9,11],[X0,X1,Y0,Y1]=ex,P=[];
  P.push({x0:X0,x1:X1,prof:[[Y0,-2.6],[Y1,-2.6],...stepped(Y1,Y0)],c:"#A9C98F",terrain:true});
  if(stage===1)P.push({x0:-7,x1:7,prof:onGround(-4.5,5.5,()=>3),c:C.card});
  if(stage===2){P.push({x0:-7,x1:7,prof:onGround(-4.5,0,()=>4.2),c:C.card});P.push({x0:-7,x1:7,prof:onGround(0,5.5,()=>2.95),c:C.card})}
  if(stage===3){P.push({x0:-7,x1:7,prof:onGround(-4.5,0,y=>4.05+(y+4.5)*.2),c:C.card});P.push({x0:-7,x1:7,prof:onGround(0,5.5,y=>2.95+y*.6/5.5),c:C.card})}
  if(stage===4){const r=ROOF;
    P.push({x0:-7,x1:7,prof:onGround(-4.5,0,ceilU),c:C.card,win:OPEN.filter(w=>w[0]==="UN"&&w[5]!=="open").map(w=>({x:[w[1],w[2]],y:0,z:[w[3],w[4]]})).concat([{f:"e",y:[-3.8,-1.8],x:7,z:[2.3,3.6]}])});
    P.push({x0:r.upper.x0,x1:r.upper.x1,prof:[[r.upper.y0,ceilU(r.upper.y0)],[r.upper.y1,ceilU(r.upper.y1)],[r.upper.y1,ceilU(r.upper.y1)+r.t],[r.upper.y0,ceilU(r.upper.y0)+r.t]],c:"#E2DED7"});
    P.push({x0:-7,x1:7,prof:onGround(0,5.5,ceilL),c:C.card,win:OPEN.filter(w=>w[0]==="LN").map(w=>({x:[w[1],w[2]],y:5.5,z:[w[3],w[4]]})).concat([{f:"e",y:[1.4,4.4],x:7,z:[.8,2.4]}])});
    P.push({x0:r.lower.x0,x1:r.lower.x1,prof:[[0,ceilL(0)],[r.lower.y1,ceilL(r.lower.y1)],[r.lower.y1,ceilL(r.lower.y1)+r.t],[0,ceilL(0)+r.t]],c:"#E2DED7"});
    P.push({x0:DECK.x0,x1:DECK.x1,prof:[[DECK.y0,-.17],[DECK.y1,-.17],[DECK.y1,-.02],[DECK.y0,-.02]],c:C.timber})}
  return P}
const LIGHT=(()=>{const v=[-.45,.55,.7],l=Math.hypot(...v);return v.map(x=>x/l)})();
function shade(hex,n){const d=n[0]*LIGHT[0]+n[1]*LIGHT[1]+n[2]*LIGHT[2],k=.62+.38*Math.max(0,d);const c=parseInt(hex.slice(1),16);return `rgb(${[(c>>16)&255,(c>>8)&255,c&255].map(v=>Math.round(v*k)).join(",")})`}
function faceList(pr){const out=[],{x0,x1,prof}=pr,n=prof.length;
  out.push({p:prof.map(([y,z])=>[x0,y,z]).reverse(),n:[-1,0,0]},{p:prof.map(([y,z])=>[x1,y,z]),n:[1,0,0]});
  for(let i=0;i<n;i++){const [y0,z0]=prof[i],[y1,z1]=prof[(i+1)%n],dy=y1-y0,dz=z1-z0,l=Math.hypot(dy,dz);if(l<1e-6)continue;out.push({p:[[x0,y0,z0],[x1,y0,z0],[x1,y1,z1],[x0,y1,z1]],n:[0,dz/l,-dy/l]})}
  return out}
// draw(prisms, cam): cam.proj(p) → [sx, sy], cam.vis(face) → bool, cam.depth(prism) → number (bigger = nearer)
function render(list,cam,o={}){let g="";const ord=list.map((pr,i)=>({pr,i,d:pr.terrain?-1e9:cam.depth(pr)})).sort((a,b)=>a.d-b.d);
  for(const {pr} of ord){const fs=faceList(pr).filter(f=>cam.vis(f));fs.sort((a,b)=>cam.fdepth(a)-cam.fdepth(b));
    for(const f of fs)g+=PG(f.p.map(cam.proj),shade(pr.c,f.n),{st:o.stroke||C.ink,sw:o.sw||.6});
    for(const w of pr.win||[]){let q;if(w.f==="e")q=[[w.x+.02,w.y[0],w.z[0]],[w.x+.02,w.y[1],w.z[0]],[w.x+.02,w.y[1],w.z[1]],[w.x+.02,w.y[0],w.z[1]]];else q=[[w.x[0],w.y+.02,w.z[0]],[w.x[1],w.y+.02,w.z[0]],[w.x[1],w.y+.02,w.z[1]],[w.x[0],w.y+.02,w.z[1]]];
      if(cam.vis({p:q,n:w.f==="e"?[1,0,0]:[0,1,0]}))g+=PG(q.map(cam.proj),"#8FB2BE",{st:C.ink,sw:.4})}}
  return g}
function isoCam(k,ox,oy){const c=Math.cos(Math.PI/6),sn=.5;return{proj:([x,y,z])=>[ox+(y-x)*c*k,oy+(x+y)*sn*k-z*k],vis:f=>f.n[0]+f.n[1]+f.n[2]>1e-6,
  depth:pr=>{const p=pr.prof,yz=p.reduce((a,q)=>[a[0]+q[0]/p.length,a[1]+q[1]/p.length],[0,0]);return (pr.x0+pr.x1)/2+yz[0]+yz[1]},
  fdepth:f=>f.p.reduce((a,q)=>a+q[0]+q[1]+q[2],0)/f.p.length}}
function perspCam(eye,look,F,ox,oy){const sub=(a,b)=>a.map((v,i)=>v-b[i]),dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],nrm=a=>{const l=Math.hypot(...a);return a.map(v=>v/l)},cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const f=nrm(sub(look,eye)),r=nrm(cross(f,[0,0,1])),u=cross(r,f);
  const proj=p=>{const d=sub(p,eye),zc=Math.max(.1,dot(d,f));return[ox+dot(d,r)/zc*F,oy-dot(d,u)/zc*F]};
  const vp=v=>{const zc=dot(v,f);return zc>1e-6?[ox+dot(v,r)/zc*F,oy-dot(v,u)/zc*F]:null};
  const cen=a=>a.reduce((s,q)=>[s[0]+q[0]/a.length,s[1]+q[1]/a.length,s[2]+q[2]/a.length],[0,0,0]);
  return{proj,vp,eye,horizon:oy,vis:fc=>dot(fc.n,sub(eye,cen(fc.p)))>1e-6,depth:pr=>-Math.hypot(...sub([(pr.x0+pr.x1)/2,pr.prof[0][0],pr.prof[0][1]],eye)),fdepth:fc=>-Math.hypot(...sub(cen(fc.p),eye))}}
function stageThumb(i,ox,oy,k){let g=render(prisms(i),isoCam(k,ox,oy),{sw:.5});
  if(i===0){const c=isoCam(k,ox,oy),q=[[-7,-4.5],[7,-4.5],[7,5.5],[-7,5.5]].map(([x,y])=>c.proj([x,y,tz(y)+.05]));g+=PG(q,"none",{st:C.red,sw:1,dash:"4 3"})}
  return g}
function metamorphosis(w=760){const n=STAGES.length,pw=w/n,k=pw/40;let g="";
  STAGES.forEach((st,i)=>{const cx=i*pw+pw/2,on=i===s.stage;
    g+=stageThumb(i,cx,58,k);
    g+=T(cx,128,`0${i+1}`,{s:11,w:700,mono:true,a:"middle",c:on?C.red:C.rose})+T(cx,146,st.n,{s:13,w:on?700:500,a:"middle"});
    if(on)g+=`<line x1="${cx-28}" y1="${154}" x2="${cx+28}" y2="${154}" stroke="${C.red}" stroke-width="2.4"/>`;
    if(i<n-1)g+=`<path d="M${(i+1)*pw-6},${124} l8,0 m-3,-3 l3,3 l-3,3" fill="none" stroke="${C.rose}" stroke-width="1.2"/>`});
  return g}

// ---------- floor plans: natural 420 × 390, 24 px per metre, north up
function wallBits(lv,cutZ){const out=[];
  for(const [key,[ax,a0,a1,b0,b1,zb,wl]] of Object.entries(WALLS)){if(wl!==lv)continue;
    const ops=OPEN.filter(o=>o[0]===key).sort((p,q)=>p[1]-q[1]);let cur=a0;
    const R=(p0,p1,kind,extra)=>out.push({...(ax==="x"?{x0:p0,x1:p1,y0:b0,y1:b1}:{x0:b0,x1:b1,y0:p0,y1:p1}),ax,kind,...extra});
    for(const [,o0,o1,sill,head,kind] of ops){if(o0>cur)R(cur,o0,"solid");if(sill<cutZ&&head>cutZ)R(o0,o1,kind);else{R(o0,o1,"solid");if(sill>cutZ)R(o0,o1,"high")}cur=o1}
    if(cur<a1)R(cur,a1,"solid")}
  if(lv==="upper")for(const [ax,a0,a1,at,doors] of INNER){let cur=a0;const R=(p0,p1,kind)=>out.push({...(ax==="x"?{x0:p0,x1:p1,y0:at-.05,y1:at+.05}:{x0:at-.05,x1:at+.05,y0:p0,y1:p1}),ax,kind,inner:true});
    for(const [d0,d1] of doors){R(cur,d0,"solid");R(d0,d1,"idoor");cur=d1}R(cur,a1,"solid")}
  return out}
function planSVG(lv,mode,o={}){const k=24,ox=210,oy=231,P=(x,y)=>[ox+x*k,oy-y*k],RR=(x0,y0,x1,y1)=>{const a=P(x0,y1);return `x="${a[0].toFixed(1)}" y="${a[1].toFixed(1)}" width="${((x1-x0)*k).toFixed(1)}" height="${((y1-y0)*k).toFixed(1)}"`};
  const plain=mode==="none";let g="";
  // the other level, for reference
  if(lv==="lower")g+=`<rect ${RR(-7,-4.5,7,0)} fill="none" stroke="${C.rose}" stroke-width=".8" stroke-dasharray="5 4"/>`+T(P(-1,-2.3)[0],P(-1,-2.3)[1],"upper level, 1.4 m up (not shown)",{s:9.5,a:"middle",c:C.rose,mono:true});
  else{g+=`<rect ${RR(-7.4,0,7.4,6.5)} fill="#F4F1EC" stroke="${C.muted}" stroke-width=".7"/><rect ${RR(DECK.x0,DECK.y0+1,DECK.x1,DECK.y1)} fill="none" stroke="${C.muted}" stroke-width=".5" stroke-dasharray="3 3"/>`+T(P(0,3.5)[0],P(0,3.5)[1],"lower roof below, falls to the south",{s:9.5,a:"middle",c:C.muted,mono:true});[-4,0,4].forEach(x=>{const a=P(x,5.6),b=P(x,1.2);g+=`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${C.muted}" stroke-width=".6"/><path d="M${b[0]-3},${b[1]-5} L${b[0]},${b[1]} L${b[0]+3},${b[1]-5}" fill="none" stroke="${C.muted}" stroke-width=".6"/>`})}
  // rooms
  ROOMS.filter(r=>r.lv===lv).forEach(r=>{g+=`<rect ${RR(r.x0,r.y0,r.x1,r.y1)} fill="${plain?(r.out?"#F3EBDD":C.paper):roomCol(r,mode)}"/>`;
    if(r.out)for(let x=r.x0+.3;x<r.x1;x+=.3){const a=P(x,r.y0),b=P(x,r.y1);g+=`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#B89A72" stroke-width=".35"/>`}});
  if(lv==="lower"){const a=P(-1.5,.2),b=P(-1.5,5.3);g+=`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${C.muted}" stroke-width=".6" stroke-dasharray="2 3"/>`}
  // furniture, thin
  FURN[lv].forEach(([x0,x1,y0,y1])=>{g+=`<rect ${RR(x0,y0,x1,y1)} fill="none" stroke="${C.muted}" stroke-width=".6"/>`});
  // the stair: treads, the walking line and UP / DN
  {for(let i=0;i<STAIR.risers;i++){const y=STAIR.bottom-STAIR.going*i,a=P(STAIR.x0,y),b=P(STAIR.x1,y);g+=`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${C.ink}" stroke-width=".7"/>`}
    const a=P(6.2,STAIR.bottom-.1),b=P(6.2,STAIR.top+.15),up=lv==="lower";g+=`<rect ${RR(STAIR.x0,STAIR.top,STAIR.x1,STAIR.bottom)} fill="none" stroke="${C.ink}" stroke-width=".9"/>`;
    g+=`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${C.ink}" stroke-width=".8"/>`+(up?`<path d="M${b[0]-3},${b[1]+5} L${b[0]},${b[1]} L${b[0]+3},${b[1]+5}" fill="none" stroke="${C.ink}" stroke-width=".8"/>`:`<path d="M${a[0]-3},${a[1]-5} L${a[0]},${a[1]} L${a[0]+3},${a[1]-5}" fill="none" stroke="${C.ink}" stroke-width=".8"/>`);
    g+=T(P(STAIR.x0-.15,(STAIR.top+STAIR.bottom)/2)[0],P(STAIR.x0-.15,(STAIR.top+STAIR.bottom)/2)[1],up?"UP":"DN",{s:9,w:700,mono:true,a:"end"})}
  // walls: solid poché at the cut (1.2 m above the floor); windows as thin glass lines; high windows dashed
  const cutZ=(lv==="lower"?LO.ffl:UP.ffl)+1.2;
  for(const b of wallBits(lv,cutZ)){
    if(b.kind==="solid")g+=`<rect ${RR(b.x0,b.y0,b.x1,b.y1)} fill="${C.poche}"/>`;
    else if(b.kind==="high"){const m=b.ax==="x"?[(b.y0+b.y1)/2]:[(b.x0+b.x1)/2];g+=b.ax==="x"?`<line x1="${P(b.x0,0)[0]}" y1="${P(0,m[0]-.32)[1]}" x2="${P(b.x1,0)[0]}" y2="${P(0,m[0]-.32)[1]}" stroke="${C.ink}" stroke-width=".7" stroke-dasharray="4 3"/>`:`<line x1="${P(m[0]+(m[0]>0?-.32:.32),0)[0]}" y1="${P(0,b.y0)[1]}" x2="${P(m[0]+(m[0]>0?-.32:.32),0)[0]}" y2="${P(0,b.y1)[1]}" stroke="${C.ink}" stroke-width=".7" stroke-dasharray="4 3"/>`}
    else if(b.kind==="window"||b.kind==="slider"){g+=`<rect ${RR(b.x0,b.y0,b.x1,b.y1)} fill="${C.paper}" stroke="${C.ink}" stroke-width=".7"/>`;
      if(b.ax==="x"){const y=(b.y0+b.y1)/2,a=P(b.x0,y),c=P(b.x1,y);g+=`<line x1="${a[0]}" y1="${a[1]-(b.kind==="slider"?1.2:0)}" x2="${c[0]}" y2="${c[1]-(b.kind==="slider"?1.2:0)}" stroke="#4E7E90" stroke-width="1"/>`+(b.kind==="slider"?`<line x1="${a[0]}" y1="${a[1]+1.2}" x2="${c[0]}" y2="${c[1]+1.2}" stroke="#4E7E90" stroke-width="1"/>`:"")}
      else{const x=(b.x0+b.x1)/2,a=P(x,b.y0),c=P(x,b.y1);g+=`<line x1="${a[0]}" y1="${a[1]}" x2="${c[0]}" y2="${c[1]}" stroke="#4E7E90" stroke-width="1"/>`}}
    else if(b.kind==="door"){const a=P(b.x0,b.y1),w=(b.x1-b.x0)*k;g+=`<line x1="${a[0]}" y1="${a[1]}" x2="${a[0]}" y2="${a[1]-w}" stroke="${C.ink}" stroke-width="1.2"/><path d="M${a[0]},${a[1]-w} A${w},${w} 0 0 1 ${a[0]+w},${a[1]}" fill="none" stroke="${C.ink}" stroke-width=".6"/>`}
    else if(b.kind==="idoor"){const a=P(b.x0,b.y1),w=(b.x1-b.x0)*k;g+=`<line x1="${a[0]}" y1="${a[1]}" x2="${a[0]}" y2="${a[1]-w}" stroke="${C.ink}" stroke-width="1"/><path d="M${a[0]},${a[1]-w} A${w},${w} 0 0 1 ${a[0]+w},${a[1]}" fill="none" stroke="${C.ink}" stroke-width=".5"/>`}}
  // labels
  ROOMS.filter(r=>r.lv===lv).forEach(r=>{let cx=(r.x0+r.x1)/2,cy=(r.y0+r.y1)/2;if(r.id==="entry"){cx=4.6;cy=-2.6}if(r.id==="living")cy=4.2;if(r.id==="kitchen")cy=1.6;
    const p=P(cx,cy),small=r.id==="bath"||r.id==="hall";g+=T(p[0],p[1]-(small?0:2),small&&r.id==="bath"?"Bath":r.n,{s:small?9.5:11,w:600,a:"middle"})+(small?"":T(p[0],p[1]+11,`about ${fmt(area(r))} m²`,{s:8.5,mono:true,a:"middle",c:C.muted}))});
  // dimensions in millimetres
  g+=dimH(P(-7,0)[0],P(7,0)[0],P(0,-5.5)[1],"14 000");
  if(lv==="lower"){g+=dimV(P(8.1,0)[0],P(0,0)[1],P(0,5.5)[1],"5 500")+dimV(P(8.1,0)[0],P(0,5.5)[1],P(0,8)[1],"2 500")}
  else g+=dimV(P(8.1,0)[0],P(0,-4.5)[1],P(0,0)[1],"4 500");
  // the section line A–A, red, with its arrows looking west
  if(o.cut!==false){const x=P(s.cut,0)[0],t=P(0,8.9)[1],b=P(0,-4.95)[1];g+=`<line x1="${x}" y1="${t}" x2="${x}" y2="${b}" stroke="${C.red}" stroke-width="1.2" stroke-dasharray="12 3 2 3"/>`;
    [t,b].forEach(y=>{g+=`<path d="M${x},${y} l-12,0 m4,-4 l-4,4 l4,4" fill="none" stroke="${C.red}" stroke-width="1.6"/>`+T(x+5,y+4,"A",{s:11,w:700,c:C.red})})}
  g+=northPoint(P(-7.4,8.2)[0],P(-7.4,8.2)[1],9)+T(P(-7,-6.2)[0],P(-7,-6.2)[1]+2,`FFL RL ${fmt(RL0+(lv==="lower"?LO.ffl:UP.ffl),3)}`,{s:9,mono:true,c:C.muted});
  return g}
function planLegend(x,y,mode,lv){let g="";const items=mode==="zones"?Object.values(ZONES).map(z=>[z.col,z.n]):ROOMS.filter(r=>r.lv===lv).map(r=>[r.col,r.n]);
  items.forEach(([c,n],i)=>{g+=`<rect x="${x}" y="${y+i*19}" width="13" height="13" rx="3" fill="${c}" stroke="${C.ink}" stroke-width=".4"/>`+T(x+20,y+i*19+10.5,n,{s:11,c:n.includes("other level")?C.rose:C.ink})});return g}

// ---------- the section A–A: natural 560 × 250, 24 px per metre, looking west, north on the right
function sectionSVG(x=s.cut){const k=24,ox=268,oy=166,P=(y,z)=>[ox+y*k,oy-z*k];let g="";
  // ground: natural ground line, cut earth hatched below; dug out under the lower floor
  const gl=[];for(let y=-9.5;y<=10.51;y+=.25){let z=ground(x,y)-RL0;if(y>LO.y0&&y<LO.y1)z=Math.min(z,-.3);gl.push(P(y,z))}
  g+=`<defs><pattern id="earth" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="#E3EDD9"/><line x1="0" y1="0" x2="0" y2="7" stroke="#9DB98A" stroke-width="1"/></pattern></defs>`;
  g+=PG([P(-9.5,-2.7),...gl,P(10.5,-2.7)],"url(#earth)")+PL(gl,C.siteDk,1.6);
  // beyond (thin): the far end wall's windows, the nearest partition, the stair when it is behind the cut
  const thin=(a,col=C.muted)=>PG(a,"none",{st:col,sw:.7});
  g+=thin([P(2,.9),P(4,.9),P(4,2.1),P(2,2.1)])+thin([P(-2.6,2.3),P(-.8,2.3),P(-.8,3.6),P(-2.6,3.6)]);
  const parts=[-2.5,0,3.5].filter(a=>a<x);if(parts.length){g+=thin([P(-3.25,1.4),P(-.2,1.4),P(-.2,ceilU(-.2)),P(-3.25,ceilU(-3.25))])}
  if(x>STAIR.x1){const st=[P(STAIR.bottom,0)];for(let i=1;i<STAIR.risers;i++){const y=STAIR.bottom-STAIR.going*(i-1);st.push(P(y,STAIR.rise*(i-1)),P(y,STAIR.rise*i))}st.push(P(STAIR.top,1.4));g+=PL(st,C.muted,.8)}
  // cut (poché): floors, roofs, walls with their openings, the deck, the stair
  const cut=a=>PG(a,C.poche);
  g+=cut([P(0,-.3),P(5.5,-.3),P(5.5,0),P(0,0)]);
  if(cutsStair(x)){g+=cut([P(-4.5,1.1),P(STAIR.top,1.1),P(STAIR.top,1.4),P(-4.5,1.4)])}else g+=cut([P(-4.5,1.1),P(0,1.1),P(0,1.4),P(-4.5,1.4)]);
  for(const r of [ROOF.lower,ROOF.upper])if(x>=r.x0&&x<=r.x1)g+=cut([P(r.y0,r.u(r.y0)),P(r.y1,r.u(r.y1)),P(r.y1,r.u(r.y1)+ROOF.t),P(r.y0,r.u(r.y0)+ROOF.t)]);
  for(const [key,[ax,a0,a1,b0,b1,zb,lv]] of Object.entries(WALLS)){if(ax!=="x"||x<a0||x>a1)continue;const top=lv==="lower"?ceilL((b0+b1)/2):ceilU((b0+b1)/2);
    const ops=OPEN.filter(o=>o[0]===key&&x>o[1]&&x<o[2]);let z=zb;
    for(const [,,,sill,head,kind] of ops.sort((p,q)=>p[3]-q[3])){if(sill>z)g+=cut([P(b0,z),P(b1,z),P(b1,sill),P(b0,sill)]);
      if(kind==="window"||kind==="slider"){const m=(b0+b1)/2;g+=`<line x1="${P(m,0)[0]-1.2}" y1="${P(0,sill)[1]}" x2="${P(m,0)[0]-1.2}" y2="${P(0,head)[1]}" stroke="#4E7E90" stroke-width="1"/><line x1="${P(m,0)[0]+1.2}" y1="${P(0,sill)[1]}" x2="${P(m,0)[0]+1.2}" y2="${P(0,head)[1]}" stroke="#4E7E90" stroke-width="1"/>`}
      if(kind==="door")g+=`<rect x="${P(b0,0)[0]+1}" y="${P(0,head)[1]}" width="${(b1-b0)*k-2}" height="${(head-sill)*k}" fill="#B98B5E"/>`;
      z=head}
    if(top>z)g+=cut([P(b0,z),P(b1,z),P(b1,top),P(b0,top)])}
  {const [,a0,a1,at,doors]=INNER[0];if(x>=a0&&x<=a1){const d=doors.find(([d0,d1])=>x>d0&&x<d1);const t=ceilU(at);if(d)g+=cut([P(at-.05,3.5),P(at+.05,3.5),P(at+.05,t),P(at-.05,t)]);else g+=cut([P(at-.05,1.4),P(at+.05,1.4),P(at+.05,t),P(at-.05,t)])}}
  if(x>=DECK.x0&&x<=DECK.x1){g+=PG([P(DECK.y0,-.17),P(DECK.y1,-.02),P(DECK.y1,-.17)],C.poche)+cut([P(DECK.y0,-.17),P(DECK.y1,-.17),P(DECK.y1,-.02),P(DECK.y0,-.02)])+`<line x1="${P(7.96,0)[0]}" y1="${P(0,-.02)[1]}" x2="${P(7.96,0)[0]}" y2="${P(0,1.05)[1]}" stroke="#4E7E90" stroke-width="1.6"/>`}
  else if(x>DECK.x1)g+=thin([P(DECK.y0,-.17),P(DECK.y1,-.17),P(DECK.y1,-.02),P(DECK.y0,-.02)]);
  if(cutsStair(x)){const st=[P(STAIR.bottom,0)];for(let i=1;i<STAIR.risers;i++){const y=STAIR.bottom-STAIR.going*(i-1);st.push(P(y,STAIR.rise*i),P(y-STAIR.going,STAIR.rise*i))}
    st.push(P(STAIR.top,0));g+=PG(st,C.poche)}
  // room names where the cut passes, and the levels
  ["lower","upper"].forEach(lv=>{ROOMS.filter(r=>r.lv===lv&&!r.out&&x>=r.x0&&x<=r.x1).forEach(r=>{const p=P((r.y0+r.y1)/2,(lv==="lower"?LO.ffl:UP.ffl)+.45);g+=T(p[0],p[1],r.id==="hall"?"Hall":r.n,{s:r.id==="hall"?8.5:10.5,w:600,a:"middle"})})});
  if(x>=DECK.x0&&x<=DECK.x1)g+=T(P(6.75,.5)[0],P(6.75,.5)[1],"Deck",{s:10,w:600,a:"middle"});
  g+=levelMark(P(8.4,0)[0],P(0,0)[1],"FFL RL 10.000",{len:62})+levelMark(P(8.4,0)[0],P(0,1.4)[1],"FFL RL 11.400",{len:62})+levelMark(P(8.4,0)[0],P(0,ceilU(.6)+.25)[1],`RL ${fmt(RL0+ceilU(.6)+.25,3)}`,{len:62});
  g+=dimV(P(-7.3,0)[0],P(0,0)[1],P(0,1.4)[1],"1 400");
  g+=T(P(-7.2,0)[0],P(0,0)[1]+14,"half a level",{s:8.5,mono:true,a:"middle",c:C.muted});
  g+=T(P(-9.2,0)[0],P(0,-2.2)[1],"S · street",{s:9,mono:true,c:C.muted})+T(P(10.3,0)[0],P(0,-2.2)[1],"view · N",{s:9,mono:true,a:"end",c:C.muted});
  return g}
function keyPlan(x0,y0,k=4.4){const P=(x,y)=>[x0+(x+7.6)*k,y0+(8.4-y)*k];let g=`<rect x="${P(-7,5.5)[0]}" y="${P(-7,5.5)[1]}" width="${14*k}" height="${5.5*k}" fill="#F1EEE9" stroke="${C.ink}" stroke-width=".8"/><rect x="${P(-7,0)[0]}" y="${P(-7,0)[1]}" width="${14*k}" height="${4.5*k}" fill="#FFFFFF" stroke="${C.ink}" stroke-width=".8"/><rect x="${P(DECK.x0,8)[0]}" y="${P(DECK.x0,8)[1]}" width="${9*k}" height="${2.5*k}" fill="${C.timber}" stroke="${C.ink}" stroke-width=".5"/>`;
  const xx=P(s.cut,0)[0],t=P(0,9)[1],b=P(0,-5.2)[1];g+=`<line x1="${xx}" y1="${t}" x2="${xx}" y2="${b}" stroke="${C.red}" stroke-width="1.4" stroke-dasharray="7 2 2 2"/>`+[t,b].map(y=>`<path d="M${xx},${y} l-8,0 m3,-3 l-3,3 l3,3" fill="none" stroke="${C.red}" stroke-width="1.4"/>`).join("")+T(xx+3,t+3,"A",{s:9,w:700,c:C.red});
  return g+T(x0,y0-6,"KEY PLAN",{s:8.5,mono:true,ls:".08em",c:C.muted})}

// ---------- drawing conventions: natural 520 × 300
function elevationSVG(){const k=26,ox=260,oy=170,P=(x,z)=>[ox-x*k,oy-z*k];let g="";   // looking south at the north face: east is on the LEFT
  const gz=x=>ground(x,8.2)-RL0,gl=[];for(let x=-9;x<=9.01;x+=.25)gl.push(P(x,gz(x)));
  g+=`<defs><pattern id="earth2" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="#E3EDD9"/><line x1="0" y1="0" x2="0" y2="7" stroke="#9DB98A" stroke-width="1"/></pattern></defs>`;
  g+=PG([P(-9,-1.9),...gl,P(9,-1.9)],"url(#earth2)");
  const O=(a,fill,sw=1.1)=>PG(a,fill,{st:C.ink,sw});
  // upper block, visible above the lower roof; its clerestory windows show above the front roof edge
  const lrTop=ceilL(6.5)+.25;
  g+=O([P(7,lrTop),P(-7,lrTop),P(-7,ceilU(0)),P(7,ceilU(0))],"#FFFFFF");
  OPEN.filter(o=>o[0]==="UN"&&o[5]==="window").forEach(([,a,b,sill,head])=>{g+=PG([P(a,Math.max(sill,lrTop)),P(b,Math.max(sill,lrTop)),P(b,head),P(a,head)],C.glass,{st:C.ink,sw:.6})});
  g+=O([P(7.4,ceilU(.6)),P(-7.4,ceilU(.6)),P(-7.4,ceilU(.6)+.25),P(7.4,ceilU(.6)+.25)],"#E2DED7",1.4);
  // lower block, its sliders and eave
  g+=O([P(7,gz(7)),P(-7,gz(-7)),P(-7,ceilL(5.5)),P(7,ceilL(5.5))],"#FFFFFF");
  OPEN.filter(o=>o[0]==="LN").forEach(([,a,b,sill,head])=>{g+=PG([P(a,sill),P(b,sill),P(b,head),P(a,head)],C.glass,{st:C.ink,sw:.7});const n=Math.max(2,Math.round((b-a)/2.2));for(let i=1;i<n;i++){const xx=a+(b-a)*i/n;g+=`<line x1="${P(xx,0)[0]}" y1="${P(0,sill)[1]}" x2="${P(xx,0)[0]}" y2="${P(0,head)[1]}" stroke="${C.ink}" stroke-width=".6"/>`}});
  g+=O([P(7.4,ceilL(6.5)),P(-7.4,ceilL(6.5)),P(-7.4,lrTop),P(7.4,lrTop)],"#E2DED7",1.4);
  // the deck in front: posts, slab, glass balustrade
  [-3.3,1,5.3].forEach(x=>{g+=PG([P(x-.07,gz(x)),P(x+.07,gz(x)),P(x+.07,-.17),P(x-.07,-.17)],C.timber,{st:C.ink,sw:.6})});
  g+=O([P(DECK.x0,-.17),P(DECK.x1,-.17),P(DECK.x1,-.02),P(DECK.x0,-.02)],C.timber,1);
  g+=PG([P(DECK.x0,-.02),P(DECK.x1,-.02),P(DECK.x1,1.0),P(DECK.x0,1.0)],"#DCEBF0",{st:C.ink,sw:.5,op:.65})+O([P(DECK.x0,1),P(DECK.x1,1),P(DECK.x1,1.05),P(DECK.x0,1.05)],C.timber,.6);
  g+=PL(gl,C.ink,2.4);   // the ground line: the heaviest line on an elevation
  g+=levelMark(P(-8.1,0)[0],P(0,0)[1],"FFL 10.000",{len:44})+levelMark(P(-8.1,0)[0],P(0,ceilU(.6)+.25)[1],`RL ${fmt(RL0+ceilU(.6)+.25,3)}`,{len:44});
  g+=dimH(P(7,0)[0],P(-7,0)[0],P(0,-1.55)[1]+2,"14 000")+dimV(P(8.2,0)[0],P(0,0)[1],P(0,ceilL(5.5))[1],"3 300");
  g+=T(P(7.2,0)[0],P(0,-1.55)[1]+17,"E",{s:9,mono:true,c:C.muted})+T(P(-7.2,0)[0],P(0,-1.55)[1]+17,"W",{s:9,mono:true,c:C.muted,a:"end"});
  return g}
function isoSVG(){const cam=isoCam(10.5,262,150);let g=render(prisms(4,{extent:[-9,9,-7,10]}),cam,{sw:.7});
  // the 30° angles at the front corner of the lower block
  const c0=cam.proj([9,10,-2.6]),r=40;g+=`<line x1="${c0[0]-r-14}" y1="${c0[1]}" x2="${c0[0]+r+14}" y2="${c0[1]}" stroke="${C.red}" stroke-width=".9" stroke-dasharray="4 3"/>`;
  [-1,1].forEach(sd=>{const a=Math.PI/6;g+=`<path d="M${c0[0]+sd*r},${c0[1]} A${r},${r} 0 0 ${sd>0?0:1} ${c0[0]+sd*r*Math.cos(a)},${c0[1]-r*Math.sin(a)}" fill="none" stroke="${C.red}" stroke-width="1.2"/>`+T(c0[0]+sd*(r+18),c0[1]-8,"30°",{s:11,w:700,c:C.red,a:"middle"})});
  return g}
function perspSVG(){const cam=perspCam([22,27,1.4],[0,2,1.4],560,262,160);let g="";
  const v1=cam.vp([1,0,0])||cam.vp([-1,0,0]),v2=cam.vp([0,1,0])||cam.vp([0,-1,0]);
  g+=`<line x1="-400" y1="${cam.horizon}" x2="920" y2="${cam.horizon}" stroke="${C.red}" stroke-width=".9" stroke-dasharray="6 4"/>`;
  g+=render(prisms(4,{extent:[-9,9,-7,10]}),cam,{sw:.7});
  // construction lines from the top corners back to each vanishing point
  const corners=[[7,5.5,ceilL(5.5)],[-7,5.5,ceilL(5.5)],[7,0,ceilL(0)],[7,-4.5,ceilU(-4.5)],[7,5.5,terr(7,5.5)]];
  [v1,v2].forEach((v,i)=>{if(!v)return;corners.forEach(c=>{const p=cam.proj(c);g+=`<line x1="${p[0]}" y1="${p[1]}" x2="${v[0]}" y2="${v[1]}" stroke="${C.red}" stroke-width=".5" opacity=".55"/>`});
    const vx=clamp(v[0],12,508);g+=`<circle cx="${vx}" cy="${v[1]}" r="4" fill="${C.red}"/>`+T(vx+(v[0]<12?6:v[0]>508?-6:0),v[1]-9,`VP${i+1}${v[0]<12?" ←":v[0]>508?" →":""}`,{s:10,w:700,c:C.red,a:v[0]<12?"start":v[0]>508?"end":"middle"})});
  g+=T(506,cam.horizon+14,"horizon line (eye level)",{s:9,mono:true,c:C.red,a:"end"});
  return g}
const DVIEWS={plan:{n:"Plan",long:"Plan (looking down)",note:"A horizontal cut 1.2 m above the floor, seen from above. Cut walls are solid; windows are thin lines; doors show their swing."},
  elev:{n:"Elevation",long:"North elevation",note:"Looking straight at one face, with no depth. Heights and widths are true; the ground line is the heaviest line."},
  iso:{n:"Isometric",long:"Isometric (30°)",note:"Verticals stay vertical; width and depth go back at 30° to the horizontal. True lengths along all three axes; no vanishing points."},
  persp:{n:"Perspective",long:"Two-point perspective",note:"How the eye sees it: horizontal lines run back to two vanishing points on the horizon line. Things further away look smaller."}};
function convSVG(){const v=s.dview;if(v==="plan")return `<g transform="translate(52,8) scale(.74)">${planSVG(s.level,"none",{cut:false})}</g>`;if(v==="elev")return elevationSVG();if(v==="iso")return isoSVG();return perspSVG()}
function lineKey(x,y,short){const rows=[[short?"Outline, cut":"Outline, cut, ground line",`<line x1="0" y1="0" x2="54" y2="0" stroke="${C.ink}" stroke-width="2.4"/>`],["Visible edge",`<line x1="0" y1="0" x2="54" y2="0" stroke="${C.ink}" stroke-width="1"/>`],
  [short?"Hidden":"Hidden or overhead",`<line x1="0" y1="0" x2="54" y2="0" stroke="${C.ink}" stroke-width="1" stroke-dasharray="5 3"/>`],["Centre line",`<line x1="0" y1="0" x2="54" y2="0" stroke="${C.ink}" stroke-width=".7" stroke-dasharray="12 3 2 3"/>`],
  [short?"Dimension":"Dimension (mm)",`<line x1="0" y1="0" x2="54" y2="0" stroke="${C.muted}" stroke-width=".8"/><line x1="-4" y1="4" x2="4" y2="-4" stroke="${C.muted}" stroke-width="1.4"/><line x1="50" y1="4" x2="58" y2="-4" stroke="${C.muted}" stroke-width="1.4"/>`],
  [short?"Section line":"Section line A–A",`<line x1="0" y1="0" x2="54" y2="0" stroke="${C.red}" stroke-width="1.4" stroke-dasharray="12 3 2 3"/><path d="M54,0 l0,-9 m-3,4 l3,-4 l3,4" fill="none" stroke="${C.red}" stroke-width="1.4"/>`]];
  return rows.map(([n,l],i)=>`<g transform="translate(${x},${y+i*22})">${l}</g>`+T(x+68,y+i*22+4,n,{s:11})).join("")}

// ---------- the step drawings, 800 × 420 (shown when 3D can't load, and in lite mode)
const DRAW={
 site(){const sp=sitePlan();let g=paper(800,420)+`<g transform="translate(14,16) scale(1.27)">${sp.svg}</g>`;
   const x=520,[a,b]=dayRange(s.season);g+=title(x,40,"SITE ANALYSIS",`${SEASONS[s.season].n.toUpperCase()}`);
   const rows=[["Sun",`${clock(a)} to ${clock(b)} · noon ${fmt(sunAlt(s.season,12))}° up`],["Living faces",faceWord(s.rot)],["Winter sun on the glass",`about ${fmt(glassSun(s.rot),1)} h a day`],["View",viewWord(s.rot)],["Slope","falls about 1 in 6 to the north"],["Privacy","street to the south: small high windows"]];
   rows.forEach(([l,v],i)=>{g+=T(x,84+i*40,l.toUpperCase(),{s:9.5,mono:true,ls:".06em",c:C.rose})+T(x,100+i*40,v,{s:13,w:600})});return g},
 massing(){let g=paper(800,420)+title(24,30,"METAMORPHOSIS","FROM SITE TO HOUSE, ONE DESIGN MOVE AT A TIME")+`<g transform="translate(20,40)">${metamorphosis(760)}</g>`;
   const st=STAGES[s.stage];g+=T(24,252,`0${s.stage+1} · ${st.n}`,{s:22,w:700})+`<foreignObject x="24" y="266" width="752" height="140"><div xmlns="http://www.w3.org/1999/xhtml" style="font:15px/1.45 ${FONT};color:${C.ink}">${esc(st.move)}<div style="margin-top:8px;font:12px ${MONO};color:${C.rose}">${esc(st.form)}</div></div></foreignObject>`;return g},
 plans(){let g=paper(800,420)+`<g transform="translate(20,8) scale(1.04)">${planSVG(s.level,s.colour)}</g>`;
   g+=title(520,40,`FLOOR PLAN · ${levelName(s.level).toUpperCase()}`,s.colour==="zones"?"COLOURED BY ZONE":"COLOURED BY ROOM")+planLegend(520,72,s.colour,s.level);
   g+=T(520,s.colour==="zones"?150:252,"Scale bar: 1:100 on the original drawing",{s:10,mono:true,c:C.muted})+`<g transform="translate(520,${s.colour==="zones"?162:262})">${scaleBar(0,0,24,5)}</g>`;return g},
 section(){let g=paper(800,420)+title(24,32,"SECTION A–A",`CUT AT x = ${fmt(s.cut,1)} m · LOOKING WEST`)+`<g transform="translate(14,92) scale(1.3)">${sectionSVG()}</g>`+keyPlan(640,44,3.2);return g},
 conv(){const d=DVIEWS[s.dview];let g=paper(800,420)+title(24,32,d.long.toUpperCase(),"SAME HOUSE, FOUR DRAWING TYPES")+`<g transform="translate(14,60) scale(1.0)">${convSVG()}</g>`;
   g+=`<foreignObject x="560" y="56" width="220" height="110"><div xmlns="http://www.w3.org/1999/xhtml" style="font:13px/1.4 ${FONT};color:${C.ink}">${esc(d.note)}</div></foreignObject>`+lineKey(566,196);
   g+=T(560,350,"Scale 1:100: 1 m on the house is",{s:11,c:C.muted})+T(560,366,"10 mm on the paper.",{s:11,c:C.muted});return g}};
DRAW.test=()=>DRAW[s.view==="test"?"site":s.view]();

// ---------- the close-up card: the matching 2D drawing for the step. 420 × 260.
function drawClose(){const v=s.view==="test"?"site":s.view;
  if(v==="site"){const sp=sitePlan();return paper(420,260)+`<g transform="translate(8,4) scale(.83)">${sp.svg}</g>`+title(326,22,"SITE PLAN")+T(326,50,"LIVING FACES",{s:8.5,mono:true,c:C.rose})+T(326,66,faceWord(s.rot),{s:faceWord(s.rot).length>10?9.5:13,w:700})+T(326,96,"WINTER SUN",{s:8.5,mono:true,c:C.rose})+T(326,112,`${fmt(glassSun(s.rot),1)} h a day`,{s:13,w:700})+T(326,142,"SUN NOW",{s:8.5,mono:true,c:C.rose})+T(326,158,sunAlt(s.season,s.hour)>0?`${fmt(sunAlt(s.season,s.hour))}° up`:"set",{s:13,w:700})+T(326,174,`${clock(s.hour)}, ${SEASONS[s.season].short}`,{s:9.5,c:C.muted})}
  if(v==="massing"){const st=STAGES[s.stage];let g=paper(420,260)+title(16,22,`0${s.stage+1} · ${st.n.toUpperCase()}`)+stageThumb(s.stage,212,112,6.4);
    g+=STAGES.map((x,i)=>`<circle cx="${352+i*12}" cy="18" r="4" fill="${i===s.stage?C.red:i<s.stage?C.rose:C.line}"/>`).join("");
    return g+`<foreignObject x="16" y="206" width="390" height="54"><div xmlns="http://www.w3.org/1999/xhtml" style="font:11.5px/1.35 ${FONT};color:${C.ink}">${esc(st.form)}</div></foreignObject>`}
  if(v==="plans")return paper(420,260)+`<g transform="translate(4,4) scale(.64)">${planSVG(s.level,s.colour)}</g>`+title(278,24,levelName(s.level).toUpperCase())+`<g transform="translate(278,44) scale(.82)">${planLegend(0,0,s.colour,s.level)}</g>`;
  if(v==="section")return paper(420,260)+title(14,22,"SECTION A–A",`x = ${fmt(s.cut,1)} m, looking west`)+`<g transform="translate(-4,58) scale(.76)">${sectionSVG()}</g>`+keyPlan(318,40,1.6);
  if(v==="conv"){const d=DVIEWS[s.dview];return paper(420,260)+title(14,22,d.long.toUpperCase())+`<g transform="translate(0,34) scale(.57)">${convSVG()}</g>`+(s.dview==="plan"||s.dview==="elev"?`<g transform="translate(300,50) scale(.8)">${lineKey(0,0,true)}</g>`:`<foreignObject x="304" y="40" width="108" height="210"><div xmlns="http://www.w3.org/1999/xhtml" style="font:11px/1.4 ${FONT};color:${C.ink}">${esc(d.note)}</div></foreignObject>`)}
  return paper(420,260)}

// ---------- steps
const steps=[
 {k:"site",lab:"Site",cap:"Turn the house on its hillside, then move the Sun through the day and the seasons. In New Zealand the Sun is to the <b>north</b>.",
  big:"<b>Site analysis</b> comes first: the <b>north point</b>, the <b>contours</b> (lines of equal height), the <b>sun path</b>, the <b>views</b>, the street and the neighbours. In Aotearoa the living spaces face <b>north</b> for sun, and here that is also the view.",
  trap:"Copying a northern-hemisphere rule. In New Zealand the Sun moves across the NORTH sky, so south-facing rooms get almost no direct sun.",
  exam:()=>`The living room faces ${faceWord(s.rot)}, so in midwinter its glass gets about ${fmt(glassSun(s.rot),1)} hours of sun a day, and the view is ${viewWord(s.rot)}. The contours show the land falls about 1 in 6 to the north.`,
  chips:["face","winterSun","sunNow","viewChip"],controls:["rot","season","hour"]},
 {k:"massing",lab:"Massing",cap:"Step the form from the bare site to the finished house, or play the whole sequence. Each step is one design move.",
  big:"<b>Design development</b>: start simple and change one thing at a time. The <b>split-level</b> lets the <b>form</b> follow the slope, and the <b>function</b> (public rooms below, private rooms above) shapes it.",
  trap:"Jumping straight to the final house. Markers want to see how your design developed, with a reason for each change.",
  exam:()=>`Stage ${s.stage+1}, ${STAGES[s.stage].n.toLowerCase()}: ${STAGES[s.stage].move}`,
  chips:["stage","move"],controls:["stage","play"]},
 {k:"plans",lab:"Floor plans",cap:"Switch between the two levels and colour the plan by room or by zone. The plan is a horizontal cut about 1.2 m above the floor.",
  big:"<b>Zoning</b> groups rooms by use: <b>public</b> (living, kitchen, deck), <b>private</b> (bedrooms, bathroom) and <b>circulation</b> (entry, hall, stair). Good <b>circulation</b> links them without walking through other rooms.",
  trap:"Drawing a plan as the roof seen from above. A floor plan is a horizontal cut through the walls, so cut walls are solid and windows show as thin lines.",
  exam:()=>s.level==="lower"?"The lower level holds the public zone: living, kitchen and dining open north onto the deck for sun and the view, with the stair as the only link to the private rooms half a level up.":"The upper level holds the private zone: two bedrooms and the bathroom off a hall, beside the entry from the street. Clerestory windows bring north sun into the bedrooms.",
  chips:["level","ffl","area","zoneChip"],controls:["level","colour"]},
 {k:"section",lab:"Section",cap:"Slide the cut through the house. The 3D model is sliced where the red line is, and the drawing shows the same section.",
  big:"A <b>section</b> is a vertical cut. Things you <b>cut through</b> are drawn solid with heavy lines; things <b>beyond</b> the cut are drawn with thin lines. It shows heights and <b>levels</b> that a plan can't.",
  trap:"Mixing up the section line and the section. The red <b>section line</b> on the plan (A–A, with arrows) shows where the cut is and which way you're looking.",
  exam:()=>`Section A–A at x = ${fmt(s.cut,1)} m cuts through ${cutRooms(s.cut).join(", ")}${cutsStair(s.cut)?" and the stair":""}. It shows the 1.4 m split between the floors (RL 10.000 and RL 11.400) following the slope.`,
  chips:["cutChip","cuts","split"],controls:["cut"]},
 {k:"conv",lab:"Drawing conventions",cap:"Switch the same house between plan, elevation, isometric and perspective. Turn it in 3D, then compare the drawing below.",
  big:"<b>Orthographic</b> drawings (plan, elevation, section) show true shapes, <b>to scale</b> (here 1:100) with <b>dimensions</b> in millimetres. <b>Isometric</b> uses 30° lines; <b>perspective</b> uses vanishing points.",
  trap:"Writing dimensions in metres or adding units to every number. On architectural drawings dimensions are in millimetres, without “mm” after each one.",
  exam:()=>`${DVIEWS[s.dview].long}: ${DVIEWS[s.dview].note}`,
  chips:["dview","scaleTxt","lines"],controls:["dview","level"]},
 {k:"test",lab:"Test yourself",cap:"Seven challenges across the whole design. Use the controls, then press Check.",chips:["face","stage","level","cutChip","dview"],controls:["rot","season","hour","stage","level","colour","cut","dview"]}];

// Kupu Māori: only terms already checked and used in other study machines, copied exactly
const KUPU=[{mi:"hoahoa",en:"to design, plan; a plan of a building",ta:1290},{mi:"kaihoahoa",en:"designer, architect",ta:1924},{mi:"mahere",en:"map, plan, chart",ta:3350},
  {mi:"raki",en:"north",ta:6446},{mi:"tonga",en:"south",ta:8433},{mi:"rā",en:"sun",ta:6405},{mi:"kāpehu",en:"compass",ta:2226},
  {mi:"rōnaki",en:"gradient, slope",ta:13240,note:"Also means to glide or slope."},{mi:"āwhata",en:"scale (of a map or drawing)",ta:15342,chip:"scaleTxt"},
  {mi:"āhuatanga hoahoa",en:"design element",ta:38908},{mi:"tauira",en:"example, pattern, model",ta:7706}];
Object.entries({site:["raki","tonga","rā","kāpehu","rōnaki"],massing:["hoahoa","āhuatanga hoahoa","tauira"],plans:["mahere","kaihoahoa"],section:["rōnaki","hoahoa"],conv:["āwhata","mahere"]}).forEach(([k,a])=>{const st=steps.find(x=>x.k===k);if(st)st.kupu=a});

// ---------- practice questions: written for this machine in the style of NCEA DVC and technology tasks, not real exam questions
const QUESTIONS=[
 {step:"site",q:"Sketch a site analysis of a sloping section like this one. Show the north point, contours, sun path, views, the street and where privacy is needed, and annotate each."},
 {step:"site",q:"Explain how the orientation of this house responds to the sun and the view. Refer to north, the winter and summer sun, and the slope of the site."},
 {step:"massing",q:"Draw a four-stage 'metamorphosis' sequence showing how a simple block could develop into a house that follows the slope. Annotate the design move at each stage."},
 {step:"massing",q:"Explain one advantage and one disadvantage of a split-level form on a sloping site, compared with one flat block."},
 {step:"plans",q:"Explain how the floor plans separate public and private zones, and how circulation links them. Use the room names and levels."},
 {step:"plans",q:"Draw a floor plan of one bedroom at 1:50 using correct conventions for walls, a window and a door with its swing. Add a north point and two dimensions in millimetres."},
 {step:"section",q:"Explain what a section drawing shows that a floor plan cannot. Use a section through the stair as your example."},
 {step:"section",q:"On a section, how do you show the difference between parts that are cut and parts seen beyond the cut? Sketch a small example and label it."},
 {step:"conv",q:"Compare an isometric drawing with a two-point perspective of the same house. When would a designer use each one, and why?"},
 {step:"conv",q:"The house is 14 m wide and 10 m deep (without the deck). How big is it on a 1:100 drawing, and on a 1:50 drawing? Show your working."},
 {step:"conv",q:"Describe four line types used on orthographic drawings (outline, hidden, centre and dimension lines) and what each one tells the reader."}];
const QB_KEY="house-questions-v1";let ADDED=[];try{ADDED=JSON.parse(localStorage.getItem(QB_KEY)||"[]")}catch(e){}

const sel=(id,label,options,get,set)=>({type:"select",id,label,options,get,set});
let API,playT=null;
const stopPlay=()=>{if(playT){clearInterval(playT);playT=null}};
API=StudyKit.mount({kupu:KUPU,scene3d:house3d,
  eyebrow:"Technology · Design and Visual Communication", title:"The house design machine", crumb:"Site analysis, massing, floor plans, sections and drawing conventions for one split-level house on a New Zealand hillside", homeHash:"y9",
  fig:"FIG. 23 · A HOUSE ON A HILL, SITE TO DRAWINGS", railTitle:"From the site to a set of drawings",
  badge:{label:"DVC and technology · Years 9–13"},
  mainBox:"0 0 800 420", mainPhoneBig:true, mainLabel:"An architect's white card model of a split-level house on a stepped green hillside, made in Blender, with the sun path, a section cut and four drawing views", closeBox:"0 0 420 260",
  state:s, steps,
  onStep:(x,stp)=>{if(stp.k!=="test")s.view=stp.k;if(stp.k!=="massing")stopPlay()},
  controls:[
    {type:"range",id:"rot",label:"Turn the house",min:-90,max:90,step:15,get:()=>s.rot,set:(x,v)=>{s.rot=v;s.view="site"},fmt:()=>`living faces ${faceWord(s.rot)}`},
    sel("season","Season",Object.entries(SEASONS).map(([k,v])=>[k,v.n]),()=>s.season,(x,v)=>{s.season=v;s.view="site"}),
    {type:"range",id:"hour",label:"Time of day",min:6,max:20,step:.5,get:()=>s.hour,set:(x,v)=>{s.hour=v;s.view="site"},fmt:()=>`${clock(s.hour)}${sunAlt(s.season,s.hour)>0?` · sun ${fmt(sunAlt(s.season,s.hour))}° up`:" · below the horizon"}`},
    {type:"range",id:"stage",label:"Design stage",min:0,max:4,step:1,get:()=>s.stage,set:(x,v)=>{stopPlay();s.stage=v;s.view="massing"},fmt:()=>`0${s.stage+1} · ${STAGES[s.stage].n}`},
    {type:"button",id:"play",label:"▶ Play the sequence",onClick:()=>{stopPlay();s.view="massing";s.stage=0;playT=setInterval(()=>{if(s.stage>=4){stopPlay();return}s.stage++;API.redraw()},RM?400:1500)}},
    sel("level","Level",[["lower","Lower level · living (RL 10.000)"],["upper","Upper level · entry, bedrooms (RL 11.400)"]],()=>s.level,(x,v)=>{s.level=v;if(s.view!=="conv")s.view="plans"}),
    sel("colour","Colour by",[["rooms","Rooms"],["zones","Zones: public, private, circulation"]],()=>s.colour,(x,v)=>{s.colour=v;s.view="plans"}),
    {type:"range",id:"cut",label:"Section line A–A",min:-6.6,max:6.6,step:.1,get:()=>s.cut,set:(x,v)=>{s.cut=v;s.view="section"},fmt:()=>`x = ${fmt(s.cut,1)} m · ${cutsStair(s.cut)?"the stair":cutRooms(s.cut).join(" + ")}`},
    sel("dview","Drawing",Object.entries(DVIEWS).map(([k,v])=>[k,v.long]),()=>s.dview,(x,v)=>{s.dview=v;s.view="conv"})],
  drawMain:()=>DRAW[viewNow()](),
  drawClose,
  chips:()=>{const lvRooms=ROOMS.filter(r=>r.lv===s.level),alt=sunAlt(s.season,s.hour);
    return{face:["LIVING FACES",faceWord(s.rot).includes("-")?faceAbbr(s.rot):faceWord(s.rot),s.rot===0],winterSun:["WINTER SUN ON GLASS",`${fmt(glassSun(s.rot),1)} h a day`],sunNow:["SUN NOW",alt>0?`${fmt(alt)}° up, ${faceAbbr(sunAz(s.season,s.hour))}`:"set"],viewChip:["VIEW",viewWord(s.rot).split(" ").slice(0,Math.abs(s.rot)<=30?2:3).join(" ").replace(/:$/,"")],
      stage:["STAGE",`0${s.stage+1} · ${STAGES[s.stage].n}`,true],move:["FORM",STAGES[s.stage].chip],
      level:["LEVEL",s.level==="lower"?"Lower":"Upper",true],ffl:["FLOOR LEVEL",`RL ${fmt(RL0+(s.level==="lower"?0:1.4),3)}`],area:["FLOOR AREA",s.level==="lower"?"77 m² + deck":"63 m²"],zoneChip:["ZONES",[...new Set(lvRooms.map(r=>r.zone))].map(z=>({public:"public",private:"private",circ:"circulation"})[z]).join(" + ")],
      cutChip:["SECTION A–A",`x = ${fmt(s.cut,1)} m`,true],cuts:["CUTS THROUGH",(cutsStair(s.cut)?["stair"]:[]).concat(cutRooms(s.cut,true)).join(", ")],split:["SPLIT","1.4 m"],
      dview:["DRAWING",DVIEWS[s.dview].n,true],scaleTxt:["SCALE","1:100"],lines:["PROJECTION",s.dview==="persp"?"2 vanishing points":s.dview==="iso"?"30° parallel":"orthographic"]}},
  challenges:[
    {q:"Turn the house so its living room faces east. How much winter sun does the big glass get now?",check:()=>s.rot===90,ok:()=>`Facing east, about ${fmt(glassSun(90),1)} hours, all in the morning. Facing north it gets about ${fmt(glassSun(0),1)} hours.`,no:()=>`It faces ${faceWord(s.rot)}. East is a quarter turn clockwise from north.`},
    {q:"Show the Sun at midday in midwinter.",check:()=>s.season==="winter"&&Math.abs(s.hour-12)<=.5,ok:()=>`Yes: only about ${fmt(sunAlt("winter",12))}° up, low in the northern sky, so it reaches deep into north-facing rooms.`,no:()=>s.season!=="winter"?"Midwinter in New Zealand is in June.":"Now move the time to midday."},
    {q:"Show the design stage where the form first follows the slope.",check:()=>s.stage===2,ok:"Yes: the split-level. The back half steps up 1.4 m, so each half sits close to the ground.",no:()=>`That's stage ${s.stage+1}, ${STAGES[s.stage].n.toLowerCase()}. Which move stops the block digging into the hill?`},
    {q:"Show the floor plan of the level you enter from the street.",check:()=>s.level==="upper",ok:"Yes: the street is uphill to the south, so the front door is on the upper level, with the bedrooms.",no:"The street is at the top of the slope. Which level is closer to it?"},
    {q:"Colour the plan by zone, on the level that holds the public zone.",check:()=>s.colour==="zones"&&s.level==="lower",ok:"Yes: living, kitchen and deck are the public zone, on the lower level facing north.",no:()=>s.colour!=="zones"?"First colour the plan by zones.":"The public zone is where people gather: living and kitchen."},
    {q:"Slide the section line so it cuts through the stair.",check:()=>cutsStair(s.cut),ok:"Yes: now the section shows the eight risers climbing the 1.4 m between the two floors.",no:()=>`At x = ${fmt(s.cut,1)} m it cuts ${cutRooms(s.cut).join(" and ")}. The stair is at the east end, inside the entry.`},
    {q:"Show the drawing type whose lines go back at 30° to the horizontal.",check:()=>s.dview==="iso",ok:"Yes: isometric. Verticals stay vertical and the other two axes are drawn at 30°.",no:()=>`That's ${DVIEWS[s.dview].long.toLowerCase()}. Which view has no vanishing points but still shows three faces?`}],
  retrieval:{q:"In New Zealand, which way should a house's main living spaces usually face to get the most winter sun?",options:["North","South","East","West"],answer:0,why:"In the Southern Hemisphere the Sun crosses the northern sky, low in winter. North-facing glass catches it for most of the day; south-facing rooms get almost none."},
  papers:[{label:"NZQA past exams and exemplars (Design and Visual Communication)",url:"https://www2.nzqa.govt.nz/ncea/subjects/past-exams-and-exemplars/"}],
  truth:"An original practice design, simplified: not a buildable design (no structure, insulation, drainage, Building Code or district plan checks), and not based on any real house or firm. The site is an imaginary north-facing slope. Sun positions come from a simple formula for about Wellington's latitude (41° S), in sun time, ignoring hills, trees and neighbours. Drawing conventions differ a little between schools and offices: check your school's DVC conventions with your teacher.",
  footer:"Covers site analysis (north point, contours, sun path, views, privacy), form and function, design development and massing, split-level design, floor plans and zoning (public, private, circulation), sections (section lines, cut and beyond, levels), and drawing conventions (plan, elevation, isometric at 30°, two-point perspective, line types, scale 1:100 and dimensions in millimetres)."
});

// the app icon: a plan glyph until the kit has its own house glyph
try{if(StudyKit.glyph("house")===StudyKit.glyph("energy"))document.querySelector(".apphead .appicon").innerHTML=StudyKit.glyph("plan")}catch(e){}

// ---------- the practice question bank. Allen can add to it (study/tutor.js, add_question).
const bank={list:()=>[...QUESTIONS,...ADDED.map(x=>({...x,added:true}))],
  add(q){const item={step:steps.some(x=>x.k===q.step&&x.k!=="test")?q.step:"",q:String(q.question||"").replace(/[<>]/g,"").slice(0,900)};if(item.q.length<10)return null;ADDED.push(item);ADDED=ADDED.slice(-30);try{localStorage.setItem(QB_KEY,JSON.stringify(ADDED))}catch(e){}paintBank();return item}};
try{window.StudyKit.current.cfg.questionBank=bank}catch(e){}
const host=document.createElement("section");host.className="card qbank";host.setAttribute("aria-labelledby","qb-h");
const qcss=document.createElement("style");qcss.textContent=`.qbank{margin-top:18px}.qbank h3{margin:0 0 4px}.qbank>p{margin:0 0 14px;color:var(--as-muted,#654A4E);font-size:14px}.qbank ol{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.qbank li{border:1px solid var(--as-line,#E4D9DE);border-radius:14px;padding:12px 14px;display:grid;gap:8px}.qbank li b{font:600 11px "IBM Plex Mono",monospace;letter-spacing:.06em;color:#916A70;text-transform:uppercase}.qbank li .acts{display:flex;gap:8px;flex-wrap:wrap}
.qbank li.added{border-style:dashed}.qbank .q{font-size:15px;line-height:1.5}`;document.head.appendChild(qcss);
function paintBank(){const list=bank.list();host.innerHTML=`<h3 id="qb-h">Practice questions</h3><p>Written for this machine in the style of NCEA Design and Visual Communication and technology tasks, not real exam questions. Open the tool for each one, or work through it with Allen. Ask Allen for more and he'll add them here.</p><ol>${list.map((x,i)=>`<li class="${x.added?"added":""}"><b>${esc((steps.find(st=>st.k===x.step)||{lab:"House design"}).lab)}${x.added?" · added by Allen":""}</b><span class="q">${esc(x.q)}</span><span class="acts">${x.step?`<button class="btn" type="button" data-qopen="${x.step}">Open the tool</button>`:""}<button class="btn primary" type="button" data-qallen="${i}">Work through it with Allen</button></span></li>`).join("")}</ol>`}
paintBank();
(document.querySelector(".card.practise")||document.querySelector(".bench")).insertAdjacentElement("afterend",host);
host.addEventListener("click",e=>{const o=e.target.closest("[data-qopen]"),a=e.target.closest("[data-qallen]");
  if(o){const i=steps.findIndex(x=>x.k===o.dataset.qopen);if(i>=0){API.setStep(i);try{document.querySelector(".bench").scrollIntoView({behavior:RM?"auto":"smooth",block:"start"})}catch(err){}}}
  if(a){const x=bank.list()[+a.dataset.qallen];dispatchEvent(new CustomEvent("allen:ask",{detail:{display:"Work through this practice question with me:\n\n"+x.q,
    text:`Here is a practice question for Design and Visual Communication (DVC) or technology, about designing a house on a sloping site. Work through it with me step by step, and use this machine to show each part (switch to the right step and move the controls: turning the house and the sun, the design stage, the floor plan level, the section line, the drawing type). Let me try each part before you give the answer.\n\n---\n${x.q}`}}))}});

// ---------- the 3D scene (Blender model, house-scene.js). Lazy, so the lesson works if 3D can't load.
function house3d(S){let world=null;const host3=S.canvas.parentElement,figure=host3.parentElement;host3.style.visibility="hidden";figure.classList.remove("s3-on");
  import("./house-scene.js").then(m=>{world=m.houseScene(S,{state:s,view:viewNow,ROOMS,ZONES,STAGES,SEASONS,DVIEWS,SITE,sunVec,sunAlt,clock,faceWord,levelName,roomCol,terr,ground,cutRooms,cutsStair});const r=host3.getBoundingClientRect();world.resize?.(r.width,r.height)}).catch(e=>{host3.style.visibility="hidden";figure.classList.remove("s3-on");console.warn("House 3D unavailable",e)});
  return {resize(...a){world?.resize?.(...a)},update(...a){world?.update?.(...a)}}}
})();
