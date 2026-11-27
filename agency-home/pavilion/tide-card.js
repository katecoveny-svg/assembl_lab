export function tideCard(asset){
 const byId=id=>document.getElementById(id);
 let days=JSON.parse(byId('tide-data').textContent),keys=Object.keys(days);
 const host=byId('water-host'),slider=byId('tide-event'),open=byId('water-open');
 const tool='https://assembl-waitemata-tides.pages.dev/';
 let day=1,index=0,visible=false,scene=null,pending=null,selectedHeight=0,manual=false;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let paused=reduced.matches;
 const forced=new URLSearchParams(location.search).get('renderer')==='still';
 function destination(){
  const url=new URL(tool);url.searchParams.set('date',keys[day]);url.searchParams.set('event',String(index));return url.href;
 }
 function fallback(message){
  host.dataset.renderer='still';host.dataset.interactive='false';byId('water-fallback').hidden=false;
  byId('water-fallback').textContent=message;open.hidden=forced;open.textContent='Load water';
 }
 function mount(){
  if(!visible||document.hidden){scene?.setActive(false);return}
  if(scene){scene.setActive(true);return}
  if(forced||(!manual&&navigator.connection?.saveData)){fallback('Published tide heights below');return}
  if(pending)return;
  pending=import('./harbour.js?v=36c9e5002d').then(m=>m.createHarbour(host)).then(water=>{
   scene=water;scene.setHeight(selectedHeight);scene.pause(paused);scene.setActive(visible&&!document.hidden);
   host.dataset.renderer='procedural';host.dataset.interactive='true';byId('water-fallback').hidden=true;
   open.hidden=false;open.textContent=paused?'Resume waves':'Pause waves';
   open.setAttribute('aria-pressed',String(paused));
  }).catch(()=>fallback('3D unavailable · published heights below')).finally(()=>{pending=null});
 }
 host.addEventListener('waterlost',()=>{scene=null;host.replaceChildren();fallback('3D interrupted · published heights below')});
 reduced.addEventListener('change',e=>{paused=e.matches;scene?.pause(paused);if(scene)open.textContent=paused?'Resume waves':'Pause waves'});
 function showSelection(){byId('tide-link').href=destination();scene?.setHeight(selectedHeight)}
 open.onclick=()=>{if(!scene){manual=true;mount();return}paused=!paused;scene.pause(paused);open.textContent=paused?'Resume waves':'Pause waves';open.setAttribute('aria-pressed',String(paused))};
 function setEvent(i){
  index=Math.max(0,Math.min(i,days[keys[day]].length-1));const [time,height,,zone,kind]=days[keys[day]][index];
  selectedHeight=Number(height);
  const staff=document.querySelector('.water-idle');staff.style.setProperty('--level',Math.min(95,Math.max(4,selectedHeight/4.5*100))+'%');staff.dataset.height=height+' m';const label=kind+' tide · '+time+' '+zone+' · '+height+' m';
  byId('gauge').textContent=kind+' tide · '+height+' m';byId('water-reading').textContent=label;slider.value=String(index);slider.setAttribute('aria-valuetext',label);
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
   else if(target===today){
    const clock=new Intl.DateTimeFormat('en-GB',{timeZone:'Pacific/Auckland',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date());
    const upcoming=days[today].findIndex(e=>e[0]>=clock);
    if(upcoming>=0)setEvent(upcoming);
    else if(day<keys.length-1){day++;renderDay();}
   }
   byId('tide-range').textContent='Published predictions · 2025–2029';
  }catch{/* The three embedded dates remain available. */}
 }
 function checkVisible(){
  const rect=host.getBoundingClientRect(),inView=rect.height>0&&rect.bottom>0&&rect.top<innerHeight;
  if(inView===visible)return;
  visible=inView;
  if(visible){loadPublishedDays();mount()}
  else{scene?.setActive(false)}
 }
 new IntersectionObserver(checkVisible).observe(host);
 addEventListener('scroll',checkVisible,{passive:true});
 addEventListener('resize',checkVisible,{passive:true});
 addEventListener('pageshow',checkVisible);
 requestAnimationFrame(checkVisible);
 document.addEventListener('visibilitychange',mount);
 window.tideStudyStatus=()=>({date:keys[day],index,height:selectedHeight,visible,renderer:host.dataset.renderer||'poster',water:scene?.state()})
}
