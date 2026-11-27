// The agency and Lab use one editor, hosted by Planting Studio.
const stage = document.querySelector('[data-planting-stage]');
const source = new URL(stage.dataset.plantingStage, location.href);
if(new URLSearchParams(location.search).get('renderer')==='webgl')source.searchParams.set('renderer','webgl');
const controls = document.querySelector('[data-planting-controls]');
const retry = document.querySelector('[data-open-planting]');
const status = document.querySelector('[data-planting-status]');
let frame, timeout, visible = false, tried = false;
const send = (type, extra = {}) => frame?.contentWindow?.postMessage({studio:'assembl-planting', type, ...extra}, source.origin);
function recover() {
  clearTimeout(timeout); frame?.remove(); frame = null; delete stage.dataset.ready;
  controls.hidden = true; retry.hidden = false; status.textContent = 'Garden preview';
}
function mount() {
  if (frame || !visible || document.hidden) return;
  tried = true; retry.hidden = true;
  frame = document.createElement('iframe');
  frame.title = 'Paint the coastal garden in Architecture OS';
  frame.referrerPolicy = 'origin'; frame.src = source.href;
  frame.addEventListener('error', recover, {once:true});
  stage.append(frame); status.textContent = 'Opening the garden…';
  timeout = setTimeout(recover, 45000);
}
function consider() {
  const limited = navigator.connection?.saveData || matchMedia('(prefers-reduced-data: reduce)').matches || new URLSearchParams(location.search).get('renderer') === 'still';
  if (visible && !tried && !limited) mount();
  if(limited && !tried)retry.hidden=false;
  if(stage.dataset.ready)send('visibility', {visible: visible && !document.hidden});
}
new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; consider(); }).observe(stage);
document.addEventListener('visibilitychange', consider);
retry.onclick = () => { stage.scrollIntoView({block:'start',behavior:'instant'}); visible=true; mount(); };
window.addEventListener('message', e => {
  if (!frame || e.source !== frame.contentWindow || e.origin !== source.origin || e.data?.studio !== 'assembl-planting') return;
  if(e.data.type === 'unavailable'){recover();return;}
  if(e.data.type === 'patch' && Number.isInteger(e.data.added) && e.data.added>=0){
    const count=e.data.added;
    status.textContent=count ? count+(count===1?' plant added.':' plants added.') : 'No plants fitted here. Brush another patch or undo.';
    return;
  }
  if(e.data.type === 'undo-result'){
    status.textContent=e.data.changed?'Last planting change undone.':'No planting changes to undo.';
    return;
  }
  if(e.data.type === 'estimate'){
    const out = controls.querySelector('[data-supply-estimate]');
    if(out && typeof e.data.total === 'string' && /^\$[\d,.]+$/.test(e.data.total)){
      out.textContent = 'Supply estimate '+e.data.total+' NZD incl. GST'; out.hidden = false;
    }
    return;
  }
  if(e.data.type !== 'ready')return;
  clearTimeout(timeout); stage.dataset.ready = 'true'; controls.hidden = false;
  status.textContent = 'Brush across the soil to plant.'; consider();
});
controls.addEventListener('change', e => { if (e.target.matches('select')) send(e.target.name, {value:e.target.value}); });
controls.addEventListener('click', e => { const action = e.target.closest('button')?.dataset.gardenAction; if (action) send(action); });

// Keep the edit in this tab. The fragment contains only the public bed's plant
// placements, season, age and catalogue total; HTTP requests omit fragments.
const full=stage.closest('section')?.querySelector('.planting-rail a[href*="/architecture/#/planting"]');
if(full){
  let waiting=0,original=full.textContent, plainNext=false;
  const recoverBed=()=>{
    clearTimeout(waiting);waiting=0;plainNext=true;
    full.textContent='Open original studio';
    status.textContent='Could not carry this planting across. Your edits are still here.';
    full.removeAttribute('aria-busy');
  };
  full.addEventListener('click',event=>{
    if(!frame||!stage.dataset.ready||plainNext||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    event.preventDefault();if(waiting)return;
    full.setAttribute('aria-busy','true');full.textContent='Opening your planting…';
    waiting=setTimeout(recoverBed,4500);send('continue-bed');
  });
  addEventListener('pageshow',()=>{
    clearTimeout(waiting);waiting=0;plainNext=false;full.removeAttribute('aria-busy');full.textContent=original;
  });
  addEventListener('message',event=>{
    if(!waiting||event.source!==frame?.contentWindow||event.origin!==source.origin||event.data?.studio!=='assembl-planting')return;
    if(event.data.type==='bed-unavailable'){recoverBed();return;}
    if(event.data.type!=='continue-bed')return;
    const payload=event.data.payload;
    if(typeof payload!=='string'||payload.length>230000||!/^b1\.[a-zA-Z0-9_.~-]+$/.test(payload)){recoverBed();return;}
    const target=new URL(full.href);
    target.hash='/planting/bed/'+payload;
    clearTimeout(waiting);waiting=0;full.textContent=original;full.removeAttribute('aria-busy');
    location.assign(target.href);
  });
}
