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
let frame,visible=false,linger,watchdog,failed=false;
function clearFrame(){
 clearTimeout(watchdog);frame?.remove();frame=null;host.classList.remove('city-ready');replay.hidden=true;
}
function mount(){
 if(!visible||document.hidden||frame||failed)return;
 if(new URLSearchParams(location.search).get('renderer')==='still'||navigator.connection?.saveData){
  status.textContent='City preview · open Auckland Live for transport updates.';return;
 }
 frame=document.createElement('iframe');frame.title='Interactive Auckland Live city and vehicle positions';frame.src='/pavilion/city-view.html?v=e9d8968160';
 host.append(frame);status.textContent='Loading the Auckland waterfront…';
 watchdog=setTimeout(()=>{if(!host.classList.contains('city-ready')){failed=true;clearFrame();status.textContent='The city is taking longer to load. Open Auckland Live below.'}},45000);
}
new IntersectionObserver(([entry])=>{
 visible=entry.isIntersecting;clearTimeout(linger);
 if(visible)mount();else linger=setTimeout(()=>{if(!visible)clearFrame()},800);
}).observe(host);
document.addEventListener('visibilitychange',()=>{if(document.hidden)clearFrame();else mount()});
function showSelection(v){

 status.textContent='Route '+v.route+' · last reported '+new Date(v.ts*1000).toLocaleTimeString('en-NZ',{timeZone:'Pacific/Auckland'});
 const url=new URL(fullCity);url.searchParams.set('vehicle',v.id);trip.href=url;trip.textContent='Follow route '+v.route+' in Auckland Live ↗';
}
addEventListener('message',e=>{
 if(e.origin!==location.origin||!frame||e.source!==frame.contentWindow)return;
 const m=e.data;
 if(m?.city==='ready'){clearTimeout(watchdog);host.classList.add('city-ready');replay.hidden=false;if(status.textContent.startsWith('Loading'))status.textContent='Checking Auckland Transport reports…'}
 if(m?.city==='updates'||m?.city==='unavailable'){
  if(m.selected){showSelection(m.selected);return}
  trip.href=fullCity;trip.textContent='Open Auckland Live ↗';
  status.textContent=m.city==='unavailable'?'Vehicle feed unavailable':m.count?m.count+' recent vehicles · latest report '+new Date(m.ts*1000).toLocaleTimeString('en-NZ',{timeZone:'Pacific/Auckland'}):'No recent vehicle reports';
 }
 if(m?.city==='selection')showSelection(m.selected);
 if(m?.city==='failed'){failed=true;clearFrame();status.textContent='3D unavailable here. Open Auckland Live for the transport list.';trip.href=fullCity.replace('view=3d','view=list')}
});
replay.onclick=()=>frame?.contentWindow.postMessage({city:'replay'},location.origin);

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
const bed=document.querySelector('#bed-stage'),startBed=document.querySelector('#start-bed'),closeBed=document.querySelector('#close-bed'),bedInfo=document.querySelector('#bed-info');
let bedFrame=null;
startBed.onclick=()=>{
 if(bedFrame)return;
 bedFrame=document.createElement('iframe');
 bedFrame.title='Paint the Aotearoa planting bed';bedFrame.src='https://lab.assembl.co.nz/nz-planting-studio/classic?view=bed&entry=paint';
 bedFrame.addEventListener('load',()=>{bedInfo.textContent='Planting Studio · use Paint to brush the soil'});
 bed.append(bedFrame);startBed.hidden=true;startBed.setAttribute('aria-expanded','true');closeBed.hidden=false;bedInfo.textContent='Opening the planting bed…';
};
closeBed.onclick=()=>{bedFrame?.remove();bedFrame=null;startBed.hidden=false;startBed.setAttribute('aria-expanded','false');closeBed.hidden=true;bedInfo.textContent='Interactive planting bed';startBed.focus({preventScroll:true})};
