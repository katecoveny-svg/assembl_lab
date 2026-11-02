(()=>{
// The fly-over machine: a tilt-shift, toy-like flight over Aotearoa on real terrain, with landmark cards and a Fly tour.
// Default engine: MapLibre GL over LINZ Basemaps (aerial imagery + Terrain-RGB elevation, CC BY 4.0, NZ-hosted, no secret).
// Optional engine: Google Photorealistic 3D Tiles in CesiumJS, only when window.ASSEMBLY_GOOGLE_MAPS_KEY is set
// (Vercel env GOOGLE_MAPS_TILES_KEY via /api/study-env/) or the page is opened with ?google=1 to preview the branch.
const K=window.StudyKit||{},esc=K.esc||(s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])));
const RM=matchMedia("(prefers-reduced-motion: reduce)").matches;
const Q=new URLSearchParams(location.search);
const GKEY=(window.ASSEMBLY_GOOGLE_MAPS_KEY||Q.get("key")||"").trim();
// Google 3D is the desktop treat; phones keep LINZ (lighter tiles, no streaming budget) unless ?google=1 asks for it
const PHONE=matchMedia("(max-width: 820px), (pointer: coarse)").matches;
const WANT_GOOGLE=Q.get("google")==="1"||(!!GKEY&&Q.get("google")!=="0"&&!PHONE);
const EXAG=1.5;   // vertical exaggeration on the LINZ terrain: the toy look wants hills you can read from a phone

// ---------- LINZ Basemaps key: a free developer key if Kate has added one, else a per-visitor client key like the LINZ site mints
// (ULID with a "c" prefix, refreshed every 30 days; LINZ asks public apps to request a free developer key: basemaps@linz.govt.nz)
function ulid(){const A="0123456789ABCDEFGHJKMNPQRSTVWXYZ";let t=Date.now(),s="";for(let i=0;i<10;i++){s=A[t%32]+s;t=Math.floor(t/32)}
  const r=new Uint8Array(16);(crypto.getRandomValues?crypto.getRandomValues(r):r.forEach((_,i)=>r[i]=Math.random()*256|0));for(let i=0;i<16;i++)s+=A[r[i]&31];return s}
function linzKey(){const dev=(window.ASSEMBLY_LINZ_KEY||"").trim();if(dev)return dev;
  try{const k=localStorage.getItem("assembly-linz-key"),t=+localStorage.getItem("assembly-linz-key-at")||0;if(k&&k.startsWith("c")&&Date.now()-t<30*864e5)return k}catch(e){}
  const k="c"+ulid().toLowerCase();try{localStorage.setItem("assembly-linz-key",k);localStorage.setItem("assembly-linz-key-at",String(Date.now()))}catch(e){}return k}
const LKEY=linzKey();
const LINZ=`https://basemaps.linz.govt.nz/v1/tiles`;

