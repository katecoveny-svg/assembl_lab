const studio = window.__nzStudio;
const referrer = document.referrer && new URL(document.referrer).origin;
const parentOrigin = referrer || location.origin;
const bed = studio.engine.beds[0];
const centre = bed.points.reduce((sum, p) => ({x: sum.x + p.x, z: sum.z + p.z}), {x: 0, z: 0});
const x = centre.x / bed.points.length, z = centre.z / bed.points.length;
const compact = innerWidth < 640;
const gy = studio.terrainEngine.getHeight(-5.5,-10.2);
studio.setSunHour(9.65);
// Move through foreground planting to the design view. Input takes the camera immediately.
const endView = compact ? [-12, 3, 6, -1.7, 1.64, -9.8] : [-11.35, 2.5, 3.7, -5.25, 1.43, -9.45];
const midView = compact ? [-10.8, 2.35, 3.9, -4.4, 1.54, -9.8] : [-10.6, 1.94, 2.65, -5.9, 1.51, -9.45];
const startView = compact ? [-9.35, 1.56, 1.9, -6.1, 1.42, -9.2] : [-9.6, 1.25, 1.35, -6.5, 1.37, -9.0];
function place(view) {
  studio.setCamera(view[0], gy + view[1], view[2], view[3], gy + view[4], view[5]);
}
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const agencyHost = /^(www\.)?assembl\.co\.nz$|^[a-z0-9-]+\.assembl-home\.pages\.dev$/.test(new URL(parentOrigin).hostname);
let approaching = agencyHost && !reduced.matches && !navigator.connection?.saveData;
let inView = true, elapsed = 0, previous = 0, frame = 0;
function endApproach() { approaching = false; cancelAnimationFrame(frame); frame = 0; }
function advance(now) {
  frame = 0;
  if (!approaching || !inView || document.hidden) { previous = 0; return; }
  if (previous) elapsed += Math.min(now - previous, 100);
  previous = now;
  const t = Math.min(1, elapsed / 7200);
  const u = t * t * (3 - 2 * t);
  place(startView.map((n, i) => n * (1-u)**2 + 2 * midView[i] * (1-u)*u + endView[i]*u*u));
  if (t < 1) frame=requestAnimationFrame(advance); else endApproach();
}
function resumeApproach() {
  if (approaching && !frame && inView && !document.hidden) { previous=0; frame=requestAnimationFrame(advance); }
}
place(approaching ? startView : endView);
for (const event of ['pointerdown','keydown','wheel']) window.addEventListener(event,endApproach,{capture:true,passive:true,once:true});
document.addEventListener('visibilitychange',resumeApproach);
reduced.addEventListener('change',()=>{if(reduced.matches && approaching){endApproach();place(endView);}});
resumeApproach();
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
  if (e.data.type === 'visibility') { inView = !!e.data.visible; document.documentElement.toggleAttribute('data-garden-idle', !inView); if(inView)resumeApproach(); return; }
  endApproach();
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
