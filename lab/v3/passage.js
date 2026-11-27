const passage=document.querySelector('.passage');
const surfaces=[...passage.querySelectorAll('.surface')];
const media=matchMedia('(prefers-reduced-motion:reduce)');
const harbour='https://assembl-waitemata-tides.pages.dev/';
const toggle=document.querySelector('#still-plate'),link=document.querySelector('#open-plate');
let paused=media.matches,handle=0,active=-1,frame,waihekeApi=null,timeout;

function teardown(){
 clearTimeout(timeout);
 frame?.remove();frame=null;
 if(waihekeApi){try{waihekeApi.dispose()}catch(_){} waihekeApi=null;}
 surfaces.forEach(x=>x.classList.remove('ready'));
}

function paint(){
 handle=0;
 const rect=passage.getBoundingClientRect(),extent=rect.height-passage.firstElementChild.offsetHeight;
 const progress=Math.max(0,Math.min(1,-rect.top/Math.max(1,extent)));
 const blend=media.matches?Number(progress>=.5):Math.max(0,Math.min(1,(progress-.29)/.36));
 passage.style.setProperty('--wipe',((1-blend*blend*(3-2*blend))*100)+'%');
 const index=progress<.49?0:1;
 document.querySelector('#plate-kicker').textContent=index?'Waitematā Harbour':'Architectural film / Waiheke';
 document.querySelector('#plate-title').textContent=index?(surfaces[1].classList.contains('ready')?'Drag the boat.':'At water level.'):'Catch the light.';
 link.textContent=index?'Explore the tide ↗':'Open full-screen 3D ↗';
 link.href=index?harbour:'/waiheke-hero/';
 const visible=rect.top<innerHeight*.93&&rect.bottom>0&&!document.hidden;
 const next=visible&&!paused&&!navigator.connection?.saveData?index:-1;
 if(active!==next){
   teardown();active=next;
   if(next===0){
    import('/waiheke-hero/waiheke-hero.js?v=waiheke-3d').then(({mountWaihekeHero})=>{
     if(active!==0)return;
     waihekeApi=mountWaihekeHero(surfaces[0]);
     if(waihekeApi)surfaces[0].classList.add('ready');
    }).catch(err=>console.warn('Waiheke 3D hero load:',err));
   }else if(next===1){
    const item=document.createElement('iframe');frame=item;
    item.tabIndex=0;item.title='Waitematā Harbour. Drag the boat, or focus it and use the arrow keys.';
    item.src=harbour+'?view=harbour&plate=1';
    surfaces[1].append(item);
    timeout=setTimeout(()=>{if(frame===item&&!surfaces[1].classList.contains('ready')){item.remove();frame=null}},35000);
   }
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

// Crisp interactive live-preview modal for "Work you can open"
const pvModal=document.getElementById('tool-preview-modal');
const pvFrame=document.getElementById('preview-frame');
const pvTitle=document.getElementById('preview-modal-title');
const pvFull=document.getElementById('preview-open-full');
const pvClose=document.getElementById('preview-close');
function closePreview(){if(!pvModal)return;pvModal.hidden=true;if(pvFrame)pvFrame.src='about:blank';document.body.style.overflow='';}
if(pvModal){
 document.querySelectorAll('.tool-preview-btn[data-preview-url]').forEach(btn=>{
  btn.addEventListener('click',()=>{
   const url=btn.dataset.previewUrl;
   if(pvTitle)pvTitle.textContent=btn.dataset.previewTitle||'Interactive preview';
   if(pvFull)pvFull.href=url;
   if(pvFrame)pvFrame.src=url;
   pvModal.hidden=false;
   document.body.style.overflow='hidden';
  });
 });
 pvClose?.addEventListener('click',closePreview);
 pvModal.addEventListener('click',e=>{if(e.target===pvModal)closePreview();});
 addEventListener('keydown',e=>{if(e.key==='Escape'&&!pvModal.hidden)closePreview();});
}