// ---------- landmarks: camera, story, prompt. Heights for the Google branch are metres above the ellipsoid.
const L=[
 {id:"aoraki",kind:"Plate boundary · mountains",name:"Aoraki / Mount Cook",sub:"Kā Tiritiri o te Moana, the Southern Alps",c:[170.06,-43.72],z:10.6,p:66,b:28,h:9000,gh:5200,gp:58,gb:40,
  text:"Aotearoa's highest peak (3,724 m) stands where the Pacific Plate is pushed up against the Australian Plate along the Alpine Fault. The range rises about 10 mm a year, and ice and rivers carve almost as much back off.",
  prompt:"Why are the Southern Alps so high yet not getting much higher? Use the words uplift, erosion and glacier, and name the plate boundary.",
  std:["NCEA L1 Geography 91934 · natural processes","NCEA L2 Geography 91240 · large natural environment"],
  look:"Look for the braided Tasman and Hooker valleys, the long tongue of Tasman Glacier and the milky blue of Lake Pukaki."},
 {id:"taupo",kind:"Volcanic landform · caldera",name:"Taupō caldera",sub:"Taupō-nui-a-Tia, Taupō Volcanic Zone",c:[175.90,-38.78],z:9.2,p:58,b:0,h:30000,gh:16000,gp:52,gb:15,
  text:"The lake is the hole left by a supervolcano. The Ōruanui eruption about 25,500 years ago emptied so much magma that the ground collapsed into the chamber; the lake fills the caldera. Taupō erupted again around 232 CE.",
  prompt:"A cone is a hill; a caldera is a hole. Explain, step by step, how an eruption can leave a lake instead of a mountain.",
  std:["NCEA L1 Geography 91934 · natural processes","Year 9–10 Social studies · natural hazards"],
  look:"The lake is about 616 km². Trace the straight northern shore: that edge is the caldera rim. Tongariro, Ngāuruhoe and Ruapehu sit to the south."},
 {id:"rotorua",kind:"Volcanic landform · geothermal",name:"Rotorua geothermal field",sub:"Te Rotorua-nui-a-Kahumatamomoe, Te Arawa",c:[176.25,-38.14],z:10.8,p:60,b:-20,h:12000,gh:6500,gp:56,gb:-20,
  text:"Rotorua sits inside another caldera. Rain soaks down, meets rock heated by magma a few kilometres below, and comes back up as geysers, hot springs and mud pools at Whakarewarewa and Tikitere. Te Arawa have cooked, bathed and built on this heat for centuries.",
  prompt:"Draw or describe the geothermal cycle: where the water comes from, what heats it and why it returns to the surface. Give one cultural and one economic use of the heat.",
  std:["NCEA L1 Geography 91934 · natural processes","Year 9–10 Social studies · people and environment"],
  look:"Lake Rotorua fills the caldera floor; Mokoia Island is a dome of rhyolite in the middle. The city follows the southern shore."},
 {id:"wellington",kind:"Plate boundary · fault line",name:"Wellington Fault",sub:"Te Whanganui-a-Tara, Wellington Harbour",c:[174.84,-41.24],z:11.6,p:64,b:35,h:5500,gh:3000,gp:60,gb:35,
  text:"The straight western edge of the harbour is a fault scarp. The Wellington Fault runs under the Hutt Road, through Thorndon and out to Karori, moving sideways about 6–7 mm a year. In 1855 the nearby Wairarapa Fault lifted the city's shoreline 1–2 m, making the flat land where Te Aro and the Basin Reserve now sit.",
  prompt:"Find the fault line in the view. Explain how a strike-slip fault creates a straight valley edge, and what the 1855 uplift did for the city plan.",
  std:["NCEA L1 Geography 91934 · natural processes","Year 9–10 Social studies · natural hazards and cities"],
  look:"Follow the ruler-straight shore from Petone to Thorndon, then the Hutt Valley running north-east along the same line."},
 {id:"auckland",kind:"Volcanic landform · urban change",name:"Auckland volcanic field",sub:"Tāmaki Makaurau, ngā tūpuna maunga",c:[174.80,-36.86],z:11.3,p:60,b:-15,h:7000,gh:3600,gp:58,gb:-25,
  text:"About 53 small volcanoes punch through the city, each from a single eruption. Rangitoto, the youngest, grew in the harbour about 600 years ago. Maungawhau (Mt Eden), Maungakiekie (One Tree Hill) and others were pā, then quarries, and are now co-governed by mana whenua and the council.",
  prompt:"Pick one maunga. Describe how its use has changed over time (pā, farm, quarry, reserve) and who makes decisions about it now. What does that say about how a city changes?",
  std:["Year 9–10 Social studies · urban change","NCEA L1 Geography 91934 · natural processes"],
  look:"Count the cones: Maungawhau's crater sits south of the CBD, Rangitoto is the round island to the north-east, and the Manukau Harbour opens to the south-west."},
 {id:"otautahi",kind:"Urban change · rebuild",name:"Ōtautahi Christchurch rebuild",sub:"Ōtākaro Avon River red zone",c:[172.66,-43.53],z:11.8,p:58,b:10,h:5000,gh:2600,gp:58,gb:10,
  text:"The 22 February 2011 earthquake killed 185 people and broke the city centre. Along the Ōtākaro Avon, liquefaction wrecked the land so badly that about 8,000 homes were bought and cleared, leaving a 600-hectare green corridor that is now being regenerated.",
  prompt:"Urban change can be planned or forced. Give one example of each in Ōtautahi since 2011 and explain who gained and who lost from the red-zone decision.",
  std:["Year 9–10 Social studies · urban change","NCEA L1 Geography 91934 · natural processes"],
  look:"The river winds east from the city centre to the estuary; the empty green land either side is the residential red zone. The Port Hills rise to the south."},
 {id:"waitangi",kind:"Place and history",name:"Waitangi",sub:"Pēwhairangi, Bay of Islands",c:[174.09,-35.27],z:12.2,p:56,b:20,h:4500,gh:2200,gp:55,gb:25,
  text:"On 6 February 1840, rangatira and the Crown signed Te Tiriti o Waitangi on the lawn in front of the Treaty House. The Bay of Islands was the busiest contact zone between Māori and Europeans in the early 1800s: whalers, traders and missionaries at Kororāreka and Paihia, and Ngāpuhi settlements all around the sheltered bay.",
  prompt:"Why here? Use the landscape in the view (sheltered harbour, islands, river mouth) to explain why this became the place where Te Tiriti was signed.",
  std:["Year 9–10 Social studies · Te Tiriti and place","Aotearoa New Zealand's histories"],
  look:"The Treaty Grounds sit on the point north of the Waitangi River mouth; Paihia is the beach town to the south, Kororāreka (Russell) across the water."}
];

