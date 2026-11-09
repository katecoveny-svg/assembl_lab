import {describe} from './records.mjs';
import {loadSnapshot} from './load.mjs';
let records=[];
const el=(tag,text)=>{const e=document.createElement(tag);e.textContent=text;return e;};
function render(){
 const source=document.querySelector('#source').value,root=document.querySelector('#records');root.replaceChildren();
 for(const r of records.filter(r=>source==='all'||r.id.startsWith(`${source}:`))){
 const a=el('article',''),v=r.value;
 a.append(el('h2',r.id.startsWith('geonet:')?`${v.locality} · M ${v.mag.toFixed(1)}`:v.name),Object.assign(el('p',describe(r)),{className:'badge'}),el('p',r.id.startsWith('geonet:')?`Depth ${v.depth} km · quality ${v.quality}`:`${v.type} · ${v.region} · directory status: ${v.status}`),el('p',r.scope),el('p',`${r.observationBasis}. Units: ${r.units}.`),el('p',r.source.attribution));
 for(const [text,url] of [['Source record',r.source.url],[r.source.license.name,r.source.license.url]]){const link=el('a',text);link.href=url;a.append(link,document.createTextNode(' · '));}root.append(a);
 }
}
document.querySelector('#source').addEventListener('change',render);
try {
 records=await loadSnapshot();
 document.querySelector('#status').textContent=`${records.length} saved records. Freshness recalculates every minute; no automatic source refresh.`;
 render();setInterval(render,60000);
} catch {
 records=[];document.querySelector('#records').replaceChildren();
 document.querySelector('#status').textContent='Evidence unavailable or invalid. No replacement values supplied.';
}
