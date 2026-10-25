/* assembly study kit: one shell, many machines. A machine supplies its model, drawings, steps and exam lines.
   The shell also carries Allen the dachshund (StudyKit.allen), drawn as an inline SVG mark, who reacts to challenges and lives in his den on the hub. */
(function(){
// always light: the machines are drawn for a bright bench (this also switches off older dark rules keyed on data-theme)
try{document.documentElement.setAttribute("data-theme","light")}catch(e){}
// each machine is a small app with its own colour, grouped by subject
const MID=(()=>{try{return (location.pathname.split("/").pop()||"").replace(/\.html?$/,"")}catch(e){return ""}})();
const SUBJ={science:"#2F8FD8",biochem:"#12A386",maths:"#7B61FF",english:"#F2603F",social:"#2FA65A",digital:"#D9468F",tech:"#D98A1F"};
const MSUB={shaky:"science",fish:"science",vinyl:"science",bike:"science",sky:"science",particles:"science",atoms:"science",energy:"science",claims:"science",
  genes:"biochem",ecology:"biochem",materials:"biochem",lines:"maths",shapes:"maths",claw:"maths",data:"maths",
  read:"english",words:"english",essay:"english",text:"english",maps:"social",market:"social",civics:"social",ai:"digital",
  vend:"science",pinball:"science",phone:"science",queue:"maths",plan:"tech"};
const accentFor=id=>SUBJ[MSUB[id]]||SUBJ.science;
// one line icon per machine (24x24, drawn with currentColor), used for the app icon here and the tiles on the home page
const G=(d,extra)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}${extra||""}</svg>`;
const GLYPH={
  shaky:G(`<path d="M2.5 15.5h4l2-5 3 9 3-13 2.5 9h4.5"/><path d="M2.5 20.5h19"/>`),
  fish:G(`<path d="M2.5 12c2.6-3.9 7.3-5.6 11.6-3.6L19 5v14l-4.9-3.4C9.8 17.6 5.1 15.9 2.5 12z"/><circle cx="8" cy="11" r="1" fill="currentColor"/>`),
  claw:G(`<path d="M12 2.5v6.5M7.5 13.5 12 9l4.5 4.5M7.5 13.5V17M16.5 13.5V17"/><circle cx="12" cy="19" r="2.5"/>`),
  ai:G(`<rect x="6" y="6" width="12" height="12" rx="3"/><path d="M9.5 2.5v3.5M14.5 2.5v3.5M9.5 18v3.5M14.5 18v3.5M2.5 9.5H6M2.5 14.5H6M18 9.5h3.5M18 14.5h3.5M10 10h4v4h-4z"/>`),
  vinyl:G(`<circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="12" r="3"/><path d="M12 5.5a6.5 6.5 0 0 1 6.5 6.5"/>`),
  bike:G(`<circle cx="5.5" cy="16" r="3.8"/><circle cx="18.5" cy="16" r="3.8"/><path d="M5.5 16 9.5 8h6.5l2.5 8M9.5 8 13 16h-7.5M8 5h3"/>`),
  sky:G(`<circle cx="12" cy="12" r="3.5"/><ellipse cx="12" cy="12" rx="10" ry="5.2"/><circle cx="20.5" cy="9.6" r="1.6" fill="currentColor"/>`),
  particles:G(`<path d="M9 2.5h6M10 2.5v6.5l-5.4 9.3A2 2 0 0 0 6.3 21.3h11.4a2 2 0 0 0 1.7-3L14 9V2.5"/><circle cx="10" cy="16.5" r="1" fill="currentColor"/><circle cx="14" cy="18" r="1" fill="currentColor"/><circle cx="13" cy="14" r="1" fill="currentColor"/>`),
  civics:G(`<path d="M2.5 9 12 3.5 21.5 9M5 9.5v8.5M9.6 9.5v8.5M14.4 9.5v8.5M19 9.5v8.5M2.5 21h19"/>`),
  energy:G(`<path d="M13.5 2 5 13.5h6.2L10 22l9-12.2h-6.3z"/>`),
  genes:G(`<path d="M7 2.5c0 5.5 10 6.5 10 9.5s-10 4-10 9.5M17 2.5c0 5.5-10 6.5-10 9.5s10 4 10 9.5M8.5 6h7M8.5 18h7"/>`),
  ecology:G(`<path d="M4.5 19.5C4.5 10.5 10 4.5 20 4.5c0 9.5-5.5 15-15.5 15z"/><path d="M4.5 19.5 13 11"/>`),
  atoms:G(`<circle cx="12" cy="12" r="1.8" fill="currentColor"/><ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-60 12 12)"/>`),
  shapes:G(`<path d="M3 20.5 9.5 6l6.5 14.5z"/><circle cx="17.5" cy="7.5" r="4"/>`),
  lines:G(`<path d="M3.5 3.5v17h17"/><path d="M7 16.5 18 6.5"/><circle cx="11.5" cy="12.4" r="1.2" fill="currentColor"/>`),
  read:G(`<path d="M2.5 5h6a3.5 3.5 0 0 1 3.5 3.5V20a2.5 2.5 0 0 0-2.5-2.5h-7zM21.5 5h-6A3.5 3.5 0 0 0 12 8.5V20a2.5 2.5 0 0 1 2.5-2.5h7z"/>`),
  words:G(`<path d="M3.5 4.5h17v11h-11l-6 4.5z"/><path d="M7.5 8.5h9M7.5 11.5h5.5"/>`),
  essay:G(`<path d="M4 20l1.2-4.6L16.4 4.2a2.1 2.1 0 0 1 3 3L8.2 18.4z"/><path d="M14.5 6 18 9.5"/>`),
  maps:G(`<path d="M2.5 6 9 3.5l6 2.5 6.5-2.5v14.5L15 20.5 9 18l-6.5 2.5z"/><path d="M9 3.5V18M15 6v14.5"/>`),
  market:G(`<path d="M3 3h8l10 10-8 8L3 11z"/><circle cx="7.5" cy="7.5" r="1.6"/>`),
  data:G(`<path d="M3.5 20.5V11M8 20.5V14M3.5 20.5h9"/><circle cx="15" cy="9" r="5"/><path d="m18.6 12.6 3 3M13 10.5V9M15 10.5V7M17 10.5V8.5"/>`),
  text:G(`<path d="M3.5 4.5h11M9 4.5v15"/><path d="M14.5 11.5h6M14.5 15.5h6M14.5 19.5h4"/>`),
  materials:G(`<path d="M12 2.5 20.5 7.3v9.4L12 21.5l-8.5-4.8V7.3z"/><path d="M12 12l8.5-4.7M12 12v9.5M12 12 3.5 7.3"/>`),
  claims:G(`<circle cx="10.5" cy="10.5" r="7.5"/><path d="m7.3 10.6 2.3 2.3 4.4-4.6M16 16l5.5 5.5"/>`),
  vend:G(`<rect x="4" y="2.5" width="16" height="19" rx="2"/><rect x="7" y="5.5" width="7" height="9" rx="1"/><path d="M16.5 6.5v2M16.5 11v.5M7 18h7"/><circle cx="10.5" cy="9.5" r="1.3" fill="currentColor"/>`),
  pinball:G(`<path d="M5 3.5h14a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V5A1.5 1.5 0 0 1 5 3.5z"/><path d="M7 20.5 11 16M17 20.5 13 16"/><circle cx="9" cy="8.5" r="1.6" fill="currentColor"/><circle cx="15" cy="7.5" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.3"/>`),
  phone:G(`<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M12.8 7.5 10.5 12h3l-2.3 4.5M10.5 5h3"/>`),
  queue:G(`<circle cx="5" cy="7" r="2.2"/><circle cx="12" cy="7" r="2.2"/><circle cx="19" cy="7" r="2.2"/><path d="M2.5 15.5c0-2 1.2-3 2.5-3s2.5 1 2.5 3M9.5 15.5c0-2 1.2-3 2.5-3s2.5 1 2.5 3M16.5 15.5c0-2 1.2-3 2.5-3s2.5 1 2.5 3M4 20.5h16"/>`),
  plan:G(`<rect x="3" y="3" width="18" height="18" rx="1.5"/><path d="M3 12h7v9M10 12V3M10 7h4M14 12h7M17 12v4"/>`)
};
const glyph=id=>GLYPH[id]||GLYPH.energy;
const ICO={
  back:G(`<path d="M15 5 8 12l7 7"/>`),
  sndOn:G(`<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/>`),
  sndOff:G(`<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="m16 9.5 5 5M21 9.5l-5 5"/>`),
  paw:`<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><ellipse cx="6" cy="10" rx="2.1" ry="2.7"/><ellipse cx="10" cy="6.5" rx="2.1" ry="2.7"/><ellipse cx="14.5" cy="6.5" rx="2.1" ry="2.7"/><ellipse cx="18.4" cy="10" rx="2.1" ry="2.7"/><path d="M12.2 11.5c2.6 0 5.6 3.6 5.6 6.1 0 1.8-1.4 2.6-3 2.6-1.1 0-1.7-.6-2.6-.6s-1.6.6-2.7.6c-1.6 0-2.9-.8-2.9-2.6 0-2.5 3-6.1 5.6-6.1z"/></svg>`,
  exam:G(`<path d="M4 5.5h16v10H10l-5 4v-4H4z"/><path d="M8.5 9.5h7M8.5 12h4"/>`),
  trap:G(`<path d="M12 3.5 21.5 20h-19z"/><path d="M12 10v4.5"/><circle cx="12" cy="17.2" r=".6" fill="currentColor"/>`),
  big:G(`<path d="M9 17.5h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>`),
  kupu:G(`<path d="M12 21c-5 0-8.5-3.6-8.5-8.2C3.5 7.6 7.4 3.5 12.3 3.5c4.2 0 7.2 2.9 7.2 6.6 0 3.2-2.4 5.5-5.4 5.5-2.4 0-4.1-1.7-4.1-3.8 0-1.7 1.3-3 3-3"/>`),
  check:G(`<path d="m5 12.5 4.5 4.5L19 7.5"/>`)
};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function daysUntil(iso){const ms=Date.parse(iso)-Date.now();return Math.ceil(ms/864e5)}
const nzDay=t=>new Date(t).toLocaleDateString("en-CA",{timeZone:"Pacific/Auckland"});
function readLog(){try{const L=JSON.parse(localStorage.getItem("studylog")||"[]");return Array.isArray(L)?L:[]}catch(e){return memLog}}
let memLog=[];
function logStudy(kind){const e={d:nzDay(Date.now()),m:(location.pathname.split("/").pop()||"").replace(".html",""),kind,t:Date.now()};
  try{const k="studylog";const L=JSON.parse(localStorage.getItem(k)||"[]");
  L.push(e);localStorage.setItem(k,JSON.stringify(L.slice(-800)))}catch(err){memLog.push(e)}}
