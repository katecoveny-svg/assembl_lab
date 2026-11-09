import {validateRecord,describe} from './records.mjs';
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
try{const response=await fetch('./data/snapshot.json',{cache:'no-store'});if(!response.ok)throw Error();const data=await response.json();if(data.schemaVersion!==1||!Array.isArray(data.records))throw Error();records=data.records.map(validateRecord);document.querySelector('#status').textContent=`${records.length} saved records. Freshness recalculates every minute; no automatic external requests.`;render();setInterval(render,60000);}catch{document.querySelector('#status').textContent='Evidence unavailable or invalid. No replacement values supplied.';}
document.querySelector('#source').addEventListener('change',render);
