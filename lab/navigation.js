// Preserve separately owned Living Studio and Climate presentation.
if (!location.pathname.startsWith('/study/patterns/') && !location.pathname.startsWith('/study/lessons/climate/') && location.pathname !== '/study/m/climate.html') {
(() => {
if(window.__labEmbed)return;
const path=location.pathname;
const section=path.startsWith('/instruments/')||path.startsWith('/study/bedazzle/')?'create':path.startsWith('/next/')||path.startsWith('/ar/')||path.startsWith('/study/print/')?'make':path.startsWith('/study/')?'learn':'';
const scoped=path==='/'||path==='/study/'||path==='/study/index.html'||path.startsWith('/study/year9/')||path.startsWith('/next/');
const css=document.createElement('link');css.rel='stylesheet';css.href='/lab/presentation.css';document.head.append(css);
if(scoped)document.documentElement.dataset.labFrame=path.startsWith('/next/')?'next':path==='/study/'||path==='/study/index.html'?'study':path.startsWith('/study/year9/')?'year9':'home';
const nav=document.createElement('nav');nav.id='al-nav';nav.setAttribute('aria-label','Assembl Lab navigation');
nav.innerHTML=`<a class="al-brand" href="/" aria-label="Assembl Lab home"><strong>assembl</strong> <span>lab</span></a><div class="al-destinations"><a href="/study/" ${section==='learn'?'aria-current="location"':''}>Learn</a><a href="/#create" ${section==='create'?'aria-current="location"':''}>Create</a><a href="/next/" ${section==='make'?'aria-current="location"':''}>Make & explore</a></div><a class="al-all" href="/#explore">All experiences</a>`;
document.body.prepend(nav);
})();
} else {
(() => {
if(window.__labEmbed)return;
const names=[['home','Kiwi home energy twin'],['kitchen','The kitchen machine'],['cafe','Café & restaurant twin'],['study','Study machines'],['next','Next Lab'],['store','Supermarket twin'],['ed','Emergency department twin'],['office','Auckland office twin'],['tourism','Aotearoa tourism flows'],['dairy','Dairy plant twin'],['stay','Accommodation twin'],['food','Food Flow Aotearoa'],['everyday','Every day counts'],['cars','Agent-ready cars'],['ar','assembl AR']];
const active=location.pathname.split('/')[1];const name=names.find(x=>x[0]===active)?.[1]||'Explore';
const css=document.createElement('style');css.textContent=`#al-nav{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:13px max(22px,4vw);border-bottom:1px solid #dfd5dc;background:#faf8f5;color:#492b3e;font:12px/1.4 'Instrument Sans',system-ui,sans-serif;position:relative;z-index:30}#al-nav *{box-sizing:border-box}#al-nav a{color:#492b3e!important;text-decoration:none!important;border:0!important;background:none!important;padding:0!important;margin:0!important}#al-nav .al-brand{font-size:20px;letter-spacing:-.7px;white-space:nowrap}#al-nav .al-brand strong{font-weight:600}#al-nav .al-brand span{color:#9a8392;font-weight:400}#al-nav .al-current{font-size:10px;color:#947e8d;margin-left:22px}#al-nav label{display:flex;gap:10px;align-items:center;font-size:10px}#al-nav select{font:11px 'Instrument Sans',system-ui,sans-serif;border:1px solid #dacdd6;border-radius:30px;background:#fffdfb;color:#492b3e;padding:8px 28px 8px 12px;width:auto;max-width:235px;height:auto;box-shadow:none}#al-nav a:focus-visible,#al-nav select:focus-visible{outline:2px solid #aa655e;outline-offset:3px}@media(max-width:650px){#al-nav{padding:10px 16px;gap:12px}#al-nav .al-current,#al-nav label span{display:none}#al-nav .al-brand{font-size:19px}#al-nav select{max-width:160px;font-size:10px;padding:7px 18px 7px 9px}}`;
document.head.appendChild(css);const nav=document.createElement('nav');nav.id='al-nav';nav.setAttribute('aria-label','Assembl Lab navigation');nav.innerHTML=`<div><a class="al-brand" href="/" aria-label="Back to Assembl Lab"><strong>assembl</strong> <span>lab</span> <small>↖</small></a><span class="al-current">/ ${name}</span></div><label><span>Explore another world</span><select aria-label="Switch experiment"><option value="">All experiments</option>${names.map(([id,label])=>`<option value="${id}" ${id===active?'selected':''}>${label}</option>`).join('')}</select></label>`;nav.querySelector('select').addEventListener('change',e=>location.href=e.target.value?'/'+e.target.value+'/':'/#explore');document.body.prepend(nav);
})();

}
