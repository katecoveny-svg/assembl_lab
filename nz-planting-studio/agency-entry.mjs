const studio = window.__nzStudio;
const referrer = document.referrer && new URL(document.referrer).origin;
const parentOrigin = referrer || location.origin;
const bed = studio.engine.beds[0];
const centre = bed.points.reduce((sum, p) => ({x: sum.x + p.x, z: sum.z + p.z}), {x: 0, z: 0});
const x = centre.x / bed.points.length, z = centre.z / bed.points.length;
const compact = innerWidth < 640;
const gy = studio.terrainEngine.getHeight(-5.5,-10.2);
studio.setSunHour(9.65);
studio.setCamera(compact ? -12 : -11.35, gy + (compact ? 3.00 : 2.50), compact ? 6 : 3.70, compact ? -1.70 : -5.25, gy + (compact ? 1.64 : 1.43), compact ? -9.8 : -9.45);
studio.setTool('paint-mix');
studio.controls.enableZoom = false;
studio.controls.enableRotate = true;
studio.controls.minPolarAngle = .72;
studio.controls.maxPolarAngle = Math.PI * .481;
studio.controls.enablePan = false;
const canvas = document.querySelector('#canvas-wrap canvas');
canvas.tabIndex = 0;
canvas.setAttribute('aria-label','Paint the garden. Drag across the ground, or press Enter to plant near the centre.');
const send = (type, extra = {}) => parent.postMessage({studio: 'assembl-planting', type, ...extra}, parentOrigin);
let keyboardStroke = 0;
function plant() {
  studio.setTool('paint-mix');
  const candidates=[];
  for(const row of [.9,.78,.68,.55])for(const col of [.24,.72,.46,.12,.88]){
    const p=studio.exposedSoil(innerWidth*col,innerHeight*row);
    if(p)candidates.push(p);
  }
  if(!candidates.length)candidates.push({x,z:z+2});
  // Repeated keyboard strokes start on the least crowded visible ground.
  const nearby=p=>studio.engine.plants.reduce((n,k)=>n+(Math.hypot(k.x-p.x,k.z-p.z)<1.6?1:0),0);
  candidates.sort((a,b)=>nearby(a)-nearby(b));
  const p=candidates[keyboardStroke++%Math.min(2,candidates.length)];
  studio.paintAt(p.x,p.z);
}
// Dragging the building turns the view; painting begins only on exposed ground.
canvas.addEventListener('pointerdown', e => {
  if (e.isPrimary && e.button === 0) studio.setTool(studio.hitsBuilding(e.clientX,e.clientY) ? 'orbit' : 'paint-mix');
}, {capture:true});
window.addEventListener('pointerup', () => studio.setTool('paint-mix'));
canvas.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); plant(); }
});
canvas.addEventListener('wheel', e => e.stopImmediatePropagation(), {capture:true, passive:true});
window.addEventListener('message', e => {
  if (e.source !== parent || e.origin !== parentOrigin || e.data?.studio !== 'assembl-planting') return;
  if (e.data.type === 'visibility') { document.documentElement.toggleAttribute('data-garden-idle', !e.data.visible); return; }
  if (e.data.type === 'mix') {
    const choice = {coast:0, fern:1, flowers:4}[e.data.value];
    if (choice !== undefined) document.querySelectorAll('#cards-rail .card')[choice]?.click();
  }
  if (e.data.type === 'season') {
    const month = {summer:11.4, autumn:3.4, winter:6.4, spring:9.4}[e.data.value];
    if (month !== undefined) {
      const range = document.querySelector('#season-slider'); range.value = month;
      range.dispatchEvent(new Event('input', {bubbles:true}));
    }
  }
  if (e.data.type === 'year' && ['1','4','7','12'].includes(e.data.value)) {
    document.querySelector('.yr-btn[data-year="'+e.data.value+'"]')?.click();
  }
  if (e.data.type === 'undo') document.querySelector('#btn-undo')?.click();
  if (e.data.type === 'plant') plant();
});
try {
  await studio.present();
  send('ready');
  const total = document.querySelector('#bom-total');
  if (total) {
    const publish = () => send('estimate', {total:total.textContent.trim()});
    new MutationObserver(publish).observe(total,{subtree:true,childList:true,characterData:true});
    publish();
  }
} catch { send('unavailable'); }
