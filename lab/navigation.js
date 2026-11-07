// Preserve separately owned Living Studio and Climate presentation.
if (!location.pathname.startsWith('/study/patterns/') && !location.pathname.startsWith('/study/lessons/climate/') && location.pathname !== '/study/m/climate.html') {
(() => {
if(window.__labEmbed)return;
const path=location.pathname;
// on study.assembl.co.nz the root redirects into the study, so links back to the lab go to the lab's own address
const LAB=location.hostname==='study.assembl.co.nz'?'https://lab.assembl.co.nz':'';
// one lab nav for /, /discover/ and /study/: / and /discover/ ship this markup static, everything else gets it here
const scoped=path==='/study/'||path==='/study/index.html'||path.startsWith('/study/year9/')||path.startsWith('/next/');
if(!document.querySelector('link[href^="/lab/presentation.css"]')&&!document.querySelector('link[href^="/lab/catalogue-home.css"]')){const css=document.createElement('link');css.rel='stylesheet';css.href='/lab/presentation.css';document.head.append(css)}
// site-v2 chrome (8 Nov 2026): the foundation ported from assembl.co.nz (/site-v2/site-v2.css) plus the Lab's own rules (/site-v2/lab.css)
for(const href of ['/site-v2/site-v2.css','/site-v2/lab.css'])if(!document.querySelector(`link[href^="${href}"]`)){const l=document.createElement('link');l.rel='stylesheet';l.href=href;document.head.append(l)}
if(scoped)document.documentElement.dataset.labFrame=path.startsWith('/next/')?'next':path==='/study/'||path==='/study/index.html'?'study':path.startsWith('/study/year9/')?'year9':'home';
const here=path==='/'||path==='/index.html'?'explore':path.startsWith('/discover/')||path.startsWith('/instruments/')||path.startsWith('/study/patterns/')||path.startsWith('/study/bedazzle/')||path.startsWith('/next/')||path.startsWith('/ar/')||path.startsWith('/study/print/')?'discover':path.startsWith('/study/')?'study':'';
// The experiment nav, site-v2 (8 Nov 2026): the flat mark A + "assembl." + lab, the Lab's doors, and a pill back to assembl.co.nz.
// Same pieces as the foundation's SiteNav (solid), styled by /site-v2/lab.css. A Menu button takes over below 880px.
const arrow='<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M8 7h9v9"/></svg>';
const doors=[['explore',`${LAB}/#explore`,'The experiments'],['discover',`${LAB}/#playground`,'Playground'],['study','/study/','Study machines'],['about',`${LAB}/#about`,'About the lab']];
let nav=document.getElementById('al-nav');
if(!nav){nav=document.createElement('nav');nav.id='al-nav';nav.className='site-v2 v2-tone-plum';nav.setAttribute('aria-label','assembl lab');
  // critical paint until the stylesheets arrive: plum band, small flat mark
  if(!document.getElementById('al-nav-critical')){const st=document.createElement('style');st.id='al-nav-critical';st.textContent='#al-nav{display:flex;align-items:center;gap:16px;min-height:72px;padding:10px 16px;background:#21121F;color:#F9F6F2;font:400 14.5px/1.4 "Instrument Sans",system-ui,sans-serif}#al-nav a{color:inherit;text-decoration:none}#al-nav .v2-wordmark{display:inline-flex;align-items:center;gap:.45em;margin-right:auto;font-size:22px;letter-spacing:-.05em}#al-nav .al-menu[hidden]{display:none}@media(max-width:880px){#al-nav .al-destinations,#al-nav .al-cta{display:none}}';document.head.append(st)}
  nav.innerHTML=`<a class="v2-wordmark al-brand" href="${LAB}/" aria-label="assembl lab home" style="--v2-wm-size:22px;--v2-wm-a:32px"><svg class="v2-wordmark-a" viewBox="0 0 200 200" width="32" height="32" aria-hidden="true" focusable="false" style="width:32px;height:32px"><path d="M66 82 C72 56 132 52 132 84" fill="none" stroke="#F9F6F2" stroke-width="14" stroke-linecap="round"/><line x1="132" y1="76" x2="132" y2="160" fill="none" stroke="#F9F6F2" stroke-width="14" stroke-linecap="round"/><path d="M132 112 C132 90 64 90 64 128 C64 166 132 166 132 136" fill="none" stroke="#F9F6F2" stroke-width="14" stroke-linecap="round"/><circle cx="160" cy="160" r="10" fill="#D9BACB"/></svg><span>assembl<span class="v2-wordmark-dot" aria-hidden="true">.</span></span><span class="lab-wm-suffix">lab</span></a><div class="al-destinations">${doors.map(([k,h,t])=>`<a data-k="${k}" href="${h}">${t}</a>`).join('')}</div><a class="v2-btn v2-btn-ghost v2-btn-sm al-cta" href="https://assembl.co.nz/" target="_top"><span class="v2-btn-label">Build with assembl</span><span class="v2-btn-icon" data-dir="up-right">${arrow}</span></a><button type="button" class="al-menu-btn" aria-expanded="false" aria-controls="al-menu">Menu</button><div class="al-menu" id="al-menu" hidden>${doors.map(([k,h,t])=>`<a data-k="${k}" href="${h}">${t}${arrow}</a>`).join('')}<a class="al-menu-cta" href="https://assembl.co.nz/" target="_top">Build with assembl${arrow}</a></div>`;
  // after a page's own skip link, so "Skip to …" stays the first tab stop
  const first=document.body.firstElementChild;
  if(first&&first.matches('a.skip,a.skip-link,a[class*="skip"]'))first.after(nav);else document.body.prepend(nav);
  const btn=nav.querySelector('.al-menu-btn'),menu=nav.querySelector('.al-menu');
  const set=v=>{menu.hidden=!v;btn.setAttribute('aria-expanded',String(v));btn.textContent=v?'Close':'Menu'};
  btn.addEventListener('click',()=>set(menu.hidden));
  menu.addEventListener('click',e=>{if(e.target.closest('a'))set(false)});
  addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.hidden){set(false);btn.focus()}});
}
nav.querySelectorAll('[data-k]').forEach(a=>{if(a.dataset.k===here)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});
})();
} else {
(() => {
if(window.__labEmbed)return;
const names=[['home','Kiwi home energy twin'],['kitchen','The kitchen machine'],['cafe','Café & restaurant twin'],['study','Study machines'],['store','Supermarket twin'],['ed','Emergency department twin'],['office','Auckland office twin'],['tourism','Aotearoa tourism flows'],['dairy','Dairy plant twin'],['stay','Accommodation twin'],['food','Food Flow Aotearoa'],['everyday','Every day counts'],['cars','Agent-ready cars'],['ar','assembl AR']];
const active=location.pathname.split('/')[1];const name=names.find(x=>x[0]===active)?.[1]||'Explore';
const css=document.createElement('style');css.textContent=`#al-nav{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:13px max(22px,4vw);border-bottom:1px solid #dfd5dc;background:#faf8f5;color:#492b3e;font:12px/1.4 'Instrument Sans',system-ui,sans-serif;position:relative;z-index:30}#al-nav *{box-sizing:border-box}#al-nav a{color:#492b3e!important;text-decoration:none!important;border:0!important;background:none!important;padding:0!important;margin:0!important}#al-nav .al-brand{font-size:20px;letter-spacing:-.7px;white-space:nowrap}#al-nav .al-brand strong{font-weight:600}#al-nav .al-brand span{color:#9a8392;font-weight:400}#al-nav .al-current{font-size:10px;color:#947e8d;margin-left:22px}#al-nav label{display:flex;gap:10px;align-items:center;font-size:10px}#al-nav select{font:11px 'Instrument Sans',system-ui,sans-serif;border:1px solid #dacdd6;border-radius:30px;background:#fffdfb;color:#492b3e;padding:8px 28px 8px 12px;width:auto;max-width:235px;height:auto;box-shadow:none}#al-nav a:focus-visible,#al-nav select:focus-visible{outline:2px solid #aa655e;outline-offset:3px}@media(max-width:650px){#al-nav{padding:10px 16px;gap:12px}#al-nav .al-current,#al-nav label span{display:none}#al-nav .al-brand{font-size:19px}#al-nav select{max-width:160px;font-size:10px;padding:7px 18px 7px 9px}}`;
document.head.appendChild(css);const nav=document.createElement('nav');nav.id='al-nav';nav.setAttribute('aria-label','assembl lab navigation');nav.innerHTML=`<div><a class="al-brand" href="/" aria-label="Back to assembl lab"><strong>assembl</strong> <span>lab</span> <small>↖</small></a><span class="al-current">/ ${name}</span></div><label><span>Explore another world</span><select aria-label="Switch experiment"><option value="">All experiments</option>${names.map(([id,label])=>`<option value="${id}" ${id===active?'selected':''}>${label}</option>`).join('')}</select></label>`;nav.querySelector('select').addEventListener('change',e=>location.href=e.target.value?'/'+e.target.value+'/':'/#explore');document.body.prepend(nav);
})();

}
