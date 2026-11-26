const studio = window.__nzStudio;
const referrer = document.referrer && new URL(document.referrer).origin;
const parentOrigin = referrer || location.origin;
const bed = studio.engine.beds[0];
const centre = bed.points.reduce((sum, p) => ({x: sum.x + p.x, z: sum.z + p.z}), {x: 0, z: 0});
const x = centre.x / bed.points.length, z = centre.z / bed.points.length;
const compact = innerWidth < 640;
const gy = studio.terrainEngine.getHeight(-5.5,-10.2);
studio.setSunHour(9.65);
studio.setCamera(compact ? -8.65 : -11.35, gy + (compact ? 2.85 : 2.50), compact ? 4.3 : 3.70, -5.25, gy + 1.43, -9.45);
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
  const offset = keyboardStroke++ % 9;
  studio.paintAt(x + (offset % 3 - 1) * .9, z + 1.8 + Math.floor(offset / 3) * .65);
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
  if (e.data.type === 'undo') document.querySelector('#btn-undo')?.click();
  if (e.data.type === 'plant') plant();
});
try {
  await new Promise(resolve=>requestAnimationFrame(resolve));
  await studio.present();
  send('ready');
} catch { send('unavailable'); }