// ---------- shell
const app=document.getElementById("app");
const PLANE=`<svg viewBox="0 0 92 92" aria-hidden="true"><g fill="none" stroke="#492B3E" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round">
<path d="M46 14 C 54 14 56 30 56 46 L 56 70 C 56 76 50 80 46 80 C 42 80 36 76 36 70 L 36 46 C 36 30 38 14 46 14 Z" fill="#F9D2B8"/>
<path d="M36 44 L 6 60 L 6 68 L 36 60 Z" fill="#B2552D"/><path d="M56 44 L 86 60 L 86 68 L 56 60 Z" fill="#B2552D"/>
<path d="M38 72 L 26 80 L 26 84 L 38 80 Z M54 72 L 66 80 L 66 84 L 54 80 Z" fill="#B2552D"/>
<circle cx="46" cy="38" r="5" fill="#BFDDF5"/></g><g class="prop"><rect x="44.5" y="6" width="3" height="32" rx="1.5" fill="#492B3E" opacity=".7"/></g></svg>`;
const ICOFLY=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12.5 20.5 5l-3.5 15-5-6.5z"/><path d="M12 13.5 20.5 5"/></svg>`;
const ICOSTOP=`<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>`;
app.innerHTML=`<div class="fly-map" id="f-map" role="img" aria-label="A 3D map of Aotearoa New Zealand that you can drag, pinch and tilt"></div>
<div class="fly-band top"></div><div class="fly-band bottom"></div><div class="fly-grade"></div>
<div class="fly-plane" id="f-plane">${PLANE}</div>
<header class="fly-head"><a class="back" href="../index.html#subj-social" aria-label="All study machines" title="All study machines">${K.icons?K.icons.back:"←"}</a>
 <div class="fly-title"><span class="appicon" aria-hidden="true">${K.glyph?K.glyph("fly"):""}</span><div><div class="eyebrow">Social studies · Geography</div><h1>The fly-over machine</h1></div></div>
 <div class="fly-badge" id="f-badge"><b>LINZ</b> aerial + terrain</div></header>
<div class="fly-status" id="f-status" aria-live="polite"></div>
<div class="fly-ctl"><button class="btn tilt" type="button" id="f-tilt" aria-pressed="true" title="Toy look: blur bands and a warm grade">Toy look</button><button class="btn primary" type="button" id="f-fly">${ICOFLY}<span>Fly</span></button></div>
<nav class="fly-shelf" aria-label="Landmarks"><div class="fly-attr" id="f-attr"><span class="truth">Simulated</span>Terrain ×${EXAG} · data from <a href="https://basemaps.linz.govt.nz/" target="_blank" rel="noopener">LINZ</a> · Basemap © LINZ <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a> · LINZ Data Service</div><div class="fly-cards" id="f-cards">${L.map((l,i)=>`<div class="fly-card" data-i="${i}" aria-pressed="false" id="card-${l.id}">
 <span class="n">${i+1}/${L.length}</span><button class="pick" type="button" aria-label="Fly to ${esc(l.name)}"><span class="kind">${esc(l.kind)}</span><h2>${esc(l.name)}<small>${esc(l.sub)}</small></h2></button><p>${esc(l.text)}</p>
 <button class="btn open" type="button" data-open="${i}" aria-expanded="false">Your turn ▾</button>
 <div class="more"><p><b>Look for:</b> ${esc(l.look)}</p><div class="prompt"><b>Your turn</b>${esc(l.prompt)}</div>
 <div class="std"><span class="truth">Simulated</span>${l.std.map(s=>`<span>${esc(s)}</span>`).join("")}</div>
 <div class="row"><button class="btn" type="button" data-go="${i}">Fly here</button><button class="btn" type="button" data-prev="${i}" aria-label="Previous landmark">←</button><button class="btn" type="button" data-next="${i}" aria-label="Next landmark">→</button></div></div></div>`).join("")}</div>
<div class="fly-dots" aria-hidden="true">${L.map(()=>"<i></i>").join("")}</div></nav>`;
const $=id=>document.getElementById(id);
const status=t=>{$("f-status").textContent=t||""};
const sfx=n=>{try{K.sfx&&K.sfx(n)}catch(e){}};
// the shelf height drives where the buttons and attribution sit
const shelf=document.querySelector(".fly-shelf");const fitShelf=()=>{document.documentElement.style.setProperty("--shelf",shelf.offsetHeight+"px")};
new ResizeObserver(fitShelf).observe(shelf);fitShelf();

