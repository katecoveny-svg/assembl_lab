const drawingOnly = new URLSearchParams(location.search).has('lite');
const modeLink = document.getElementById('habitatMode');
if(drawingOnly){modeLink.href='/next/#zoo';modeLink.textContent='Try the 3D habitat';}
// Keep the shared fourteen-studio app independent of this optional renderer.
const panel = document.getElementById('panel-zoo');
const habitatTab = document.getElementById('tab-zoo');
const tabStrip = habitatTab.parentElement;
function revealHabitatTab() {
  if(panel.hidden || tabStrip.scrollWidth <= tabStrip.clientWidth + 2) return;
  const tab = habitatTab.getBoundingClientRect(), strip = tabStrip.getBoundingClientRect();
  if(tab.left < strip.left || tab.right > strip.right){
    // Scroll only the strip. scrollIntoView would also move the document.
    tabStrip.scrollTo({left:tabStrip.scrollLeft + tab.left - strip.left - (strip.width - tab.width)/2,behavior:'instant'});
  }
}
new ResizeObserver(revealHabitatTab).observe(tabStrip);
document.fonts?.ready.then(revealHabitatTab);
let started = false;
function load() {
  if (panel.hidden) return;
  requestAnimationFrame(revealHabitatTab);
  if(started) return;
  started = true;
  if(drawingOnly){
    document.getElementById('habitatStatus').textContent = 'Drawing mode selected · all habitat controls still work. No 3D resources loaded.';
    return;
  }
  import('./scene.js').catch(() => {
    document.getElementById('habitatStatus').textContent = 'Drawing mode · 3D could not load. All habitat controls still work.';
  });
}
new MutationObserver(load).observe(panel, {attributes:true, attributeFilter:['hidden']});
load();
