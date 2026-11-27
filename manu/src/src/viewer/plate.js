// Inlined by the static page generator; the renderer is fetched after first paint.
const data = BIRD_DATA;
const plate = document.querySelector('.atlas');
const el = name => plate.querySelector('#plate-' + name);
const tabs = [...plate.querySelectorAll('[role=tab]')];
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let viewer, active='tui', generation=0, paused=reduced.matches;
const status = text => {el('status').textContent=text;};
const toggle = (name,on) => el(name).setAttribute('aria-pressed',String(on));
function update(id, moveFocus=false) {
  const b=data[id]; if(!b)return;
  active=id; const ticket=++generation;
  tabs.forEach(t=>{const chosen=t.dataset.bird===id;t.setAttribute('aria-selected',chosen);t.tabIndex=chosen?0:-1;if(chosen&&moveFocus)t.focus();});
  el('stage').setAttribute('aria-label',b.name+' specimen. Drag to rotate, pinch or use plus and minus to zoom. Arrow keys turn. Zero resets.');
  const idx=tabs.findIndex(t=>t.dataset.bird===id);
  el('count').textContent='Plate '+String(idx+1).padStart(2,'0')+' / 08';
  plate.querySelector('h1').textContent=b.name;
  for(const [field,value] of Object.entries({latin:b.latin,family:b.family,desc:b.description,length:b.length,weight:b.weight,cue:b.cue,habitat:b.habitat}))el(field).textContent=value;
  el('weight').parentElement.hidden=!b.weight;
  if(!viewer && el('shared').disabled)status('Still specimen · species notes and quiz available');
  el('image').src='/manu/stills/'+id+'-1200.webp';el('image').alt='Perched '+b.name+' specimen';
  el('lesson').href='/manu/'+id+'/';el('source').href=b.source;
  toggle('detail',false);
  if(!viewer)return;
  plate.removeAttribute('data-ready');status('Preparing '+b.name+'…');
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    if(ticket!==generation)return;
    try {
      viewer.select(id);plate.dataset.ready='';
      status('Drag to turn · pinch or use + to zoom');
      if(!reduced.matches)plate.querySelector('.info-text').animate([{opacity:.45,transform:'translateY(4px)'},{opacity:1,transform:'none'}],{duration:260,easing:'ease-out'});
    } catch(error) {console.warn('Manu specimen:',error);still();}
  }));
}
function still() {
  viewer=null;plate.removeAttribute('data-ready');status('Still specimen · species notes and quiz available');
  for(const id of ['pause','light','detail','plus','minus','left','right','turn','reset','shared'])el(id).disabled=true;
}
for(const [index,tab] of tabs.entries()){
  tab.onclick=e=>{if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();update(tab.dataset.bird);};
  tab.onkeydown=e=>{let next=index;if(e.key==='ArrowRight')next++;else if(e.key==='ArrowLeft')next--;else if(e.key==='Home')next=0;else if(e.key==='End')next=tabs.length-1;else return;e.preventDefault();update(tabs[(next+tabs.length)%tabs.length].dataset.bird,true);};
}
el('expand').onclick=()=>{const focused=plate.toggleAttribute('data-focus');toggle('expand',focused);el('expand').setAttribute('aria-label',focused?'Exit expanded view':'Expand specimen');};
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&plate.hasAttribute('data-focus')){el('expand').click();el('expand').focus();}});
el('light').onclick=()=>{const dusk=plate.toggleAttribute('data-dusk');viewer?.dusk(dusk);toggle('light',dusk);};
el('pause').onclick=()=>{paused=!paused;viewer?.pause(paused);toggle('pause',paused);el('pause').setAttribute('aria-label',paused?'Resume bird movement':'Pause bird movement');};
toggle('pause',paused);
el('shared').onchange=()=>{viewer?.scale(el('shared').checked);toggle('detail',false);};
el('detail').onclick=()=>toggle('detail',viewer?.detail()||false);
for(const [id,factor] of [['plus',1.35],['minus',1/1.35]])el(id).onclick=()=>viewer?.zoom(factor);
for(const [id,n] of [['left',-Math.PI/2],['right',Math.PI/2],['turn',Math.PI*2]])el(id).onclick=()=>viewer?.turn(n);
el('reset').onclick=()=>{viewer?.reset();toggle('detail',false);};
const initial=new URLSearchParams(location.search).get('bird');update(data[initial]?initial:'tui');
async function start() {
  if(new URLSearchParams(location.search).get('renderer')==='still'||navigator.connection?.saveData){still();return;}
  try{
    const {openPlate}=await import(ATLAS_MODULE);
    viewer=await openPlate(el('stage').querySelector('canvas'),plate.querySelector('.scale-mark i'), value => toggle('detail',value));
    viewer.pause(paused);update(active);
    Object.defineProperty(plate,'specimenState',{get:()=>viewer?.state});
    el('stage').querySelector('canvas').addEventListener('webglcontextlost',still,{once:true});
  }catch(error){console.warn('Manu renderer:',error);still();}
}
requestAnimationFrame(()=>requestAnimationFrame(start));