// ---------- engines share one tiny interface: flyTo(landmark, done), orbit(on), stop()
let engine=null,cur=-1,touring=false,tourTimer=0,tourDone=null;
const plane=on=>$("f-plane").classList.toggle("on",!!on&&!RM);

function maplibreEngine(){
  if(!window.maplibregl)throw new Error("MapLibre did not load");
  const tile=(layer,ext,extra="")=>`${LINZ}/${layer}/WebMercatorQuad/{z}/{x}/{y}.${ext}?api=${LKEY}${extra}`;
  const style={version:8,
    sources:{
      aerial:{type:"raster",tiles:[tile("aerial","webp")],tileSize:256,minzoom:0,maxzoom:18,attribution:"Basemap © LINZ CC BY 4.0"},
      dem:{type:"raster-dem",tiles:[tile("elevation","png","&pipeline=terrain-rgb")],tileSize:256,minzoom:0,maxzoom:14,encoding:"mapbox",attribution:"Elevation © LINZ CC BY 4.0"},
      // the same tiles again for the hillshade (MapLibre asks for separate sources for terrain and shading; the browser cache serves both)
      shade:{type:"raster-dem",tiles:[tile("elevation","png","&pipeline=terrain-rgb")],tileSize:256,minzoom:0,maxzoom:14,encoding:"mapbox"}},
    layers:[{id:"sea",type:"background",paint:{"background-color":"#8FBEDF"}},
      {id:"aerial",type:"raster",source:"aerial",paint:{"raster-saturation":0.28,"raster-contrast":0.08,"raster-brightness-min":0.04,"raster-fade-duration":200}},
      {id:"hills",type:"hillshade",source:"shade",paint:{"hillshade-exaggeration":0.35,"hillshade-shadow-color":"#4A2B40","hillshade-highlight-color":"#FFF4E0","hillshade-accent-color":"#B2552D","hillshade-illumination-direction":315}}],
    terrain:{source:"dem",exaggeration:EXAG},
    sky:{"sky-color":"#8CC1EC","horizon-color":"#F6DFC7","fog-color":"#F6DFC7","fog-ground-blend":0.6,"horizon-fog-blend":0.75,"sky-horizon-blend":0.6,"atmosphere-blend":0.7}};
  const map=new maplibregl.Map({container:"f-map",style,center:[173.5,-41.2],zoom:5.2,pitch:48,bearing:0,minZoom:4.5,maxZoom:15.5,maxPitch:75,attributionControl:false,
    pitchWithRotate:true,touchPitch:true,hash:false,fadeDuration:200,cooperativeGestures:false});
  // tiles outside LINZ coverage (open sea, deep zooms) 404: that is sea or overzoom, not an error worth the console
  map.on("error",e=>{const m=e&&e.error&&e.error.message||"";if(/40[34]|tile|Failed to fetch|NetworkError/i.test(m))return;console.warn("map",m)});
  map.touchZoomRotate.enableRotation();
  map.on("load",()=>{status("");fitShelf()});
  const ready=new Promise(ok=>map.loaded()?ok():map.once("load",ok));
  let orbitRaf=0;
  const orbit=on=>{cancelAnimationFrame(orbitRaf);if(!on||RM)return;let last=performance.now();const step=t=>{const dt=Math.min(0.05,(t-last)/1000);last=t;map.setBearing(map.getBearing()+dt*2.2);orbitRaf=requestAnimationFrame(step)};orbitRaf=requestAnimationFrame(step)};
  ["dragstart","zoomstart","rotatestart","pitchstart","touchstart","wheel"].forEach(ev=>map.on(ev,()=>{if(!touring)orbit(false)}));
  return {
    kind:"linz",
    flyTo(l,done){orbit(false);const opts={center:l.c,zoom:l.z,pitch:l.p,bearing:l.b,essential:true};
      const finish=()=>{map.off("moveend",finish);done&&done()};
      if(RM){map.jumpTo(opts);setTimeout(finish,50);return}
      map.on("moveend",finish);map.flyTo({...opts,speed:0.55,curve:1.5,maxDuration:9000})},
    orbit,stop(){orbit(false);map.stop()},ready,map};
}

