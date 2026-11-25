export function tideCard(asset){
 const byId=id=>document.getElementById(id);
 let days=JSON.parse(byId('tide-data').textContent),keys=Object.keys(days);
 const host=byId('water-host'),poster=byId('water-still'),slider=byId('tide-event'),pause=byId('water-pause'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let day=1,index=0,visible=false,attempted=false,scene=null,paused=reduced.matches,selectedHeight=0;
 function fallback(){scene?.setActive(false);scene=null;host.replaceChildren();pause.hidden=true;byId('water-fallback').hidden=false;host.dataset.renderer='still'}
 function pauseLabel(){pause.textContent=paused?'Animate water':'Pause water';pause.setAttribute('aria-pressed',String(paused))}
 function setEvent(i){
  index=Math.max(0,Math.min(i,days[keys[day]].length-1));const [time,height,,zone,kind]=days[keys[day]][index];
  selectedHeight=Number(height);const label=kind+' tide · '+time+' '+zone+' · '+height+' m';
  byId('water-reading').textContent=label;slider.value=String(index);slider.setAttribute('aria-valuetext',label);
  poster.src=asset('tide-'+String(Math.round(10*selectedHeight)).padStart(2,'0')+'.webp');poster.alt='Wharf and tide staff at the predicted '+kind.toLowerCase()+' tide of '+height+' metres.';
  scene?.setHeight(selectedHeight);byId('tide-stops').querySelectorAll('button').forEach((b,j)=>b.setAttribute('aria-pressed',String(index===j)));
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
 pause.onclick=()=>{paused=!paused;scene?.pause(paused);pauseLabel()};
 reduced.addEventListener('change',()=>{paused=reduced.matches;scene?.pause(paused);pauseLabel()});
 async function start(){
  let url;try{
   if(new URLSearchParams(location.search).get('renderer')==='still'){fallback();return}
   const embedded=byId('harbour-module');if(embedded)url=URL.createObjectURL(new Blob([embedded.textContent],{type:'text/javascript'}));
   const {createHarbour}=await import(url||'/pavilion/harbour.js');scene=await createHarbour(host,asset,fallback);scene.pause(paused);scene.setHeight(selectedHeight);scene.setActive(visible);
   host.dataset.renderer='WebGL';pause.hidden=false;pauseLabel();
  }catch(error){console.warn("Harbour renderer unavailable",error);fallback()}finally{if(url)URL.revokeObjectURL(url)}
 }
 let dataStarted=false;
 async function loadPublishedDays(){
  if(dataStarted||location.protocol==='file:')return;
  dataStarted=true;
  const initial=keys[day],eventBefore=index;
  try{
   const response=await fetch(asset('auckland-070.json'));
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
  if(inView!==visible){visible=inView;scene?.setActive(visible)}
  if(visible&&!attempted){attempted=true;loadPublishedDays();start()}
 }
 new IntersectionObserver(checkVisible).observe(host);
 addEventListener('scroll',checkVisible,{passive:true});
 addEventListener('resize',checkVisible,{passive:true});
 addEventListener('pageshow',checkVisible);
 requestAnimationFrame(checkVisible);
 window.tideStudyStatus=()=>({date:keys[day],index,height:selectedHeight,visible,renderer:host.dataset.renderer||'poster',scene:scene?.state()||null})
}
