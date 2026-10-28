const drawingOnly = new URLSearchParams(location.search).has('lite');
const modeLink = document.getElementById('habitatMode');
if(drawingOnly){modeLink.href='/next/#zoo';modeLink.textContent='Try the 3D habitat';}
// Keep the shared fourteen-studio app independent of this optional renderer.
const panel = document.getElementById('panel-zoo');
let started = false;
function load() {
  if (panel.hidden || started) return;
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