async function cesiumEngine(){
  if(!GKEY)throw new Error("no-key");
  const V="1.130",base=`https://cesium.com/downloads/cesiumjs/releases/${V}/Build/Cesium/`;
  window.CESIUM_BASE_URL=base;
  await new Promise((ok,bad)=>{const c=document.createElement("link");c.rel="stylesheet";c.href=base+"Widgets/widgets.css";document.head.appendChild(c);
    const s=document.createElement("script");s.src=base+"Cesium.js";s.onload=ok;s.onerror=()=>bad(new Error("Cesium did not load"));document.head.appendChild(s)});
  const C=window.Cesium;const host=$("f-map");host.classList.add("fly-cesium");host.innerHTML="";
  const viewer=new C.Viewer(host,{imageryProvider:false,baseLayerPicker:false,geocoder:false,homeButton:false,sceneModePicker:false,navigationHelpButton:false,animation:false,timeline:false,fullscreenButton:false,infoBox:false,selectionIndicator:false,requestRenderMode:false,globe:false,skyAtmosphere:new C.SkyAtmosphere(),
    // render at the device's real pixel ratio (Cesium's default is CSS pixels, which reads as blur on every modern screen)
    useBrowserRecommendedResolution:false});
  viewer.resolutionScale=Math.min(devicePixelRatio||1,2);
  viewer.scene.backgroundColor=C.Color.fromCssColorString("#8CC1EC");
  viewer.scene.postProcessStages.fxaa.enabled=true;
  // Google Photorealistic 3D Tiles: one root request per session (billed), then tiles stream for up to three hours. Credits must stay on screen.
  // Detail: a lower screen-space error pulls finer tiles (8 instead of Cesium's 16), the distance-based LOD drop is off so the
  // horizon stays crisp in the oblique views, and the cache is big enough to hold a landmark's worth of tiles while orbiting.
  const ts=await C.Cesium3DTileset.fromUrl(`https://tile.googleapis.com/v1/3dtiles/root.json?key=${encodeURIComponent(GKEY)}`,{showCreditsOnScreen:true,
    maximumScreenSpaceError:8,dynamicScreenSpaceError:false,skipLevelOfDetail:false,cacheBytes:768*1024*1024,maximumCacheOverflowBytes:256*1024*1024,preloadFlightDestinations:true});
  viewer.scene.primitives.add(ts);
  // tell the student when the detail is still streaming in, so a soft first frame is not mistaken for the finished view
  let loadT=0;ts.loadProgress.addEventListener((pending,processing)=>{clearTimeout(loadT);if(pending+processing>0){status(`Loading detail · ${pending+processing} tiles`)}else loadT=setTimeout(()=>{if(cur>=0&&!touring)status(L[cur].name)},400)});
  $("f-badge").innerHTML=`<b>Google</b> Photorealistic 3D Tiles`;
  $("f-attr").innerHTML=`<span class="truth">Live imagery</span>3D Tiles · <b>Google Maps</b> · Map data ©Google and the providers credited on screen`;
  let orbitEv=null;
  const orbit=on=>{if(orbitEv){viewer.clock.onTick.removeEventListener(orbitEv);orbitEv=null}if(!on||RM)return;
    const target=viewer.camera.pickEllipsoid(new C.Cartesian2(host.clientWidth/2,host.clientHeight/2))||viewer.camera.positionWC;
    orbitEv=()=>{viewer.camera.rotate(C.Cartesian3.UNIT_Z,-0.0006)};viewer.clock.onTick.addEventListener(orbitEv);void target};
  host.addEventListener("pointerdown",()=>{if(!touring)orbit(false)});
  return {kind:"google",
    flyTo(l,done){orbit(false);const b=l.gb??l.b,p=l.gp??l.p,h=l.gh??l.h;const heading=C.Math.toRadians(b),pitch=C.Math.toRadians(-p);
      // put the camera behind the landmark so it looks across it at the chosen pitch (p is measured down from the horizontal)
      const dist=h/Math.tan(C.Math.toRadians(p)),dLat=(dist*Math.cos(heading))/111320,dLng=(dist*Math.sin(heading))/(111320*Math.cos(C.Math.toRadians(l.c[1])));
      viewer.camera.flyTo({destination:C.Cartesian3.fromDegrees(l.c[0]-dLng,l.c[1]-dLat,h),orientation:{heading,pitch,roll:0},duration:RM?0:6,easingFunction:C.EasingFunction.QUADRATIC_IN_OUT,complete:()=>done&&done(),cancel:()=>done&&done()})},
    orbit,stop(){orbit(false);viewer.camera.cancelFlight()},viewer};
}