// ---- sound: a tiny Web Audio kit, quiet, only after a tap, mutable (saved on this device)
let AC=null,muted=false;try{muted=localStorage.getItem("studysound")==="off"}catch(e){}
function ac(){if(!AC){const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;AC=new C()}if(AC.state==="suspended")AC.resume();return AC}
function tone(f,dur,type,gain,when,slideTo){const a=ac();if(!a)return;const t=a.currentTime+(when||0),o=a.createOscillator(),g=a.createGain();o.type=type||"sine";o.frequency.setValueAtTime(f,t);if(slideTo)o.frequency.exponentialRampToValueAtTime(slideTo,t+dur);
  g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(gain||0.05,t+0.008);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);o.connect(g).connect(a.destination);o.start(t);o.stop(t+dur+0.02)}
function noise(dur,f0,f1,gain){const a=ac();if(!a)return;const n=Math.floor(a.sampleRate*dur),b=a.createBuffer(1,n,a.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*(1-i/n);
  const s=a.createBufferSource(),bp=a.createBiquadFilter(),g=a.createGain(),t=a.currentTime;s.buffer=b;bp.type="bandpass";bp.Q.value=1.2;bp.frequency.setValueAtTime(f0,t);bp.frequency.exponentialRampToValueAtTime(f1,t+dur);g.gain.value=gain;s.connect(bp).connect(g).connect(a.destination);s.start()}
let lastTick=0;
const SFX={tick:()=>{const n=performance.now();if(n-lastTick<55)return;lastTick=n;tone(1700,0.025,"sine",0.018)},
  pop:()=>tone(520,0.07,"sine",0.05,0,880),
  whoosh:()=>noise(0.22,500,2400,0.05),
  ding:()=>{tone(1046,0.7,"sine",0.04);tone(1568,0.5,"sine",0.018,0.01)},
  buzz:()=>{tone(150,0.16,"square",0.02);tone(110,0.2,"sine",0.04,0.04)},
  win:()=>{[523,659,784,1047].forEach((f,i)=>tone(f,0.35,"triangle",0.045,i*0.08));tone(2093,0.8,"sine",0.015,0.32)},
  yip:()=>{tone(760,0.08,"triangle",0.035,0,1240);tone(900,0.1,"triangle",0.03,0.12,1500)}};
function sfx(name){if(muted)return;try{(SFX[name]||SFX.pop)()}catch(e){}}
function setMuted(m){muted=m;try{localStorage.setItem("studysound",m?"off":"on")}catch(e){}}
const calm=()=>{try{return matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){return false}};
// ---- a small celebration when a challenge is passed
function burst(el){if(!el||calm())return;const r=el.getBoundingClientRect(),cols=["#F7E7A6","#F3B8C8","#BFE8D6","#D9CBF2","#BFDDF5","#F9D2B8"];
  for(let i=0;i<26;i++){const p=document.createElement("i");p.className="kconf";const a=Math.random()*Math.PI*2,v=60+Math.random()*90;
    p.style.cssText=`left:${r.left+r.width*0.85}px;top:${r.top+r.height/2}px;background:${cols[i%cols.length]};--dx:${Math.cos(a)*v}px;--dy:${Math.sin(a)*v-40}px;--r:${Math.random()*540-270}deg`;
    document.body.appendChild(p);setTimeout(()=>p.remove(),1100)}}

/* ================= Allen the dachshund =================
   An original long-haired miniature dachshund, named after the Allen key every kitset needs. He is drawn as a
   sports-style mark in plain inline SVG: a plum circle with a sun ring, a thick plum outline and two or three tones
   per colour, so he stays crisp at any size with no image files. His coat, collar, gear, place and name are all
   drawn from the look; moods (happy on a pass, think while you work or after a miss) change the face. */
const AL_INK="#240B21",AL_SUN="#F7E7A6";// butter pastel: used for the little scene suns and gear accents (no gold ring or yellow tag anywhere)
const COATS={
  blacktan: {label:"Black and tan",base:"#2B2227",dark:"#150F13",light:"#4B3C45",sheen:"#7A5236",edge:"#8E6A4A",tan:"#C9833F",tanDark:"#9E5F2A",points:true},
  red:      {label:"Red",base:"#B4562B",dark:"#85381A",light:"#D27A46",sheen:"#E39A5E",edge:"#E8A66E",tan:"#D9894F",tanDark:"#B06A36",points:false},
  chocolate:{label:"Chocolate and tan",base:"#5B3524",dark:"#3A2016",light:"#7C4D35",sheen:"#9A6644",edge:"#A9794F",tan:"#D49A5E",tanDark:"#A9713C",points:true},
  dapple:   {label:"Dapple",base:"#33292E",dark:"#1B1418",light:"#54454D",sheen:"#8A7E84",edge:"#A79CA2",tan:"#C9833F",tanDark:"#9E5F2A",points:true,patch:"#A79CA2"},
  cream:    {label:"Cream",base:"#E3C08B",dark:"#BF9863",light:"#F3DDB4",sheen:"#FBEBCB",edge:"#FFF6E2",tan:"#EED3A3",tanDark:"#CFA974",points:false}
};
const COLLARS=[["#3BB28F","Mint"],["#F7E7A6","Butter"],["#492B3E","Plum"],["#E8664A","Coral"],["#4FA3D9","Sky"],["#F4E9D8","Oat"]];
const BG={workshop:{label:"Workshop"},beach:{label:"Beach"},redwood:{label:"Redwood trail"},records:{label:"Record shop"},jetty:{label:"Jetty at sunset"}};
// crops of the 512 badge for the den thumbnails: [x, y, w, h] of the viewBox
const BOX={full:[0,0,512,512],bust:[118,88,276,276],neck:[90,318,332,186],prop:[0,0,512,512],scene:[0,0,512,512]};
const hexOk=h=>/^#[0-9a-f]{6}$/i.test(String(h||""));
// ---- the five places, drawn flat inside the circle (the dog sits over the lower middle)
const AL_PLACES={
  plain:()=>`<rect width="512" height="512" fill="#492B3E"/><path d="M40,330 L470,150" stroke="#fff" stroke-opacity=".05" stroke-width="80"/><path d="M60,420 L480,250" stroke="#fff" stroke-opacity=".04" stroke-width="30"/>`,
  workshop:()=>{let d="";for(let y=70;y<=470;y+=40)for(let x=50;x<=470;x+=40)d+=`<circle cx="${x}" cy="${y}" r="4"/>`;
    return `<rect width="512" height="512" fill="#F3E3C8"/><g fill="#D9C2A0">${d}</g>
    <path d="M110,120 l0,84 M98,122 a12,12 0 1 0 24,0 a12,12 0 1 0 -24,0" stroke="#5B4A52" stroke-width="9" fill="none" stroke-linecap="round"/>
    <path d="M384,86 v46 h46" stroke="#5B4A52" stroke-width="14" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M404,150 l34,-34" stroke="#5B4A52" stroke-width="8" stroke-linecap="round"/><rect x="396" y="150" width="46" height="18" rx="9" fill="#5B4A52" transform="rotate(-45 419 159)"/>
    <rect x="30" y="268" width="150" height="10" rx="4" fill="#B99A72"/><rect x="48" y="226" width="34" height="42" rx="5" fill="#E8664A"/><rect x="92" y="236" width="52" height="32" rx="5" fill="#3BB28F"/>
    <rect y="470" width="512" height="60" fill="#C9A77A"/>`},
  beach:()=>`<rect width="512" height="512" fill="#8FD0E6"/><rect y="150" width="512" height="140" fill="#A9DDEE"/>
    <circle cx="392" cy="128" r="40" fill="${AL_SUN}"/><path d="M300,282 C330,236 352,222 372,226 C392,214 410,232 424,252 L450,282Z" fill="#5E6E8C"/>
    <rect y="280" width="512" height="90" fill="#2F86B0"/><path d="M20,304 h70 M140,318 h90 M300,300 h60 M400,322 h80 M60,342 h60 M330,346 h70" stroke="#fff" stroke-opacity=".55" stroke-width="5" stroke-linecap="round"/>
    <path d="M0,362 C120,350 380,350 512,366 L512,512 L0,512Z" fill="#F0D398"/><path d="M0,400 C150,390 330,392 512,404" stroke="#DDB977" stroke-width="6" fill="none"/>`,
  redwood:()=>`<rect width="512" height="512" fill="#B9D9A8"/><rect width="512" height="150" fill="#DCEBC8"/>
    <g fill="#7B3A2A"><path d="M60,0 L92,0 L104,420 L48,420Z"/><path d="M400,0 L428,0 L446,420 L382,420Z"/><path d="M216,0 L236,0 L242,300 L210,300Z"/></g>
    <g fill="#5E2A1E"><path d="M60,0 L72,0 L76,420 L48,420Z"/><path d="M400,0 L412,0 L414,420 L382,420Z"/><path d="M216,0 L224,0 L224,300 L210,300Z"/></g>
    <g fill="#4E8F58"><path d="M120,60 C150,20 200,30 226,70 L130,96Z"/><path d="M300,20 C340,-10 390,10 404,60 L300,80Z"/><path d="M0,120 C30,70 90,80 110,130 L0,150Z"/><path d="M440,110 C470,70 512,80 512,130 L450,150Z"/></g>
    <path d="M0,420 C180,400 340,400 512,420 L512,512 L0,512Z" fill="#A07A58"/><path d="M0,470 C170,450 350,450 512,470" stroke="#8C6646" stroke-width="7" fill="none"/>`,
  records:()=>{const cols=["#E8664A","#F7E7A6","#3BB28F","#4FA3D9","#F4E9D8","#8E5BA6"];let s="";
    [[40,80],[40,170],[40,260]].forEach(([x,y],r)=>{s+=`<rect x="${x-10}" y="${y+52}" width="140" height="8" rx="3" fill="#C9A77A"/>`;for(let i=0;i<6;i++)s+=`<rect x="${x+i*22}" y="${y+(i%2?6:0)}" width="20" height="52" rx="2" fill="${cols[(i+r)%6]}"/>`});
    return `<rect width="512" height="512" fill="#5A2E4C"/><rect width="512" height="40" fill="#3A1A32"/>${s}
    <circle cx="400" cy="150" r="80" fill="#1A1016"/><circle cx="400" cy="150" r="60" fill="none" stroke="#2E242A" stroke-width="3"/><circle cx="400" cy="150" r="40" fill="none" stroke="#2E242A" stroke-width="3"/><circle cx="400" cy="150" r="24" fill="#E8664A"/><circle cx="400" cy="150" r="4" fill="#1A1016"/>
    <rect y="440" width="512" height="80" fill="#3A1A32"/>`},
  jetty:()=>`<rect width="512" height="512" fill="#F7A05A"/><rect width="512" height="90" fill="#8E4A78"/><rect y="90" width="512" height="70" fill="#E07B6A"/><rect y="160" width="512" height="60" fill="#F4905E"/>
    <circle cx="118" cy="176" r="46" fill="${AL_SUN}"/><rect y="250" width="512" height="90" fill="#6A4C86"/>
    <path d="M30,278 h80 M160,296 h70 M300,282 h90 M410,310 h70 M80,322 h60" stroke="#F7A05A" stroke-opacity=".6" stroke-width="5" stroke-linecap="round"/>
    <path d="M0,512 L120,340 L392,340 L512,512Z" fill="#7B4A3A"/><path d="M60,470 L452,470 M90,430 L422,430 M118,392 L394,392 M140,360 L372,360" stroke="#5E3428" stroke-width="7"/>
    <path d="M130,340 v-70 M382,340 v-70" stroke="#4A2A22" stroke-width="12" stroke-linecap="round"/>`
};
// ---- the name tag: a small lavender pill with the name in ink (letters hidden below 64px by kit.css)
function alPill(name,cx,cy){const nm=String(name||"").trim().slice(0,16)||"Allen",fs=Math.min(22,120/(nm.length*0.58)),w=Math.max(60,nm.length*0.58*fs+26);
  return `<g transform="translate(${cx},${cy})"><rect x="${-w/2}" y="-17" width="${w}" height="34" rx="17" fill="#D9CBF2" stroke="${AL_INK}" stroke-width="4"/><text class="al-tx" x="0" y="${(fs*0.36).toFixed(1)}" text-anchor="middle" font-family="Fredoka,'Instrument Sans',system-ui,sans-serif" font-weight="600" font-size="${fs.toFixed(1)}" fill="${AL_INK}">${esc(nm)}</text></g>`}
let alUid=0;
// ---- the mark itself. look: {coat, collar, gear:{head,eyes,neck,prop}, bg, name}; opt: {mood, scene}
// The default look (Kate's pick, 25 Oct 2026): the pastel style on a mint disc. No sun ring, no gold tag, a thinner outline, no sheen
// strokes, tan softened toward peach. opt.disc picks another pastel ("none" for no disc); opt.style "badge" is the old plum badge, kept
// only for comparison (it too has lost the ring and the yellow tag). With opt.scene the unlocked place fills the circle instead of the disc.
const PASTEL_DISC={mint:"#BFE8D6",blush:"#F3B8C8",sky:"#BFDDF5",lavender:"#D9CBF2",butter:"#F7E7A6",peach:"#F9D2B8"};
function alMark(look,opt){const P=opt.style!=="badge";const disc=opt.disc||"mint";let c=COATS[look.coat]||COATS.blacktan;if(P&&c.points)c=Object.assign({},c,{tan:"#E8B28C",tanDark:"#C98B63"});const col=hexOk(look.collar)?look.collar:COLLARS[0][0],g=look.gear||{},id="al"+(++alUid);
  const m=opt.mood==="puzzled"?"think":(opt.mood==="happy"||opt.mood==="think"?opt.mood:"");
  const S=`stroke="${AL_INK}" stroke-width="${P?6:10}" stroke-linejoin="round" stroke-linecap="round"`;
  const tilt=m==="think"?8:0,earUp=m==="happy"?-5:0;
  const HEAD="M256,112 C312,112 352,142 354,192 C356,232 340,254 324,274 C312,300 312,332 300,354 C290,372 274,382 256,382 C238,382 222,372 212,354 C200,332 200,300 188,274 C172,254 156,232 158,192 C160,142 200,112 256,112Z";
  const EAR="M200,150 C156,140 122,172 110,220 C104,244 98,262 92,284 C86,306 90,318 84,338 C78,358 72,374 70,396 C68,422 74,438 86,446 C96,452 106,448 112,442 C118,458 136,462 146,450 C154,464 174,464 182,450 C192,458 208,452 210,436 C214,390 212,340 206,296 C200,246 200,196 200,150Z";
  const gearOk=(slot,id)=>g[slot]===id&&ITEMS.some(it=>it.id===id&&it.slot===slot);
  let o=`<svg viewBox="${(opt.box||BOX.full).join(" ")}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><defs>
    <clipPath id="${id}k"><circle cx="256" cy="256" r="226"/></clipPath><clipPath id="${id}h"><path d="${HEAD}"/></clipPath><clipPath id="${id}e"><path d="${EAR}"/></clipPath></defs>
    ${P?(!opt.scene&&PASTEL_DISC[disc]?`<circle cx="256" cy="256" r="236" fill="${PASTEL_DISC[disc]}"/>`:""):`<circle cx="256" cy="256" r="246" fill="${AL_INK}"/>`}<g clip-path="url(#${id}k)">${P&&!opt.scene?"":(opt.scene&&AL_PLACES[look.bg]||AL_PLACES.plain)()}
    <g class="ab-dog"><g transform="translate(256,236) scale(.9) translate(-256,-236)">`;
  // body and chest
  o+=`<path d="M104,560 C112,470 156,404 210,376 L302,376 C356,404 400,470 408,560Z" fill="${c.base}" ${S}/>
    <path d="M150,470 C170,430 196,410 214,404 L212,560 L130,560Z" fill="${c.dark}" opacity=".6"/><path d="M362,470 C342,430 316,410 298,404 L300,560 L382,560Z" fill="${c.dark}" opacity=".6"/>`;
  if(c.points)o+=`<path d="M196,470 C214,452 236,456 246,478 C240,500 222,512 204,506 C192,496 190,482 196,470Z" fill="${c.tan}"/><path d="M316,470 C298,452 276,456 266,478 C272,500 290,512 308,506 C320,496 322,482 316,470Z" fill="${c.tan}"/>`;
  if(c.patch)o+=`<circle cx="160" cy="500" r="14" fill="${c.patch}"/><circle cx="350" cy="480" r="10" fill="${c.patch}"/>`;
  // neck gear sits over the chest
  if(gearOk("neck","lifejacket"))o+=`<path d="M170,424 C200,444 312,444 342,424 L356,560 L156,560Z" fill="#F08A3C" ${S}/><path d="M256,440 V560" stroke="${AL_INK}" stroke-width="8"/><path d="M184,462 H328 M190,498 H322" stroke="#1F3A5A" stroke-width="12"/><rect x="236" y="450" width="40" height="22" rx="4" fill="#1F3A5A" stroke="${AL_INK}" stroke-width="5"/>`;
  if(gearOk("neck","hivis"))o+=`<path d="M176,420 C206,442 306,442 336,420 L350,560 L162,560Z" fill="#D9F03A" ${S}/><path d="M256,436 V560" stroke="${AL_INK}" stroke-width="6"/><path d="M186,478 H326 M192,512 H320" stroke="#C9CDD6" stroke-width="12"/><path d="M186,478 H326 M192,512 H320" stroke="#fff" stroke-opacity=".6" stroke-width="4"/>`;
  // collar
  o+=`<path d="M190,384 C226,404 286,404 322,384 L328,416 C290,440 222,440 184,416Z" fill="${col}" ${S}/><path d="M194,394 C228,412 284,412 318,394" stroke="#fff" stroke-opacity=".25" stroke-width="5" fill="none"/>`;
  if(gearOk("neck","bandana"))o+=`<path d="M176,414 C222,442 290,442 336,414 L256,492Z" fill="#E8664A" ${S}/><g fill="#FFF1B8"><circle cx="236" cy="438" r="4"/><circle cx="276" cy="438" r="4"/><circle cx="256" cy="462" r="4"/></g>`;
  o+=`<g transform="rotate(${tilt} 256 330)">`;
  // ears: long wavy locks with a lighter edge so they read apart from the body
  const ear=flip=>{const t=flip?`translate(512,0) scale(-1,1) `:"";if(P)return `<g transform="${t}rotate(${earUp} 200 160)"><path d="${EAR}" fill="${c.base}" ${S}/><g clip-path="url(#${id}e)"><path d="M128,170 C108,230 98,300 86,360 C80,392 76,420 84,440 L40,450 L40,150Z" fill="${c.dark}" opacity=".45"/></g></g>`;return `<g transform="${t}rotate(${earUp} 200 160)"><path d="${EAR}" fill="${c.base}" ${S}/><g clip-path="url(#${id}e)">
      <path d="M128,170 C108,230 98,300 86,360 C80,392 76,420 84,440 L40,450 L40,150Z" fill="${c.dark}" opacity=".55"/>
      <path d="M200,150 C204,240 206,340 204,450 L224,450 L224,150Z" fill="${c.dark}" opacity=".5"/>
      <path d="M168,172 C140,212 138,252 124,292 C112,330 122,362 108,402 C102,420 100,434 104,448" stroke="${c.dark}" stroke-width="7" fill="none" stroke-linecap="round"/>
      <path d="M192,214 C180,254 188,292 174,332 C162,372 172,410 160,454" stroke="${c.dark}" stroke-width="6" fill="none" stroke-linecap="round"/>
      <path d="M150,192 C130,232 130,272 116,312 C106,346 114,372 100,412" stroke="${c.sheen}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".85"/>
      <path d="M182,252 C172,292 178,322 166,362 C158,394 164,420 152,446" stroke="${c.sheen}" stroke-width="4" fill="none" stroke-linecap="round" opacity=".7"/>
      <path d="M136,300 C128,330 134,350 124,380" stroke="${c.sheen}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".5"/>
      <path d="M118,214 C108,246 100,282 92,320 C84,358 76,398 76,428" stroke="${c.edge}" stroke-width="9" fill="none" stroke-linecap="round" opacity=".9"/>
            ${c.patch?`<ellipse cx="150" cy="300" rx="14" ry="22" fill="${c.patch}"/>`:""}</g></g>`};
  o+=ear(false)+ear(true);
  // head
  o+=`<path d="${HEAD}" fill="${c.base}" ${S}/><g clip-path="url(#${id}h)">`;
  if(!P)o+=`<path d="M150,180 C160,240 180,270 196,290 L150,300Z" fill="${c.dark}" opacity=".55"/><path d="M362,180 C352,240 332,270 316,290 L362,300Z" fill="${c.dark}" opacity=".55"/>
    <path d="M224,132 C240,124 262,122 278,126" stroke="${c.light}" stroke-width="6" fill="none" stroke-linecap="round" opacity=".8"/><path d="M290,134 C300,138 310,146 316,156" stroke="${c.light}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".6"/>
    <path d="M256,150 C250,190 248,240 252,290" stroke="${c.light}" stroke-width="7" fill="none" stroke-linecap="round" opacity=".7"/>`;
  if(c.points)o+=`<path d="M182,262 C198,250 222,254 234,272 C240,288 238,304 244,316 L268,316 C274,304 272,288 278,272 C290,254 314,250 330,262 C320,304 310,352 292,374 C278,388 234,388 220,374 C202,352 192,304 182,262Z" fill="${c.tan}"/>
    <path d="M220,374 C234,388 278,388 292,374 C286,362 226,362 220,374Z" fill="${c.tanDark}"/>`;
  else o+=`<path d="M206,304 C220,334 236,354 256,356 C276,354 292,334 306,304 C300,354 286,384 256,388 C226,384 212,354 206,304Z" fill="${c.light}" opacity=".6"/>`;
  if(c.patch)o+=`<ellipse cx="300" cy="150" rx="18" ry="12" fill="${c.patch}"/><circle cx="196" cy="300" r="9" fill="${c.patch}"/>`;
  o+=`</g>`;
  // brows (tan spots), lifted at the inner ends for an earnest look
  const bl=m==="think"?-8:0,br2=m==="think"?-16:(m==="happy"?-4:0),browC=c.points?c.tan:c.light;
  o+=`<ellipse cx="208" cy="${186+(m==="happy"?-4:bl)}" rx="16" ry="9.5" fill="${browC}" transform="rotate(-16 208 186)"/><ellipse cx="304" cy="${186+br2}" rx="16" ry="9.5" fill="${browC}" transform="rotate(16 304 186)"/>`;
  // eyes: big warm brown almonds with a catchlight
  const eye=(cx,flip)=>{const s=flip?-1:1,P=(x,y)=>`${cx+s*x},${226+y}`;
    if(m==="happy")return `<path d="M${P(-26,2)} C${P(-16,-14)} ${P(14,-14)} ${P(24,0)} C${P(12,-4)} ${P(-14,-4)} ${P(-26,2)}Z" fill="#160D12"/><path d="M${P(-22,8)} C${P(-8,2)} ${P(8,2)} ${P(20,6)}" stroke="${browC}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    const lx=m==="think"?5*s:0,ly=m==="think"?-6:0;
    return `<path d="M${P(-27,2)} C${P(-20,-16)} ${P(6,-20)} ${P(22,-8)} C${P(30,-2)} ${P(28,10)} ${P(20,14)} C${P(4,20)} ${P(-18,16)} ${P(-27,2)}Z" fill="#160D12"/>
      <circle cx="${cx+lx}" cy="${227+ly}" r="14.5" fill="#7E4419"/><circle cx="${cx+lx}" cy="${227+ly}" r="14.5" fill="none" stroke="#4A2410" stroke-width="3"/><circle cx="${cx+lx}" cy="${228+ly}" r="7" fill="#0C0709"/>
      <circle cx="${cx+lx-5}" cy="${221+ly}" r="4.6" fill="#fff"/><circle cx="${cx+lx+6}" cy="${233+ly}" r="2" fill="#fff" opacity=".7"/>
      <path d="M${P(-24,-4)} C${P(-14,-18)} ${P(8,-20)} ${P(22,-8)}" stroke="#0C0709" stroke-width="4" fill="none" stroke-linecap="round"/>`};
  o+=eye(216,false)+eye(296,true);
  // nose and mouth
  o+=`<path d="M218,310 C218,294 236,286 256,286 C276,286 294,294 294,310 C294,330 278,344 256,346 C234,344 218,330 218,310Z" fill="#140C10"/>
    <path d="M236,318 c4,-6 12,-6 14,2 c-4,4 -10,4 -14,-2Z M276,318 c-4,-6 -12,-6 -14,2 c4,4 10,4 14,-2Z" fill="#000"/><ellipse cx="246" cy="297" rx="14" ry="6" fill="#fff" opacity=".3"/>`;
  if(m==="happy")o+=`<path d="M228,352 C240,364 250,360 256,346 C262,360 272,364 284,352 C282,380 270,392 256,392 C242,392 230,380 228,352Z" fill="#3A1218" stroke="${AL_INK}" stroke-width="4" stroke-linejoin="round"/><path d="M243,374 C244,396 268,396 269,374 C262,380 250,380 243,374Z" fill="#E77A8C"/>`;
  else if(m==="think")o+=`<path d="M256,346 v10 M240,364 C250,366 260,364 276,358" stroke="${AL_INK}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  else o+=`<path d="M256,346 v10 M236,360 C246,368 252,364 256,356 C260,364 266,368 276,360" stroke="${AL_INK}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  // head gear
  if(gearOk("head","helmet"))o+=`<path d="M150,206 C150,120 200,84 256,84 C312,84 362,120 362,206 C330,194 282,190 256,190 C230,190 182,194 150,206Z" fill="#2E3237" ${S}/><path d="M244,86 C240,120 240,156 242,190 L270,190 C272,156 272,120 268,86Z" fill="${AL_SUN}"/><path d="M140,208 C200,194 312,194 372,208 L376,226 C312,214 200,214 136,226Z" fill="#1B1E22" ${S}/><path d="M176,124 C196,104 226,96 256,96" stroke="#fff" stroke-opacity=".25" stroke-width="8" fill="none" stroke-linecap="round"/>`;
  if(gearOk("head","headphones"))o+=`<path d="M152,214 C146,120 200,80 256,80 C312,80 366,120 360,214" fill="none" stroke="${AL_INK}" stroke-width="22" stroke-linecap="round"/><path d="M152,214 C146,120 200,80 256,80 C312,80 366,120 360,214" fill="none" stroke="#3B3F46" stroke-width="12" stroke-linecap="round"/>
    <rect x="124" y="196" width="48" height="66" rx="18" fill="#3B3F46" ${S}/><rect x="340" y="196" width="48" height="66" rx="18" fill="#3B3F46" ${S}/><rect x="136" y="210" width="24" height="38" rx="10" fill="#3BB28F"/><rect x="352" y="210" width="24" height="38" rx="10" fill="#3BB28F"/>`;
  if(gearOk("head","buckethat"))o+=`<path d="M170,196 C168,120 210,88 256,88 C302,88 344,120 342,196Z" fill="#7F8F5E" ${S}/><path d="M180,190 C190,178 232,172 256,172 C280,172 322,178 332,190" stroke="#5E6C44" stroke-width="8" fill="none"/>
    <path d="M120,200 C170,184 342,184 392,200 C398,214 386,228 370,226 C300,214 212,214 142,226 C126,228 114,214 120,200Z" fill="#7F8F5E" ${S}/>`;
  // eyes gear
  if(gearOk("eyes","goggles"))o+=`<path d="M120,226 C170,214 342,214 392,226" stroke="${AL_INK}" stroke-width="16" stroke-linecap="round"/><rect x="166" y="190" width="180" height="70" rx="30" fill="${AL_SUN}" ${S}/><rect x="180" y="202" width="152" height="46" rx="20" fill="#2E4F8C"/><path d="M196,214 h30 M250,214 h22" stroke="#9FC4F5" stroke-width="6" stroke-linecap="round"/>`;
  if(gearOk("eyes","labgoggles"))o+=`<path d="M126,224 C170,214 342,214 386,224" stroke="${AL_INK}" stroke-width="14" stroke-linecap="round"/><path d="M168,196 C190,186 322,186 344,196 C356,210 356,244 344,258 C322,268 190,268 168,258 C156,244 156,210 168,196Z" fill="#3BB28F" ${S}/><path d="M178,206 C198,198 314,198 334,206 C342,216 342,238 334,248 C314,256 198,256 178,248 C170,238 170,216 178,206Z" fill="#CFE6FF" opacity=".9"/><path d="M190,214 h26" stroke="#fff" stroke-width="5" stroke-linecap="round"/><g fill="${AL_INK}"><circle cx="172" cy="226" r="4"/><circle cx="340" cy="226" r="4"/></g>`;
  if(gearOk("eyes","glasses"))o+=`<g fill="none" stroke="#120A0E" stroke-width="7"><circle cx="214" cy="226" r="36"/><circle cx="298" cy="226" r="36"/><path d="M250,222 C252,214 260,214 262,222"/><path d="M178,220 L160,212 M334,220 L352,212"/></g><circle cx="214" cy="226" r="32" fill="#CFE6FF" opacity=".12"/><circle cx="298" cy="226" r="32" fill="#CFE6FF" opacity=".12"/><path d="M196,204 a26,26 0 0 1 18,-8 M280,204 a26,26 0 0 1 18,-8" stroke="#fff" stroke-opacity=".6" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  o+=`</g>`;
  // what he carries, tucked beside the chest
  if(gearOk("prop","rod"))o+=`<path d="M330,520 L462,150" stroke="${AL_INK}" stroke-width="12" stroke-linecap="round"/><path d="M330,520 L462,150" stroke="#B98A5A" stroke-width="5" stroke-linecap="round"/><path d="M462,150 C476,190 474,230 456,260" stroke="#E9E1D0" stroke-width="3" fill="none"/><circle cx="366" cy="440" r="16" fill="#3B3F46" ${S}/><circle cx="366" cy="440" r="5" fill="#B9BEC6"/>`;
  if(gearOk("prop","plush"))o+=`<g transform="translate(124,440) rotate(-10)"><ellipse cx="0" cy="0" rx="40" ry="30" fill="#8C6A3E" ${S}/><circle cx="-26" cy="-22" r="16" fill="#8C6A3E" ${S}/><path d="M-40,-24 L-84,-14" stroke="${AL_INK}" stroke-width="8" stroke-linecap="round"/><circle cx="-30" cy="-26" r="3" fill="${AL_INK}"/><path d="M-10,28 v14 M14,28 v14" stroke="${AL_INK}" stroke-width="6" stroke-linecap="round"/></g>`;
  if(gearOk("prop","map"))o+=`<g transform="translate(398,430) rotate(10)"><path d="M-44,-30 L-14,-38 L14,-30 L44,-38 L44,30 L14,38 L-14,30 L-44,38Z" fill="#F4E9D8" ${S}/><path d="M-14,-38 V30 M14,-30 V38" stroke="#D9C7B5" stroke-width="3"/><path d="M-34,16 C-20,0 -4,14 10,-6 C20,-18 30,-14 36,-24" stroke="#3BB28F" stroke-width="4" fill="none" stroke-linecap="round" stroke-dasharray="7 5"/><circle cx="24" cy="12" r="10" fill="#fff" stroke="${AL_INK}" stroke-width="3"/><path d="M24,4 L28,12 L24,20 L20,12Z" fill="#E8664A"/></g>`;
  o+=alPill(look.name,256,466);
  o+=`</g></g></g></svg>`;
  return o}
function allenSVG(look,opt){look=look||{};opt=opt||{};   // the contract: A.svg(look, {mood, box, scene, label, style, disc}) -> markup; default style is pastel on a mint disc
  const lab=opt.label?`role="img" aria-label="${esc(opt.label)}"`:`aria-hidden="true"`;
  const mood=/^(happy|puzzled|think)$/.test(opt.mood||"")?" m-"+opt.mood:"";
  const box=opt.scene?BOX.scene:(BOX[opt.box]||BOX.full);
  return `<span class="allen av${opt.scene?" scene":""}${mood}" ${lab} style="aspect-ratio:${box[2]}/${box[3]}">${alMark(look,{mood:opt.mood,scene:!!opt.scene,box,style:opt.style,disc:opt.disc})}</span>`}
// ---- his look, saved on this device (works without storage too)
const AL_KEY="allen",AL_DEFAULT={name:"Allen",coat:"blacktan",collar:"#3BB28F",gear:{head:"",eyes:"",neck:"",prop:""},bg:"workshop",minimal:false,seen:[]};
let alMem=null;
function alLoad(){let v=alMem;try{const raw=localStorage.getItem(AL_KEY);if(raw)v=JSON.parse(raw)}catch(e){}v=v&&typeof v==="object"?v:{};
  return {...AL_DEFAULT,...v,gear:{...AL_DEFAULT.gear,...(v.gear||{})},seen:Array.isArray(v.seen)?v.seen:[]}}
function alSave(look){alMem=look;try{localStorage.setItem(AL_KEY,JSON.stringify(look))}catch(e){}}
const MNAME={bike:"the downhill machine",vinyl:"the vinyl machine",fish:"the fishing machine",claw:"the claw machine",particles:"the particle machine",atoms:"the atom machine",energy:"the energy machine",read:"the reading machine",maps:"the map machine",materials:"the materials lab",text:"the text studio",vend:"the vending machine",pinball:"the pinball table",phone:"the phone machine",queue:"the queue machine",plan:"the floor-plan studio"};
const ITEMS=[
  {id:"helmet",slot:"head",label:"Downhill helmet",m:["bike"]},
  {id:"headphones",slot:"head",label:"Headphones",m:["vinyl"]},
  {id:"buckethat",slot:"head",label:"Bucket hat",m:["fish"]},
  {id:"goggles",slot:"eyes",label:"Downhill goggles",m:["bike"]},
  {id:"labgoggles",slot:"eyes",label:"Lab goggles",m:["particles","atoms","energy","materials","vend","phone","pinball"]},
  {id:"glasses",slot:"eyes",label:"Reading glasses",m:["read","text"]},
  {id:"bandana",slot:"neck",label:"Bandana",machines:3},
  {id:"lifejacket",slot:"neck",label:"Life jacket",passes:10},
  {id:"hivis",slot:"neck",label:"Hi-vis vest",m:["queue","plan"]},
  {id:"rod",slot:"prop",label:"Fishing rod",m:["fish"]},
  {id:"plush",slot:"prop",label:"Kiwi plush",m:["claw"]},
  {id:"map",slot:"prop",label:"Map and compass",m:["maps","plan"]}
];
const BGS=[{id:"workshop",days:0},{id:"beach",days:3},{id:"redwood",days:7},{id:"records",days:10},{id:"jetty",days:14}];
const orList=a=>a.length<2?a.join(""):a.slice(0,-1).join(", ")+" or "+a[a.length-1];
function alState(L){L=L||readLog();
  const passM=new Set(L.filter(x=>x.kind==="pass").map(x=>x.m)),passes=L.filter(x=>x.kind==="pass").length;
  const days=[...new Set(L.map(x=>x.d).filter(Boolean))].sort();let best=0,run=0,prev=null;
  days.forEach(d=>{const t=Date.parse(d+"T12:00:00Z");run=prev!==null&&Math.round((t-prev)/864e5)===1?run+1:1;prev=t;best=Math.max(best,run)});
  const ds=new Set(days),today=nzDay(Date.now());let cur=0,c=Date.now();if(!ds.has(nzDay(c)))c-=864e5;while(ds.has(nzDay(c))){cur++;c-=864e5}
  const has=new Set(),why={};
  ITEMS.forEach(it=>{let ok=false;
    if(it.m){ok=it.m.some(m=>passM.has(m));why[it.id]=`Pass a challenge in ${orList(it.m.map(m=>MNAME[m]||m))}`}
    else if(it.machines){ok=passM.size>=it.machines;why[it.id]=`Pass challenges in ${it.machines} different machines (${Math.min(passM.size,it.machines)} of ${it.machines})`}
    else if(it.passes){ok=passes>=it.passes;why[it.id]=`Pass ${it.passes} challenges (${Math.min(passes,it.passes)} of ${it.passes})`}
    if(ok)has.add(it.id)});
  BGS.forEach(b=>{if(best>=b.days)has.add("bg:"+b.id);why["bg:"+b.id]=`Reach a ${b.days}-day streak (best so far: ${best})`});
  const nextBg=BGS.find(b=>best<b.days);
  return {has,why,best,current:cur,passes,passMachines:passM.size,todayPass:L.some(x=>x.d===today&&x.kind==="pass"),nextBg}}
const ALLEN={svg:allenSVG,load:alLoad,save:alSave,state:alState,coats:COATS,collars:COLLARS,items:ITEMS,backgrounds:BGS,scenes:BG,defaults:AL_DEFAULT,boxes:BOX,
  label:id=>{const it=ITEMS.find(x=>x.id===id);if(it)return it.label;const b=id.replace(/^bg:/,"");return BG[b]?BG[b].label+" background":id}};

// ---- Allen in a machine: a small, reacting companion in the corner of the bench
const CHEERS=["Nailed it.","That's the one.","Tail's going. Nice.","Clean. Next one?","Yes! Assembled."];
const HMMS=["Hmm. Not yet. Tweak a control and check again.","Close-ish. Watch the readouts.","Not quite. Have another go."];
const PETS=["Ears up. Let's go.","Piece by piece.","I'm here if you need a wiggle.","Good company, this."];
const pick=a=>a[Math.floor(Math.random()*a.length)];
function allenCorner(api,cfg,parent){
  const box=document.createElement("div");box.className="al-corner";
  box.innerHTML=`<div class="al-say" role="status" aria-live="polite" hidden></div><button type="button" class="al-dog"></button>`;
  const say=box.querySelector(".al-say"),dog=box.querySelector(".al-dog");let look=alLoad(),mood="",hideT=0,moodT=0,nudgeT=0;
  function render(){look=alLoad();box.classList.toggle("mini",!!look.minimal);
    dog.innerHTML=allenSVG(look,{mood,box:"full"});
    dog.setAttribute("aria-label",`${look.name||"Allen"}, your study dachshund. Press for a wiggle.`)}
  function speak(html,ms){if(look.minimal){say.hidden=true;return}clearTimeout(hideT);say.innerHTML=html;say.hidden=false;hideT=setTimeout(()=>{say.hidden=true},ms||3600)}
  function anim(cls,ms){const s=dog.querySelector(".allen");if(!s||calm())return;s.classList.remove("wiggle","tilt");void s.getBoundingClientRect();s.classList.add(cls);setTimeout(()=>s.classList.remove(cls),ms)}
  function setMood(m,ms){mood=m;render();clearTimeout(moodT);moodT=setTimeout(()=>{mood="";render()},ms)}
  function react(ok,before){clearTimeout(nudgeT);
    if(ok){setMood("happy",2400);anim("wiggle",1100);setTimeout(()=>sfx("yip"),420);
      const now=alState(),seen0=new Set(alLoad().seen||[]),fresh=[...now.has].filter(k=>before?!before.has(k):!seen0.has(k));
      if(fresh.length){const L=alLoad();L.seen=[...new Set([...(L.seen||[]),...fresh])];alSave(L);
        speak(`New: <b>${fresh.map(k=>esc(ALLEN.label(k))).join(", ")}</b>. It's in my den on the home page.`,7000)}
      else speak(pick(CHEERS),3200)}
    else{setMood("puzzled",2000);anim("tilt",1600);speak(pick(HMMS),3400)}}
  dog.onclick=()=>{setMood("happy",1600);anim("wiggle",1100);sfx("yip");if(!look.minimal)speak(pick(PETS),2600)};
  say.addEventListener("click",e=>{const b=e.target.closest("[data-go]");if(!b)return;const i=cfg.steps.findIndex(x=>x.k==="test");if(i>=0){api.setStep(i);say.hidden=true;const ch=document.getElementById("k-challenge");try{ch&&ch.scrollIntoView({block:"nearest",behavior:calm()?"auto":"smooth"})}catch(err){}}});
  const nav=document.querySelector("nav.steps"),stage=document.querySelector(".stage");let mq=null;try{mq=matchMedia("(max-width:820px)")}catch(e){}
  const slot=document.getElementById("k-al-slot");const place=()=>{const t=parent||slot||(mq&&mq.matches?stage:nav);if(t&&box.parentNode!==t)t.appendChild(box)};place();
  try{mq&&mq.addEventListener("change",place)}catch(e){}
  render();
  const st=alState();
  if(!st.todayPass&&cfg.steps.some(x=>x.k==="test"))nudgeT=setTimeout(()=>speak(`One challenge keeps your streak going.${api.step&&api.step.k==="test"?"":` <button type="button" class="btn al-go" data-go>Go to the challenges</button>`}`,9000),1600);
  return {react,render,speak,el:box}}

