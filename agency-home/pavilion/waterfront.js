import {subscribeReports} from './vehicle-reports.js?v=00fa4f7d40';
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const heads = document.querySelectorAll('#homes-title,#garden-title,.transport h3,#tides h3,#contact h2');
const reveals = new IntersectionObserver(entries=>{
  for(const entry of entries){
    if(!entry.isIntersecting)continue;
    if(!motion.matches)entry.target.animate([
      {clipPath:'inset(0 0 100% 0)',transform:'translateY(.24em)'},
      {clipPath:'inset(-12% 0 -12% 0)',transform:'translateY(0)'}
    ],{duration:760,easing:'cubic-bezier(.18,.72,.24,1)'});
    reveals.unobserve(entry.target);
  }
});
heads.forEach(el=>reveals.observe(el));
const host=document.querySelector('#city-host'), replay=document.querySelector('#ak-fly'),status=document.querySelector('#ak-status'),trip=document.querySelector('#ak-trip');
const fullCity='https://lab.assembl.co.nz/auckland/live/?view=3d';
let frame,visible=false,linger,watchdog,failed=false,stopCityReports,requestedVehicle;
const listCity='https://lab.assembl.co.nz/auckland/live/?view=list';
const entry=document.querySelector('[data-arrival-report]');
const earlyTitle=entry.querySelector('[data-vehicle-title]'),earlyFix=entry.querySelector('[data-vehicle-fix]'),follow=entry.querySelector('[data-vehicle-follow]');
const clockNZ=new Intl.DateTimeFormat('en-NZ',{hour:'numeric',minute:'2-digit',second:'2-digit',timeZone:'Pacific/Auckland'});
let stopEntry,entryVisible=false,displayed;
function earlyReport(report) {
  const rows=report.vehicles;
  // Retain the same vehicle while it is reporting so the link survives a refresh.
  const recent=rows.filter(v=>v.nearby && Date.now()/1000-v.ts<90);
  displayed=rows.find(v=>v.id===displayed?.id) || (recent.length?recent:rows).reduce((best,v)=>!best||v.ts>best.ts?v:best,null);
  if(!displayed){
    earlyTitle.textContent=report.available?'No recent vehicle reports':'Vehicle feed unavailable';
    earlyFix.textContent='Auckland Transport';follow.href=listCity;follow.textContent='Open transport list ↗';return;
  }
  const v=displayed;
  earlyTitle.textContent=v.mode==='ferry'?'Ferry '+v.route:(v.mode==='train'?'Train ':'Bus ')+v.route;
  earlyFix.textContent=(v.nearby?'Near '+v.nearby+' · ':'')+'Reported '+clockNZ.format(v.ts*1000)+' Auckland time';
  const url=new URL(fullCity);url.searchParams.set('vehicle',v.id);
  follow.href=url;follow.textContent='Find this '+v.mode+' in 3D ↓';
}
function entrySubscription(){
  if(entryVisible&&!document.hidden&&!navigator.connection?.saveData){
    if(!stopEntry){
      if(displayed && Date.now()/1000-displayed.ts>=180)earlyReport({vehicles:[],available:true});
      stopEntry=subscribeReports(earlyReport);
    }
  }else if(stopEntry){stopEntry();stopEntry=null;}
}
// An edge touching the viewport counts as intersecting at zero area. Start the
// transport feed only when someone can actually see the report.
new IntersectionObserver(([e])=>{
  entryVisible=e.intersectionRatio>=.01;
  entrySubscription();
},{threshold:.01}).observe(entry);
document.addEventListener('visibilitychange',entrySubscription);
follow.addEventListener('click',event=>{
  if(!displayed||!displayed.ts||Date.now()/1000-displayed.ts>=180||failed||event.defaultPrevented||event.button!==0||
      event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||navigator.connection?.saveData||
      new URLSearchParams(location.search).get('renderer')==='still')return;
  requestedVehicle=displayed.id;event.preventDefault();location.hash='transport';
  if(frame && stopCityReports){frame.contentWindow.postMessage({city:'select',id:requestedVehicle},location.origin);requestedVehicle=null;}
  // Keyboard focus travels to the destination even if it already owns the hash.
  const section=document.querySelector('#transport');section.tabIndex=-1;section.focus({preventScroll:true});
  section.scrollIntoView({block:'start',behavior:'instant'});
});
function clearFrame(){
 stopCityReports?.();stopCityReports=null;
 clearTimeout(watchdog);frame?.remove();frame=null;host.classList.remove('city-ready');replay.hidden=true;for(const b of document.querySelectorAll('.fleet-modes button')){b.disabled=true;b.removeAttribute('aria-pressed');}
}
function mount(){
 if(!visible||document.hidden||frame||failed)return;
 if(new URLSearchParams(location.search).get('renderer')==='still'||navigator.connection?.saveData){
  status.textContent='City preview · open Auckland Live for transport updates.';return;
 }
 frame=document.createElement('iframe');frame.title='Interactive Auckland Live city and vehicle positions';frame.src='/pavilion/city-view.html?v=6842be9928';
 host.append(frame);status.textContent='Loading the Auckland waterfront…';
 watchdog=setTimeout(()=>{if(!host.classList.contains('city-ready')){failed=true;clearFrame();status.textContent='The city is taking longer to load. Open Auckland Live below.'}},45000);
}
new IntersectionObserver(([entry])=>{
 visible=entry.isIntersecting;clearTimeout(linger);
 if(visible)mount();else linger=setTimeout(()=>{if(!visible)clearFrame()},800);
}).observe(host);
document.addEventListener('visibilitychange',()=>{if(document.hidden)clearFrame();else mount()});
function showSelection(v){

 for(const b of document.querySelectorAll('.fleet-modes button'))b.setAttribute('aria-pressed',String(b.dataset.mode===v.mode));
 status.textContent=v.mode[0].toUpperCase()+v.mode.slice(1)+' · route '+v.route+' · reported '+new Date(v.ts*1000).toLocaleTimeString('en-NZ',{timeZone:'Pacific/Auckland'});
 const url=new URL(fullCity);url.searchParams.set('vehicle',v.id);trip.href=url;trip.textContent='Follow route '+v.route+' in Auckland Live ↗';
}
addEventListener('message',e=>{
 if(e.origin!==location.origin||!frame||e.source!==frame.contentWindow)return;
 const m=e.data;
 if(m?.city==='subscribe'){
   stopCityReports?.();stopCityReports=subscribeReports(report=>{
     frame?.contentWindow.postMessage({city:'positions',report,requestedId:requestedVehicle},location.origin);
     requestedVehicle=null;
   },15000);
 }
 if(m?.city==='expired')status.textContent='That vehicle has stopped reporting. Choose another recent report.';
 if(m?.city==='ready'){clearTimeout(watchdog);host.classList.add('city-ready');if(status.textContent.startsWith('Loading'))status.textContent='Checking Auckland Transport reports…'}
 if(m?.city==='updates'||m?.city==='unavailable'){
  if(m.selected){showSelection(m.selected);return}
  trip.href=fullCity;trip.textContent='Open Auckland Live ↗';
  status.textContent=m.city==='unavailable'?'Vehicle feed unavailable':m.count?m.count+' recent vehicles · latest report '+new Date(m.ts*1000).toLocaleTimeString('en-NZ',{timeZone:'Pacific/Auckland'}):'No recent vehicle reports';
 }
 if(m?.city==='modes'){for(const b of document.querySelectorAll('.fleet-modes button'))b.disabled=!m.modes[b.dataset.mode];replay.hidden=!Object.values(m.modes).some(n=>n>0);}
 if(m?.city==='selection')showSelection(m.selected);
 if(m?.city==='failed'){failed=true;clearFrame();status.textContent='3D unavailable here. Open Auckland Live for the transport list.';trip.href=fullCity.replace('view=3d','view=list')}
});
replay.onclick=()=>frame?.contentWindow.postMessage({city:'next'},location.origin);