// ---------- cards, tour
const cards=[...document.querySelectorAll(".fly-card")],dots=[...document.querySelectorAll(".fly-dots i")];
function select(i,{fly=true,scroll=true}={}){i=(i+L.length)%L.length;cur=i;
  cards.forEach((c,k)=>c.setAttribute("aria-pressed",String(k===i)));dots.forEach((d,k)=>d.classList.toggle("on",k===i));
  fitShelf();
  if(scroll&&innerWidth<=820)cards[i].scrollIntoView({inline:"center",block:"nearest",behavior:RM?"auto":"smooth"});
  if(fly&&engine){plane(true);status(`Flying to ${L[i].name}`);engine.flyTo(L[i],()=>{plane(false);status(touring?`${L[i].name} · ${i+1} of ${L.length}`:L[i].name);engine.orbit(true);tourDone&&tourDone()})}}
cards.forEach(c=>c.addEventListener("click",e=>{const t=e.target.closest("[data-go],[data-prev],[data-next],[data-open]");const i=+c.dataset.i;
  if(t&&t.dataset.open!=null){const on=!c.classList.contains("open");c.classList.toggle("open",on);t.setAttribute("aria-expanded",String(on));t.textContent=on?"Your turn ▴":"Your turn ▾";fitShelf();sfx("tick");return}
  if(t&&t.dataset.prev!=null){stopTour();select(i-1);sfx("whoosh");return}
  if(t&&t.dataset.next!=null){stopTour();select(i+1);sfx("whoosh");return}
  stopTour();sfx("pop");select(i)}));
