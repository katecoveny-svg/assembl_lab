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
// 13 Nov 2026: /site-v2/standard.css brings the nav to the standard of the main site's new home (inky plum #180B18, links that light
// up). It only touches elements that opt in with class "lab-std": this nav, not the page under it.
for(const href of ['/site-v2/site-v2.css','/site-v2/lab.css','/site-v2/standard.css'])if(!document.querySelector(`link[href^="${href}"]`)){const l=document.createElement('link');l.rel='stylesheet';l.href=href;document.head.append(l)}
if(scoped)document.documentElement.dataset.labFrame=path.startsWith('/next/')?'next':path==='/study/'||path==='/study/index.html'?'study':path.startsWith('/study/year9/')?'year9':'home';
// The lab bar (18 Nov 2026): the assembl.co.nz system, kept quiet. White, plum ink, square corners, one hairline;
// the mark goes back to the lab, and one link goes to assembl.co.nz. No menus of old experiments.
let nav=document.getElementById('al-nav');
if(!nav){nav=document.createElement('nav');nav.id='al-nav';nav.className='lab-min';nav.setAttribute('aria-label','assembl lab');
  if(!document.getElementById('al-nav-min')){const st=document.createElement('style');st.id='al-nav-min';st.textContent=
  '#al-nav.lab-min{all:initial;box-sizing:border-box;position:relative;z-index:30;display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:58px;padding:0 clamp(16px,3.4vw,56px);background:#FFFDFB;color:#654A4E;border-bottom:1px solid rgba(101,74,78,.2);font:400 14px/1.3 "Instrument Sans","Helvetica Neue",Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased}'+
  '#al-nav.lab-min *{box-sizing:border-box;border-radius:0}'+
  '#al-nav.lab-min a{color:#654A4E;text-decoration:none;background:none;border:0;margin:0;padding:0}'+
  '#al-nav.lab-min .lm-mark{display:inline-flex;align-items:center;gap:10px;font:600 21px/1 "Instrument Sans","Helvetica Neue",Arial,sans-serif;letter-spacing:-.05em}'+
  '#al-nav.lab-min .lm-mark i{font-style:normal;opacity:.55}'+
  '#al-nav.lab-min .lm-mark em{font:500 11px/1 "IBM Plex Mono",ui-monospace,Menlo,monospace;font-style:normal;letter-spacing:.08em;text-transform:uppercase;padding:4px 6px;background:#654A4E;color:#FFFDFB}'+
  '#al-nav.lab-min .lm-out{display:inline-flex;align-items:center;min-height:44px;border-bottom:1px solid transparent}'+
  '#al-nav.lab-min .lm-out span{display:inline-block;padding:3px 0;border-bottom:1px solid transparent}'+
  '#al-nav.lab-min .lm-out:hover span{border-bottom-color:#654A4E}'+
  '#al-nav.lab-min a:focus-visible{outline:1.5px solid #654A4E;outline-offset:3px}'+
  '@media print{#al-nav.lab-min{display:none}}';document.head.append(st)}
  nav.innerHTML=`<a class="lm-mark" href="${LAB}/" aria-label="assembl lab home"><span>assembl<i>.</i></span><em>lab</em></a><a class="lm-out" href="https://www.assembl.co.nz/" target="_top"><span>assembl.co.nz&nbsp;↗</span></a>`;
  // after a page's own skip link, so "Skip to …" stays the first tab stop
  const first=document.body.firstElementChild;
  if(first&&first.matches('a.skip,a.skip-link,a[class*="skip"]'))first.after(nav);else document.body.prepend(nav);
}
})();
} else {
(() => {
if(window.__labEmbed)return;
const names=[['home','Kiwi home energy twin'],['kitchen','The kitchen machine'],['cafe','Café & restaurant twin'],['study','Study machines'],['store','Supermarket twin'],['ed','Emergency department twin'],['office','Auckland office twin'],['tourism','Aotearoa tourism flows'],['dairy','Dairy plant twin'],['stay','Accommodation twin'],['food','Food Flow Aotearoa'],['everyday','Every day counts'],['cars','Agent-ready cars'],['ar','assembl AR'],['manu','Manu · birds of Aotearoa']];
const active=location.pathname.split('/')[1];const name=names.find(x=>x[0]===active)?.[1]||'Explore';
const css=document.createElement('style');css.textContent=`#al-nav{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:13px max(22px,4vw);border-bottom:1px solid #dfd5dc;background:#faf8f5;color:#492b3e;font:12px/1.4 'Instrument Sans',system-ui,sans-serif;position:relative;z-index:30}#al-nav *{box-sizing:border-box}#al-nav a{color:#492b3e!important;text-decoration:none!important;border:0!important;background:none!important;padding:0!important;margin:0!important}#al-nav .al-brand{font-size:20px;letter-spacing:-.7px;white-space:nowrap}#al-nav .al-brand strong{font-weight:600}#al-nav .al-brand span{color:#9a8392;font-weight:400}#al-nav .al-current{font-size:10px;color:#947e8d;margin-left:22px}#al-nav label{display:flex;gap:10px;align-items:center;font-size:10px}#al-nav select{font:11px 'Instrument Sans',system-ui,sans-serif;border:1px solid #dacdd6;border-radius:30px;background:#fffdfb;color:#492b3e;padding:8px 28px 8px 12px;width:auto;max-width:235px;height:auto;box-shadow:none}#al-nav a:focus-visible,#al-nav select:focus-visible{outline:2px solid #aa655e;outline-offset:3px}@media(max-width:650px){#al-nav{padding:10px 16px;gap:12px}#al-nav .al-current,#al-nav label span{display:none}#al-nav .al-brand{font-size:19px}#al-nav select{max-width:160px;font-size:10px;padding:7px 18px 7px 9px}}`;
document.head.appendChild(css);const nav=document.createElement('nav');nav.id='al-nav';nav.setAttribute('aria-label','assembl lab navigation');nav.innerHTML=`<div><a class="al-brand" href="/" aria-label="Back to assembl lab"><strong>assembl</strong> <span>lab</span> <small>↖</small></a><span class="al-current">/ ${name}</span></div><label><span>Explore another world</span><select aria-label="Switch experiment"><option value="">All experiments</option>${names.map(([id,label])=>`<option value="${id}" ${id===active?'selected':''}>${label}</option>`).join('')}</select></label>`;nav.querySelector('select').addEventListener('change',e=>location.href=e.target.value?'/'+e.target.value+'/':'/#explore');document.body.prepend(nav);
})();

}
