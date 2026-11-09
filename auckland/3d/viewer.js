const canvas=document.querySelector('#terrain'),stage=document.querySelector('#stage'),status=document.querySelector('#status');
const quick=document.querySelector('#quicklook'),android=document.querySelector('#android'),note=document.querySelector('#ar-note');
const local=location.protocol!=='https:'||['localhost','127.0.0.1'].includes(location.hostname);
const url=new URL('./auckland-tabletop.glb',location.href).href;
if(local){note.textContent='Local preview: native AR needs a phone-accessible HTTPS host. Download the models for testing; browser 3D works here.';for(const a of [quick,android]){a.setAttribute('aria-disabled','true');a.addEventListener('click',e=>e.preventDefault());}}
else{const p=new URLSearchParams({file:url,mode:'ar_preferred',title:'Auckland tabletop · heights ×5',resizable:'false'});android.href=`intent://arvr.google.com/scene-viewer/1.2?${p}#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(location.href)};end;`;note.textContent='iPhone/iPad: Safari Quick Look. Android: Scene Viewer requires compatible AR services. Initial map width 70 cm; scale is locked where supported.';if(!/Android/i.test(navigator.userAgent))android.addEventListener('click',e=>{e.preventDefault();note.textContent='Open this page on an AR-capable Android phone, or download the GLB below.';});}
import {cityScene} from './city-scene.js';
function fallback(){stage.classList.remove('loaded');status.textContent='Interactive 3D unavailable in this browser; showing a static preview. Try another WebGL-capable browser, open the 2D atlas, or use the source links below.';document.querySelectorAll('.views button, [data-building-layer], #building-picker').forEach(b=>b.disabled=true);}
try{
 if(new URLSearchParams(location.search).has('poster'))throw Error('Poster selected');
 const describe=b=>{document.querySelector('#place-title').textContent=b.name;document.querySelector('#place-copy').textContent=b.kind==='tagged'?`OSM height tag: ${b.height} m. Not independently verified.`:b.kind==='estimated'?`Estimated ${b.height} m from ${b.levels} mapped levels × 3 m. Not a measured height.`:'Mapped footprint only. Height unavailable; shown flat.';const a=document.querySelector('#building-source');a.href='https://www.openstreetmap.org/way/'+b.id;a.hidden=false;};
 const city=await cityScene(canvas,{onSelect:describe,onReady:stats=>window.cityStats=stats});
 const picker=document.querySelector('#building-picker');city.data.buildings.forEach((b,i)=>{if(b.name==='Mapped building')return;const o=document.createElement('option');o.value=i;o.textContent=b.name;picker.append(o)});picker.onchange=()=>{if(picker.value!=='')describe(city.data.buildings[Number(picker.value)]);};
 document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{city.view(b.dataset.view);document.querySelectorAll('[data-view]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));});
 document.querySelector('#reset').onclick=()=>city.view('city');document.querySelectorAll('[data-building-layer]').forEach(b=>b.onchange=()=>city.setLayer(b.dataset.buildingLayer,b.checked));
 stage.classList.add('loaded');status.textContent='';window.terrainReady=true;
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();fallback();});
}catch(e){fallback();}