// on phones a swipe of the shelf picks the centred card (no flight until it is tapped, so browsing stays cheap)
let snapT=0;$("f-cards").addEventListener("scroll",()=>{if(innerWidth>820)return;clearTimeout(snapT);snapT=setTimeout(()=>{const r=$("f-cards").getBoundingClientRect(),mid=r.left+r.width/2;
  let best=0,bd=1e9;cards.forEach((c,k)=>{const b=c.getBoundingClientRect(),d=Math.abs(b.left+b.width/2-mid);if(d<bd){bd=d;best=k}});
  if(best!==cur){cur=best;cards.forEach((c,k)=>c.setAttribute("aria-pressed",String(k===best)));dots.forEach((d,k)=>d.classList.toggle("on",k===best));fitShelf()}},120)},{passive:true});

const flyBtn=$("f-fly");
function setFlyBtn(){flyBtn.innerHTML=touring?`${ICOSTOP}<span>Land</span>`:`${ICOFLY}<span>Fly</span>`;flyBtn.setAttribute("aria-pressed",String(touring))}
function stopTour(){if(!touring)return;touring=false;clearTimeout(tourTimer);tourDone=null;setFlyBtn();status(cur>=0?L[cur].name:"")}
function startTour(){if(!engine)return;touring=true;setFlyBtn();sfx("whoosh");let i=cur<0?-1:cur;
  const next=()=>{if(!touring)return;i=(i+1)%L.length;tourDone=()=>{tourDone=null;if(!touring)return;tourTimer=setTimeout(next,RM?2500:7000)};select(i)};next()}
flyBtn.addEventListener("click",()=>touring?stopTour():startTour());
$("f-tilt").addEventListener("click",e=>{const on=e.currentTarget.getAttribute("aria-pressed")!=="true";e.currentTarget.setAttribute("aria-pressed",String(on));document.querySelectorAll(".fly-band,.fly-grade").forEach(el=>el.style.display=on?"":"none");sfx("tick")});
addEventListener("keydown",e=>{if(e.target.closest("input,textarea"))return;if(e.key==="ArrowRight"||e.key==="n"){stopTour();select(cur+1)}else if(e.key==="ArrowLeft"||e.key==="p"){stopTour();select(cur-1)}else if(e.key==="f"||e.key==="F")flyBtn.click()});

// ---------- start: Google when asked for and keyed, otherwise LINZ. Any failure lands on LINZ; if WebGL is missing, say so.
function fallback(msg){$("f-map").innerHTML=`<div class="fly-fallback"><div class="card"><h3>The map could not start</h3><p>${esc(msg)}</p><p>Try another browser, or turn on hardware acceleration. The landmark cards below still work as reading.</p></div></div>`;status("")}
(async()=>{
  status("Loading terrain");
  if(WANT_GOOGLE){
    if(!GKEY){$("f-badge").innerHTML=`<b>Google 3D</b> needs GOOGLE_MAPS_TILES_KEY · showing LINZ`;}
    else{try{engine=await cesiumEngine()}catch(e){console.warn("google 3d tiles",e&&e.message);$("f-badge").innerHTML=`<b>Google 3D</b> unavailable · showing LINZ`;$("f-map").className="fly-map";$("f-map").innerHTML=""}}
  }
  if(!engine){try{engine=maplibreEngine()}catch(e){fallback(e.message||String(e));return}}
  select(0,{fly:false,scroll:false});
  await (engine.ready||Promise.resolve());
  select(0,{fly:true,scroll:false});
})();
})();