// ---- kupu Māori: verified te reo terms a machine can carry (cfg.kupu, step.kupu). ta = Te Aka Māori Dictionary word id.
const TEAKA=id=>`https://maoridictionary.co.nz/word/${encodeURIComponent(id)}`;
const kupuOk=k=>k&&typeof k==="object"&&k.mi&&k.en;
function kupuItem(k){return `<li><b lang="mi">${esc(k.mi)}</b><span class="en">${esc(k.en)}</span>${k.ta?`<a class="ta" href="${TEAKA(k.ta)}" target="_blank" rel="noopener" aria-label="${esc(k.mi)} in Te Aka Māori Dictionary (opens in a new tab)">Te Aka ↗</a>`:""}${k.note?`<small>${esc(k.note)}</small>`:""}</li>`}
let reoOn=false;try{reoOn=localStorage.getItem("studyreo")==="on"}catch(e){}
function setReo(v){reoOn=!!v;try{localStorage.setItem("studyreo",reoOn?"on":"off")}catch(e){}}
function mount(cfg){logStudy("open");
  const KU=(Array.isArray(cfg.kupu)?cfg.kupu:[]).filter(kupuOk);
  const kFind=x=>typeof x==="string"?KU.find(k=>k.mi===x):(kupuOk(x)?x:null);
  const stepKupu=st=>{const seen=new Set();return (Array.isArray(st&&st.kupu)?st.kupu:[]).map(kFind).filter(k=>k&&!seen.has(k.mi)&&seen.add(k.mi))};
  const CH={};[...KU,...cfg.steps.flatMap(st=>(Array.isArray(st.kupu)?st.kupu:[]).filter(kupuOk))].forEach(k=>{[].concat(k.chip||[]).forEach(c=>{if(!CH[c])CH[c]=k.mi})});
  const hasCH=Object.keys(CH).length>0;
  const s=cfg.state; s.playing=s.playing!==undefined?s.playing:!calm();
  const app=document.getElementById("app");
  const mid=cfg.id||MID;
  try{document.documentElement.style.setProperty("--acc",cfg.accent||accentFor(mid))}catch(e){}
  // the machine's case tint (one pastel per machine, see refs/figure/README.md): washes the bench canvases and keys the step chip
  try{const tint=cfg.caseTint&&(FIG_PALETTE.case[cfg.caseTint]||cfg.caseTint);if(tint)document.documentElement.style.setProperty("--case",tint)}catch(e){}
  const exam=cfg.badge?.exam?daysUntil(cfg.badge.exam):null;
  const examTxt=cfg.badge?`${esc(cfg.badge.label)}${cfg.badge.examText?` · exam <b>${esc(cfg.badge.examText)}</b>`:""}${exam!==null&&exam>0?`<span class="dd">${exam} day${exam===1?"":"s"}</span>`:""}`:"";
  const home=cfg.home||"../index.html";
  app.innerHTML=`<div class="wrap">
  <header class="apphead">
    <a class="back" href="${home}${cfg.homeHash?"#"+cfg.homeHash:""}" aria-label="All study machines" title="All study machines">${ICO.back}</a>
    <span class="appicon" aria-hidden="true">${glyph(mid)}</span>
    <div class="apptitle"><div class="eyebrow">${esc(cfg.eyebrow)}</div><h1>${esc(cfg.title)}</h1></div>
    <div class="mhr">${cfg.badge?`<div class="exam">${examTxt}</div>`:""}<button class="ibtn snd" type="button" id="k-snd" aria-pressed="true"></button><button class="ibtn" type="button" id="k-al" aria-pressed="false">${ICO.paw}</button>${hasCH?`<button class="ibtn txt" type="button" id="k-reo" aria-pressed="false" title="Add the te reo Māori term in brackets to readouts">Reo</button>`:""}</div>
  </header>
  <section class="bench" aria-label="${esc(cfg.title)}">
    <nav class="steps" aria-label="Steps"><div class="fig">${esc(cfg.fig||"")}</div><h2>${esc(cfg.railTitle||"")}</h2><div id="k-steps" style="display:contents"></div></nav>
    <div class="prog" aria-hidden="true"><i id="k-prog"></i></div>
    <div class="stage">
      <div class="caprow"><span class="stepno" id="k-stepno"></span><p class="caption" id="k-cap"></p><button class="btn nextb" type="button" id="k-next"></button></div>
      <div class="play">
        <div class="playmain"><div class="canvas ${cfg.mainPhoneBig?"phone-big":""}"><svg id="k-main" viewBox="${cfg.mainBox}" role="img" aria-label="${esc(cfg.mainLabel||cfg.title)}"></svg></div>
        <div class="controls" id="k-ctl"></div></div>
        <div class="rail"><div class="chips" id="k-chips" aria-live="polite"></div><div class="al-slot" id="k-al-slot"></div></div>
      </div>
      <div class="lower ${cfg.closeBox?"":"noclose"}">
        ${cfg.closeBox?`<div class="canvas"><svg id="k-close" viewBox="${cfg.closeBox}" role="img" aria-label="Close-up view"></svg></div>`:""}
        <div class="side">
          <div class="card challenge" id="k-challenge" hidden></div>
          <div class="deck" id="k-deck" role="tablist" aria-label="Notes for this step"></div>
          <div class="card examline" id="k-examcard" role="tabpanel"><h3>${ICO.exam}Say it in the exam</h3><p id="k-exam"></p><button class="btn copy" id="k-copy" type="button">Copy</button></div>
          <div class="card trap" id="k-trapcard" role="tabpanel"><h3>${ICO.trap}Common trap</h3><p id="k-trap"></p></div>
          <div class="card big" id="k-bigcard" role="tabpanel"><h3>${ICO.big}Big idea</h3><p id="k-big"></p></div>
          ${KU.length?`<div class="card kupu" id="k-kupu" role="tabpanel" hidden><h3>${ICO.kupu}Kupu Māori</h3><ul class="kupu-list" id="k-kupul"></ul></div>`:""}
        </div>
      </div>
    </div>
  </section>
  ${cfg.papers?.length?`<div class="card practise"><h3>Practise with the real thing</h3><div class="papers">${cfg.papers.map(p=>`<a class="btn" href="${p.url}" target="_blank" rel="noopener">${esc(p.label)} ↗</a>`).join("")}</div><p>Past papers, marking schedules and example answers are on NZQA's site. Do one under exam time, then mark it with the schedule.</p></div>`:""}
  ${KU.length?`<details class="card kupu-all"><summary><span class="kh">Kupu Māori in this machine</span><span class="kn">${KU.length} terms</span></summary><ul class="kupu-list">${KU.map(kupuItem).join("")}</ul><p class="kupu-src">Each term was checked against Te Aka Māori Dictionary, which includes the Ministry of Education's Māori-medium science (Te Reo Pūtaiao) and maths (Te Reo Pāngarau) dictionaries. Some ideas have more than one term, and usage can vary between iwi and schools, so check with your teacher which one your class uses.</p></details>`:""}
  <footer><p><span class="truth">Simulated</span>${cfg.truth||"A simplified model for learning. Check model answers with your teacher."}</p>${cfg.footer?`<p>${cfg.footer}</p>`:""}<p>Not made by or endorsed by NZQA or the Ministry of Education.</p><p class="as-foot">${LOCKUP}<span>assembly is made by assembl in Aotearoa.</span></p></footer>
</div>`;
  const $=id=>document.getElementById(id);
  let step=0,mounted=false;const seenSteps=new Set();
  const snd=$("k-snd");const showSnd=()=>{snd.innerHTML=muted?ICO.sndOff:ICO.sndOn;snd.setAttribute("aria-pressed",muted?"false":"true");snd.setAttribute("aria-label",muted?"Sound off":"Sound on");snd.title=muted?"Sound is off":"Sound is on"};showSnd();snd.onclick=()=>{setMuted(!muted);showSnd();sfx("pop")};
  const stepsEl=$("k-steps");
  cfg.steps.forEach((st,i)=>{const b=document.createElement("button");b.className="step";b.type="button";
    b.innerHTML=`<span class="n">${st.k==="test"?"✓":i+1}</span>${esc(st.lab)}`;b.onclick=()=>{sfx("whoosh");setStep(i)};stepsEl.appendChild(b)});
  const nextB=$("k-next");nextB.onclick=()=>{if(step<cfg.steps.length-1){sfx("whoosh");setStep(step+1);try{$("k-cap").scrollIntoView({block:"nearest",behavior:calm()?"auto":"smooth"})}catch(e){}}};
  // controls
  const ctlEl=$("k-ctl"), ctlEls={};
  (cfg.controls||[]).forEach(c=>{let el;
    if(c.type==="play"){el=document.createElement("button");el.className="btn primary";el.type="button";el.id="k-play";el.onclick=()=>{s.playing=!s.playing;sfx("pop");sync()}}
    else if(c.type==="button"){el=document.createElement("button");el.className="btn";el.type="button";el.textContent=c.label;el.onclick=()=>{sfx("pop");c.onClick(s,api);redraw()}}
    else if(c.type==="range"){el=document.createElement("label");el.className="ctl range";el.htmlFor="k-"+c.id;
      el.innerHTML=`<span>${esc(c.label)}</span><input id="k-${c.id}" type="range" min="${c.min}" max="${c.max}" step="${c.step||1}"><output id="k-${c.id}-o"></output>`;
      el.querySelector("input").oninput=e=>{sfx("tick");c.set(s,+e.target.value,api);redraw()}}
    else if(c.type==="toggle"){el=document.createElement("button");el.className="btn tog";el.type="button";el.textContent=c.label;el.onclick=()=>{sfx("pop");c.set(s,!c.get(s),api);redraw()}}
    else if(c.type==="select"){el=document.createElement("label");el.className="ctl";el.htmlFor="k-"+c.id;
      el.innerHTML=`<span>${esc(c.label)}</span><select id="k-${c.id}">${c.options.map(o=>`<option value="${o[0]}">${esc(o[1])}</option>`).join("")}</select>`;
      el.querySelector("select").onchange=e=>{sfx("pop");c.set(s,e.target.value,api);redraw()}}
    ctlEls[c.id||c.type]=el;ctlEl.appendChild(el)});
  function sync(){
    const st=cfg.steps[step];
    (cfg.controls||[]).forEach(c=>{const el=ctlEls[c.id||c.type];const show=!st.controls||st.controls.includes(c.id||c.type);el.hidden=!show;
      if(c.type==="play"){el.textContent=s.playing?"❚❚ Pause":"▶ Play";el.hidden=el.hidden||!st.speed}
      if(c.type==="range"){const i=el.querySelector("input");if(document.activeElement!==i)i.value=c.get(s);el.querySelector("output").textContent=c.fmt?c.fmt(s):c.get(s)}
      if(c.type==="toggle"){el.setAttribute("aria-pressed",c.get(s)?"true":"false");if(c.labelFn)el.textContent=c.labelFn(s)}
      if(c.type==="select"){const i=el.querySelector("select");if(document.activeElement!==i)i.value=c.get(s)}});
  }
  // the notes deck: exam line, trap, big idea and kupu, one at a time
  const DECK=[["exam","Exam line","k-examcard",ICO.exam],["trap","Trap","k-trapcard",ICO.trap],["big","Big idea","k-bigcard",ICO.big],["kupu","Kupu","k-kupu",ICO.kupu]];
  let deckSel="exam";
  function showDeck(){const avail=DECK.filter(([k,,id])=>{const el=$(id);return el&&!el.hidden});
    if(!avail.some(d=>d[0]===deckSel)&&avail.length)deckSel=avail[0][0];
    const dk=$("k-deck");dk.hidden=avail.length<2;
    dk.innerHTML=avail.map(([k,l,id,ic])=>`<button type="button" role="tab" data-k="${k}" aria-controls="${id}" aria-selected="${k===deckSel}">${ic}${l}</button>`).join("");
    DECK.forEach(([k,,id])=>{const el=$(id);if(el)el.classList.toggle("off",k!==deckSel)})}
  $("k-deck").addEventListener("click",e=>{const b=e.target.closest("[data-k]");if(!b)return;deckSel=b.dataset.k;sfx("tick");showDeck();const nb=$("k-deck").querySelector(`[data-k="${deckSel}"]`);nb&&nb.focus()});
  // arrow keys move between the note tabs, as a tablist should
  $("k-deck").addEventListener("keydown",e=>{if(e.key!=="ArrowRight"&&e.key!=="ArrowLeft"&&e.key!=="Home"&&e.key!=="End")return;const tabs=[...$("k-deck").querySelectorAll("[data-k]")];const i=tabs.indexOf(document.activeElement);if(i<0)return;e.preventDefault();const j=e.key==="Home"?0:e.key==="End"?tabs.length-1:(i+(e.key==="ArrowRight"?1:-1)+tabs.length)%tabs.length;tabs[j].click()});
  function setStep(i){step=i;const st=cfg.steps[i];seenSteps.add(i);
    document.querySelectorAll(".step").forEach((b,j)=>{b.setAttribute("aria-current",j===i?"true":"false");b.classList.toggle("done",seenSteps.has(j)&&j!==i)});
    const cur=document.querySelectorAll(".step")[i];if(mounted)try{cur&&cur.scrollIntoView({inline:"nearest",block:"nearest"})}catch(e){}
    $("k-prog").style.width=((i+1)/cfg.steps.length*100).toFixed(1)+"%";
    $("k-stepno").textContent=st.k==="test"?"Test":`${i+1} of ${cfg.steps.length}`;
    const nx=cfg.steps[i+1];nextB.hidden=!nx;if(nx)nextB.textContent=nx.k==="test"?"Test yourself →":"Next →";
    $("k-cap").innerHTML=st.cap+(st.speedLabel?`<span class="slow">${st.speedLabel}</span>`:"");
    $("k-big").innerHTML=st.big||"";$("k-exam").textContent=st.exam||"";$("k-trap").textContent=st.trap||"";
    $("k-examcard").hidden=!st.exam;$("k-trapcard").hidden=!st.trap;$("k-bigcard").hidden=!st.big;
    if(KU.length){const sk=stepKupu(st),kc=$("k-kupu");kc.hidden=!sk.length;$("k-kupul").innerHTML=sk.map(kupuItem).join("")}
    showDeck();
    const ch=$("k-challenge");ch.hidden=st.k!=="test";
    if(st.k==="test"){s.playing=false;ch.innerHTML=`<h3>${ICO.check}Challenges</h3>`+(cfg.challenges||[]).map((x,n)=>`<div class="row" id="k-row${n}"><span class="q"><b class="qn">${n+1}</b>${x.q}</span><button class="btn check" type="button" id="k-chk${n}">Check</button><div class="fb" id="k-fb${n}"></div></div>`).join("");
      (cfg.challenges||[]).forEach((x,n)=>$("k-chk"+n).onclick=()=>{const ok=x.check(s);const before=alState();if(ok)logStudy("pass");sfx(ok?"win":"buzz");const f=$("k-fb"+n);if(ok)burst($("k-chk"+n));f.className="fb "+(ok?"ok":"no");f.textContent=ok?(typeof x.ok==="function"?x.ok(s):x.ok):(typeof x.no==="function"?x.no(s):x.no);
        $("k-row"+n).classList.toggle("passed",!!ok);
        try{buddy&&buddy.react(ok,before.has)}catch(e){}})}
    st.onStep&&st.onStep(s,st,api);cfg.onStep&&cfg.onStep(s,st,api);
    try{history.replaceState(null,"","#"+st.k)}catch(e){}
    redraw();
  }
  function redraw(){const st=cfg.steps[step];
    $("k-main").innerHTML=cfg.drawMain(s,st,api);
    if(cfg.closeBox)$("k-close").innerHTML=cfg.drawClose(s,st,api);
    const map=cfg.chips?cfg.chips(s,st):{};
    $("k-chips").innerHTML=(st.chips||[]).filter(k=>map[k]).map(k=>{const[l,v,h]=map[k];return`<div class="chip${h?" hot":""}"><span>${esc(l)}${reoOn&&CH[k]?` <i lang="mi">(${esc(CH[k])})</i>`:""}</span>${esc(v)}</div>`}).join("");
    sync();
  }
  $("k-copy").onclick=()=>{const b=$("k-copy"),txt=$("k-exam").textContent;const done=()=>{b.textContent="Copied";setTimeout(()=>b.textContent="Copy",1500)};
    const sel=()=>{const r=document.createRange();r.selectNodeContents($("k-exam"));const g=getSelection();g.removeAllRanges();g.addRange(r);b.textContent="Selected"};
    try{navigator.clipboard.writeText(txt).then(done,sel)}catch(e){sel()}};
  const api={redraw,get step(){return cfg.steps[step]},setStep,state:s};
  let buddy=null;try{buddy=allenCorner(api,cfg,$("k-al-slot"))}catch(e){}
  const alBtn=$("k-al"),showAl=()=>{const m=!!alLoad().minimal;alBtn.setAttribute("aria-pressed",m?"true":"false");const t=m?"Tiny Allen is on: a small badge with no speech bubbles":"Tiny Allen: shrink Allen to a small badge";alBtn.title=t;alBtn.setAttribute("aria-label",t)};showAl();
  alBtn.onclick=()=>{const L=alLoad();L.minimal=!L.minimal;alSave(L);showAl();sfx("pop");buddy&&buddy.render()};
  const reoBtn=$("k-reo");if(reoBtn){const showReo=()=>{reoBtn.setAttribute("aria-pressed",reoOn?"true":"false")};showReo();reoBtn.onclick=()=>{setReo(!reoOn);showReo();sfx("pop");redraw()}}
  let visible=true,last=null;try{new IntersectionObserver(es=>visible=es[0].isIntersecting).observe($("k-main"))}catch(e){}
  function loop(ts){const st=cfg.steps[step];
    if(s.playing&&visible&&st.speed&&cfg.tick){if(last!=null){cfg.tick(s,Math.min(.1,(ts-last)/1000),st,api);redraw()}last=ts}else last=null;
    requestAnimationFrame(loop)}
  const h=(location.hash||"").slice(1),hi=cfg.steps.findIndex(x=>x.k===h);
  setStep(hi>=0?hi:0);mounted=true;requestAnimationFrame(loop);
  window.addEventListener("hashchange",()=>{const k=(location.hash||"").slice(1),j=cfg.steps.findIndex(x=>x.k===k);if(j>=0&&j!==step)setStep(j)});
  return api;
}

/* ================= figure materials =================
   One recipe for every figure on the bench, 3D or drawn, so the machines read as one family (the "Colorfigures" look:
   soft matte pastels, glass-like body, metal that reads as metal, crisp silhouettes, a calm paper-white ground).
   StudyKit.figMat(kind, colour) → SVG styling {fill, stroke, hi, shade, attrs} for a drawing;
   StudyKit.figMat.three(THREE, kind, colour, opts) → a three.js material with the same recipe (rim darkening for firm edges). */
const FIG={
  metal:  {rough:0.32,metal:0.9, rim:0.6, colour:"#CBD3DD",strokeK:0.42,hiK:0.6, shadeK:0.28},
  plastic:{rough:0.45,metal:0.02,rim:0.5, colour:"#CFECDD",strokeK:0.45,hiK:0.4, shadeK:0.22},
  glass:  {rough:0.08,metal:0,   rim:0,   colour:"#BFE8D6",strokeK:0.3, hiK:0.6, shadeK:0.1, transmission:0.92,opacity:0.16},
  rubber: {rough:0.92,metal:0,   rim:0.6, colour:"#3C4557",strokeK:0.5, hiK:0.25,shadeK:0.3},
  painted:{rough:0.3, metal:0.05,rim:0.55,colour:"#F4A6B8",strokeK:0.45,hiK:0.5, shadeK:0.26},
  wood:   {rough:0.7, metal:0,   rim:0.35,colour:"#C9A072",strokeK:0.45,hiK:0.35,shadeK:0.25}};
// the settled palette (from Kate's two reference figures, see refs/figure/README.md): frosted pastel acrylic cases, saturated pastel products,
// copper and brushed steel for the works, pale-mint plastic housings, a navy drop shadow on paper white
const FIG_PALETTE={paper:"#F7F3EC",shadow:"#1B2452",case:{blush:"#F3B8C8",mint:"#BFE8D6",lavender:"#D9CBF2",butter:"#F7E7A6",sky:"#BFDDF5",peach:"#F9D2B8"},
  product:{strawberry:"#E8688A",blueberry:"#6FA3E8",lime:"#96C94E",butter:"#F2C83C",peach:"#F49A5E"},copper:"#C97A4A",steel:"#CBD3DD",steelDark:"#8F9BAA",mintPlastic:"#CFECDD",pcb:"#5FA87A",
  pill:{bg:"#FFFFFF",ink:"#4E4868",line:"#DCD6EA"}};
const hex2=h=>{const m=String(h).replace("#","");const n=parseInt(m.length===3?m.split("").map(c=>c+c).join(""):m,16);return [(n>>16)&255,(n>>8)&255,n&255]};
const rgb2hex=(r,g,b)=>"#"+[r,g,b].map(v=>Math.round(Math.max(0,Math.min(255,v))).toString(16).padStart(2,"0")).join("");
const mixTo=(h,k,to)=>{const [r,g,b]=hex2(h);return rgb2hex(r+(to-r)*k,g+(to-g)*k,b+(to-b)*k)};
function figMat(kind,colour,opts){const K=FIG[kind]||FIG.painted;const c=colour||K.colour;opts=opts||{};
  const stroke=mixTo(c,K.strokeK,0),hi=mixTo(c,K.hiK,255),shade=mixTo(c,K.shadeK,0);
  const o={kind,fill:c,stroke,hi,shade,opacity:kind==="glass"?(opts.opacity!=null?opts.opacity:0.35):1,
    attrs:`fill="${c}" stroke="${stroke}" stroke-width="${opts.sw||1.4}" stroke-linejoin="round"${kind==="glass"?` fill-opacity="${opts.opacity!=null?opts.opacity:0.35}"`:""}`};
  // a highlight streak for metal and glass, a soft sheen for painted: callers draw it with o.hi
  return o}
figMat.kinds=Object.keys(FIG);figMat.palette=FIG_PALETTE;
figMat.three=function(THREE,kind,colour,opts){const K=FIG[kind]||FIG.painted;opts=opts||{};const c=colour||K.colour;let m;
  if(kind==="glass"){m=new THREE.MeshPhysicalMaterial({color:c,roughness:K.rough,metalness:0,transmission:opts.transmission!=null?opts.transmission:K.transmission,transparent:true,opacity:opts.opacity!=null?opts.opacity:K.opacity,clearcoat:0.6,clearcoatRoughness:0.2,depthWrite:false,side:THREE.DoubleSide})}
  else{m=new THREE.MeshStandardMaterial({color:c,roughness:opts.rough!=null?opts.rough:K.rough,metalness:opts.metal!=null?opts.metal:K.metal,envMapIntensity:kind==="metal"?1.4:1});
    if(opts.emissive){m.emissive=new THREE.Color(opts.emissive);m.emissiveIntensity=opts.emissiveIntensity||0.5}
    // rim darkening: a view-dependent edge tone that firms up every silhouette without an outline pass
    const rim=opts.rim!=null?opts.rim:K.rim;if(rim>0){m.defines=Object.assign(m.defines||{},{FIG_RIM:rim.toFixed(2)});
      m.onBeforeCompile=figRim}}
  m.userData.fig=kind;return m};
function figRim(shader){shader.fragmentShader=shader.fragmentShader.replace("#include <dithering_fragment>","#include <dithering_fragment>\n{float figRim=pow(1.0-saturate(dot(normalize(vNormal),normalize(vViewPosition))),2.6);gl_FragColor.rgb*=1.0-FIG_RIM*figRim;}")}
// the lockup: a hex-socket mark, "assembly", and "by assembl"
const LOCKUP=`<span class="as-word"><svg class="as-mark" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.8 21 7v10l-9 5.2L3 17V7z" fill="var(--as-sun)" stroke="var(--as-ink)" stroke-width="2" stroke-linejoin="round"/><path d="M12 8.2 15.3 10.1v3.8L12 15.8 8.7 13.9v-3.8z" fill="var(--as-ink)"/></svg>assembly</span><span class="as-by">by assembl</span>`;
// for machines with their own shell: StudyKit.companion(el) puts Allen in el; call .react(true|false) after a check (log the pass first)
function companion(el){return allenCorner(null,{steps:[]},el||document.body)}
window.StudyKit={mount,glyph,accentFor,subject:id=>MSUB[id]||"science",icons:ICO,esc,daysUntil,sfx,tone,burst,allen:ALLEN,lockup:LOCKUP,readLog,companion,kupuItem,teAka:TEAKA,figMat};
})();
