// ui://cars/results.v1.html: the inline carousel for search_cars. 3–8 cards, each with the car's studio render (labelled as a
// render of a Simulated car), title, price and km, site and region, and one action that asks the assistant for a car check.
import { page } from "./ui-kit.js";

const CSS = `
.head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 10px}
.head p{margin:0;font-size:var(--fs-sm);color:var(--c-text-2)}.head b{color:var(--c-text);font-weight:600}
.nav{display:flex;gap:6px}.nav .btn{min-width:44px;padding:0;font-size:18px;line-height:1}
@media (hover:none){.nav{display:none}}
.row{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(212px,232px);gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;scroll-padding-inline:var(--pad-l,2px);padding:2px 2px 6px;scrollbar-width:thin;overscroll-behavior-x:contain}
@media (max-width:480px){.row{grid-auto-columns:72%}}
.tile{scroll-snap-align:start;display:flex;flex-direction:column;border:var(--bw) solid var(--c-line);border-radius:var(--r-lg);overflow:hidden;background:var(--c-raised);min-width:0}
.ph{position:relative;aspect-ratio:1/1;background:var(--c-surface)}.ph img{width:100%;height:100%;object-fit:cover}
.ph .chip{position:absolute;left:8px;top:8px;background:color-mix(in srgb,var(--c-raised) 88%,transparent);backdrop-filter:blur(4px)}
.ph .flag{left:auto;right:8px;--tc:var(--c-warn)}
.body{display:flex;flex-direction:column;gap:3px;padding:10px 12px 12px;flex:1}
.t{margin:0;font-size:var(--fs-sm);font-weight:600;line-height:1.3;color:var(--c-text);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:2.6em}
.m{margin:0;font-size:var(--fs-sm);color:var(--c-text-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.m b{color:var(--c-text);font-weight:600}
.miss{margin:0;font-size:var(--fs-xs);color:var(--c-warn);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.body .btn{margin-top:auto;width:100%}.gap{flex:1;min-height:8px}
.empty{padding:14px;border:var(--bw) solid var(--c-line);border-radius:var(--r-lg)}
.sk-tile{height:360px}`;

const BODY = `<div class="head"><p><span class="sk" style="display:inline-block;width:220px;height:14px"></span></p></div>
<div class="row" aria-hidden="true"><div class="tile sk sk-tile"></div><div class="tile sk sk-tile"></div><div class="tile sk sk-tile"></div></div>`;

const JS = `
var FUEL={petrol:"Petrol",diesel:"Diesel",hybrid:"Hybrid","plug-in hybrid":"Plug-in",electric:"Electric"};
var place=function(c){return c.site===c.region?c.site:c.site+", "+c.region};
window.VIEW={name:"results",modes:["inline"],
  render:function(r){
    var list=(r.results||[]).slice(0,8),exact=list.filter(function(c){return c.match!=="close"}).length;
    var head='<div class="head"><p><b>'+esc(r.matched)+' of '+esc(r.total)+'</b> demo cars match'+(r.closeMatches?' · '+esc(r.closeMatches)+' close':'')+(r.region?' · near '+esc(r.region):'')+' '+chip("Simulated")+'</p>'+
      (list.length>2?'<div class="nav"><button class="btn" type="button" data-nav="-1" aria-label="Previous cars">‹</button><button class="btn" type="button" data-nav="1" aria-label="Next cars">›</button></div>':'')+'</div>';
    if(!list.length){$("#root").innerHTML=head+'<div class="empty"><p style="margin:0">No demo car fits all of that. Try a higher budget, another body type or fuel, or fewer must-haves.</p></div>';return}
    var tiles=list.map(function(c){var src=safeImg(c.image&&c.image.url),alt=c.image&&c.image.alt||("Render · simulated car: "+c.title);
      return '<article class="tile" aria-label="'+esc(c.title)+'"><div class="ph">'+(src?'<img src="'+esc(src)+'" alt="'+esc(alt)+'" width="800" height="800" loading="lazy" decoding="async">':'')+
        chip("Simulated","Render · simulated")+(c.hold!=="available"?'<span class="chip flag">On hold</span>':c.match==="close"?'<span class="chip flag">Close match</span>':'')+'</div>'+
        '<div class="body"><h3 class="t">'+esc(c.title)+'</h3><p class="m"><b>'+money(c.priceNzd)+'</b> · '+kmf(c.odometerKm)+'</p><p class="m">'+esc(place(c))+' · '+esc(FUEL[c.fuel]||c.fuel)+'</p>'+
        (c.match==="close"&&c.missed?'<p class="miss">'+esc(c.missed.join("; "))+'</p>':'')+'<span class="gap"></span>'+
        '<button class="btn" type="button" data-check="'+esc(c.id)+'" data-title="'+esc(c.title)+'">Check this car</button></div></article>'}).join("");
    $("#root").innerHTML=head+'<div class="row" role="list" tabindex="0" aria-label="Demo cars, scroll sideways">'+tiles.replace(/<article /g,'<article role="listitem" ')+'</div>'+
      '<p class="note">Harbour Lane Motors (demo) is fictional: these cars are Simulated and the images are 3D renders, not photos.</p>';
  },
  error:function(t){$("#root").innerHTML='<div class="err"><p style="margin:0">'+esc(t)+'</p></div>'}};
document.addEventListener("click",function(e){
  var n=e.target.closest("[data-nav]");if(n){var row=$(".row");if(row)row.scrollBy({left:(+n.dataset.nav)*Math.max(240,row.clientWidth*0.8),behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});return}
  var b=e.target.closest("[data-check]");if(!b)return;b.disabled=true;
  Host.message("Is the "+b.dataset.title+" ("+b.dataset.check+") a good buy? Run a car check on it.").then(function(){b.textContent="Asked"}).catch(function(){b.disabled=false;b.textContent="Ask in the chat"});
});
`;

export const RESULTS_HTML = page("Demo cars", CSS, BODY, JS);
