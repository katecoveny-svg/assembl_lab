// Deep links select the existing year panel; no curriculum or assessment changes.
(() => {
const years=new Set(['y9','y10','l1','l2','l3']);
function reveal(id){if(years.has(id)){document.getElementById('tab-'+id)?.click();document.getElementById('h-index')?.scrollIntoView({block:'start'});}else if(id==='junior'){const el=document.getElementById('junior');if(el){el.open=true;el.scrollIntoView({block:'start'});}}}
document.querySelectorAll('[data-study-year]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();reveal(a.dataset.studyYear)}));
window.addEventListener('hashchange',()=>reveal(location.hash.slice(1)));
if(years.has(location.hash.slice(1))||location.hash==='#junior')window.addEventListener('load',()=>reveal(location.hash.slice(1)),{once:true});
})();
