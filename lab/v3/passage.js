const passage=document.querySelector('.passage');
const surfaces=[...passage.querySelectorAll('.surface')];
const media=matchMedia('(prefers-reduced-motion:reduce)');
const harbour=location.hostname.endsWith('.assembl-lab.pages.dev')?'https://coastal-light-review.assembl-waitemata-tides.pages.dev/':'https://assembl-waitemata-tides.pages.dev/';
const toggle=document.querySelector('#still-plate'),link=document.querySelector('#open-plate');
let paused=media.matches,handle=0,active=-1,frame,shot,timeout;
function paint(){
 handle=0;
 const rect=passage.getBoundingClientRect(),extent=rect.height-passage.firstElementChild.offsetHeight;
 const progress=Math.max(0,Math.min(1,-rect.top/Math.max(1,extent)));
 const blend=media.matches?Number(progress>=.5):Math.max(0,Math.min(1,(progress-.29)/.36));
 passage.style.setProperty('--wipe',((1-blend*blend*(3-2*blend))*100)+'%');
 const index=progress<.49?0:1;
 document.querySelector('#plate-kicker').textContent=index?'16A plan study / 16D':'Waitematā Harbour';
 document.querySelector('#plate-title').textContent=index?'Across the roofline.':'At water level.';
 link.textContent=index?'Explore roof solar ↗':'Explore the tide ↗';link.href=index?'/roof-solar/':harbour;
 const visible=rect.top<innerHeight*.93&&rect.bottom>0&&!document.hidden;
 const next=visible&&!paused&&!navigator.connection?.saveData?index:-1;
 if(active!==next){
   clearTimeout(timeout);
   frame?.remove();frame=null;surfaces.forEach(x=>x.classList.remove('ready'));active=next;shot=null;
   if(next>=0){
    const item=document.createElement('iframe');frame=item;
    item.inert=true;item.tabIndex=-1;item.setAttribute('aria-hidden','true');item.title=next?'Modelled solar roof':'Illustrative harbour water';
    item.src=next?'/roof-solar/?view=plate':harbour+'?view=harbour&plate=1';
    surfaces[next].append(item);
    timeout=setTimeout(()=>{if(frame===item&&!surfaces[next].classList.contains('ready')){item.remove();frame=null}},35000);
   }
 }
 if(active===1&&frame&&surfaces[1].classList.contains('ready')){
  const view=progress>.83?'home':'detail';
  if(view!==shot){frame.contentWindow.postMessage({type:'assembl:roof-shot',view},location.origin);shot=view}
 }
}
function request(){if(!handle)handle=requestAnimationFrame(paint)}
addEventListener('message',event=>{
 if(!frame||event.source!==frame.contentWindow||event.origin!==new URL(frame.src).origin||event.data?.type!=='assembl:plate-ready')return;
 clearTimeout(timeout);surfaces[active].classList.add('ready');request();
});
function label(){toggle.hidden=false;toggle.textContent=paused?'Play motion':'Pause motion';toggle.setAttribute('aria-pressed',String(paused))}
toggle.onclick=()=>{paused=!paused;label();request()};
media.addEventListener('change',()=>{paused=media.matches;label();request()});
addEventListener('scroll',request,{passive:true});addEventListener('resize',request);document.addEventListener('visibilitychange',request);label();request();