// Both plates were rendered from one camera. Only the mask moves, so edges stay registered.
const finish=document.querySelector('#finish-view'),full=document.querySelector('#finish-toggle');
let fx=.57,fy=.52;
function placeLens(x,y){
 fx=Math.max(0,Math.min(1,x));fy=Math.max(0,Math.min(1,y));
 finish.style.setProperty('--x',fx*100+'%');finish.style.setProperty('--y',fy*100+'%');
}
function pointLens(e){const r=finish.getBoundingClientRect();placeLens((e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height)}
finish.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'||e.buttons)pointLens(e)});
finish.addEventListener('pointerdown',pointLens);
finish.addEventListener('keydown',e=>{
 const delta={ArrowLeft:[-.06,0],ArrowRight:[.06,0],ArrowUp:[0,-.06],ArrowDown:[0,.06]}[e.key];
 if(delta){e.preventDefault();placeLens(fx+delta[0],fy+delta[1])}
});
full.onclick=()=>{const on=finish.toggleAttribute('data-full');full.setAttribute('aria-pressed',String(on));full.textContent=on?'Return to lens':'Show full render'};

for(const button of document.querySelectorAll('.fleet-modes button'))button.onclick=()=>{
 frame?.contentWindow.postMessage({city:'follow',mode:button.dataset.mode},location.origin);
};

const roof = document.querySelector('.solar-scene'), activate = document.querySelector('#solar-open');
const hour = document.querySelector('#solar-hour'), clock = document.querySelector('#solar-time');
const solarStatus = document.querySelector('#solar-status'), roofOrigin = 'https://lab.assembl.co.nz';
const studyLink=document.querySelector('#roof-study .solar-rail a');
const fullStudy=new URL(studyLink.href);
const validHour=value=>Number.isInteger(value)&&value>=Number(hour.min)&&value<=Number(hour.max);
let chosenHour=history.state?.roofStudyHour;
let solarFrame,solarTimer;
function studyAt(path,h){
  const url=new URL(path);
  if(validHour(h))url.searchParams.set('studyHour',String(h));
  return url;
}
function selectHour(h){
  hour.value=String(h);
  clock.textContent=String(h).padStart(2,'0')+':00';
  studyLink.href=studyAt(fullStudy,h);
}
if(validHour(chosenHour))selectHour(chosenHour);
function releaseRoof(message){
  clearTimeout(solarTimer);solarFrame?.remove();solarFrame=null;delete roof.dataset.ready;
  hour.closest('label').hidden=true;activate.hidden=false;activate.disabled=false;
  activate.textContent='Explore the roof in 3D';solarStatus.textContent=message;
}
activate.onclick=()=>{
  if(solarFrame)return;
  solarFrame=document.createElement('iframe');solarFrame.title='Proposed 16D roof, study the time of day';solarFrame.referrerPolicy='origin';
  solarFrame.src=studyAt(roofOrigin+'/roof-solar/?view=plate',chosenHour);roof.append(solarFrame);
  activate.disabled=true;solarStatus.textContent='Opening the roof model…';
  solarTimer=setTimeout(()=>releaseRoof('The roof viewer took too long. Open Roof Solar for the full study.'),40000);
};
addEventListener('message',e=>{
  if(!solarFrame||e.source!==solarFrame.contentWindow||e.origin!==roofOrigin)return;
  if(e.data?.type==='assembl:plate-ready'){
    clearTimeout(solarTimer);roof.dataset.ready='true';activate.hidden=true;hour.closest('label').hidden=false;
    const h=validHour(chosenHour)?chosenHour:e.data.hour;
    if(validHour(h)){
      selectHour(h);
      if(e.data.hour!==h)solarFrame.contentWindow.postMessage({type:'assembl:solar-hour',hour:h},roofOrigin);
    }
    solarStatus.textContent='16D roof · illustrative sunlight, Auckland region';
  }
});
hour.oninput=()=>{
  const h=Number(hour.value);
  if(!validHour(h))return;
  chosenHour=h;selectHour(h);
  solarFrame?.contentWindow.postMessage({type:'assembl:solar-hour',hour:h},roofOrigin);
};
// Keep the handoff through browser Back without retaining the offscreen renderer.
hour.addEventListener('change',()=>{if(validHour(chosenHour))history.replaceState({...history.state,roofStudyHour:chosenHour},'')});
new IntersectionObserver(([entry])=>{if(!entry.isIntersecting&&solarFrame)releaseRoof('Illustrative panels and modelled sunlight.');},{rootMargin:'40% 0px'}).observe(roof);
