export function tideCard(asset){
 const byId=id=>document.getElementById(id);
 let days=JSON.parse(byId('tide-data').textContent),keys=Object.keys(days);
 const host=byId('water-host'),slider=byId('tide-event'),open=byId('water-open'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const tool='https://assembl-waitemata-tides.pages.dev/';
 let day=1,index=0,visible=false,frame=null,renderTimer=0,explicit=false,showStill=false,selectedHeight=0;
 function destination(embed){
  const url=new URL(tool);if(embed)url.searchParams.set('view','harbour');
  url.searchParams.set('date',keys[day]);url.searchParams.set('event',String(index));
  return url.href;
 }
 function conservative(){
  return reduced.matches||navigator.connection?.saveData||['2g','3g','slow-2g'].includes(navigator.connection?.effectiveType)
   ||!(navigator.gpu||window.WebGL2RenderingContext);
 }
 function inputMode(){
  const live=!!frame&&!showStill;
  host.dataset.interactive=String(live);
  open.setAttribute('aria-pressed',String(live));
  open.textContent=live?'Show still':'Load water';
  if(frame){frame.inert=false;frame.tabIndex=0}

 }
 function mount(){
  if(!visible||document.hidden)return;inputMode();
  if(new URLSearchParams(location.search).get('renderer')==='still'){
   host.dataset.renderer='still';byId('water-fallback').hidden=false;return;
  }
  open.hidden=false;
  if(showStill||!explicit&&conservative()){
   frame?.remove();frame=null;delete host.dataset.renderer;inputMode();return;
  }
  const src=destination(true);
  if(frame?.src===src)return;
  if(!frame){
   frame=document.createElement('iframe');frame.title='Waitematā Harbour water and published Auckland tide prediction';
   frame.referrerPolicy='strict-origin-when-cross-origin';frame.loading='lazy';
   frame.addEventListener('load',()=>{if(frame)host.dataset.renderer='harbour'});
   inputMode();host.append(frame);
  }
  frame.src=src;
 }
 function showSelection(){
  byId('tide-link').href=destination(false);
  clearTimeout(renderTimer);if(visible)renderTimer=setTimeout(mount,140);
 }
 open.onclick=()=>{showStill=!!frame;explicit=!showStill;mount()};
 function setEvent(i){
  index=Math.max(0,Math.min(i,days[keys[day]].length-1));const [time,height,,zone,kind]=days[keys[day]][index];
  selectedHeight=Number(height);const label=kind+' tide · '+time+' '+zone+' · '+height+' m';
  byId('water-reading').textContent=label;slider.value=String(index);slider.setAttribute('aria-valuetext',label);
  showSelection();byId('tide-stops').querySelectorAll('button').forEach((b,j)=>b.setAttribute('aria-pressed',String(index===j)));
  const detail=byId('tide-date').textContent+' · '+label;byId('tides-context').textContent=detail;
  byId('brief-tides').querySelector('a[href^="mailto"]').href='mailto:assembl@assembl.co.nz?subject='+encodeURIComponent('A project like Waitematā Tides')+'&body='+encodeURIComponent('I was looking at the Auckland station 070 prediction for '+detail+'.')
 }
 function renderDay(){
  const date=keys[day],events=days[date];byId('tide-date').textContent=new Intl.DateTimeFormat('en-NZ',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));
  byId('prev-date').disabled=day===0;byId('next-date').disabled=day===keys.length-1;byId('tide-link').href='https://assembl-waitemata-tides.pages.dev/?date='+date;
  byId('tide-table').innerHTML=events.map(([clock,height,,zone,kind])=>'<tr><td>'+kind+'</td><td>'+clock+' '+zone+'</td><td>'+height+' m</td></tr>').join('');
  slider.max=String(events.length-1);byId('tide-stops').replaceChildren(...events.map(([clock,height,,zone,kind],i)=>{const b=document.createElement('button');b.textContent=clock;b.setAttribute('aria-label',kind+' tide, '+clock+' '+zone+', '+height+' metres');b.onclick=()=>setEvent(i);return b}));setEvent(0)
 }
 slider.oninput=()=>setEvent(Number(slider.value));byId('prev-date').onclick=()=>{if(day>0){day--;renderDay()}};byId('next-date').onclick=()=>{if(day<keys.length-1){day++;renderDay()}};
 byId('date-controls').hidden=byId('event-controls').hidden=false;renderDay();
 let dataStarted=false;
 async function loadPublishedDays(){
  if(dataStarted||location.protocol==='file:')return;
  dataStarted=true;
  const initial=keys[day],eventBefore=index;
  try{
   // Use the same published file as the harbour. Preserve the dated snapshot offline.
   const response=await fetch(new URL('data/events.json',tool));
   if(!response.ok)return;
   const published=await response.json();
   if(!Object.hasOwn(published,initial))return;
   const selected=keys[day],selectionChanged=selected!==initial||eventBefore!==index;
   const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Pacific/Auckland',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
   days=published;keys=Object.keys(days).sort();
   const target=selectionChanged?selected:Object.hasOwn(days,today)?today:initial;
   const previousIndex=index;day=keys.indexOf(target);renderDay();
   if(selectionChanged)setEvent(previousIndex);
   byId('tide-range').textContent='Published predictions · 2025–2029';
  }catch{/* The three embedded dates remain available. */}
 }
 function checkVisible(){
  const rect=host.getBoundingClientRect(),inView=rect.height>0&&rect.bottom>0&&rect.top<innerHeight;
  if(inView===visible)return;
  visible=inView;
  if(visible){loadPublishedDays();mount()}
  else{clearTimeout(renderTimer);frame?.remove();frame=null;explicit=false;inputMode();delete host.dataset.renderer}
 }
 new IntersectionObserver(checkVisible).observe(host);
 addEventListener('scroll',checkVisible,{passive:true});
 addEventListener('resize',checkVisible,{passive:true});
 addEventListener('pageshow',checkVisible);
 requestAnimationFrame(checkVisible);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&visible)mount()});
 window.tideStudyStatus=()=>({date:keys[day],index,height:selectedHeight,visible,renderer:host.dataset.renderer||'poster',frame:frame?.src})
}
