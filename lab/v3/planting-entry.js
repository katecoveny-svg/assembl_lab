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
