// ui://cars/gallery.v1.html: the view for get_car. Inline it is a compact card (the render, four facts, two actions); "Open
// gallery" asks the host for fullscreen (ui/request-display-mode), where the renders and the drawing sit beside every notice
// field, the quick checks and the free test-drive times. A time is chosen in the chat, never booked from the view: the view
// sends a message and the assistant asks the buyer before calling book_test_drive. Both hosts ask the app to provide its own
// fullscreen button and every app starts inline, so the gallery opens on a tap rather than by itself.
import { profileSVG } from "./profile.js";
import { CIN_FIELDS } from "./tools.js";
import { page } from "./ui-kit.js";

const LABELS = Object.fromEntries(CIN_FIELDS.map((f) => [f.key, [f.label, f.section]]));

const CSS = `
.inl{display:grid;grid-template-columns:minmax(160px,300px) 1fr;gap:16px;align-items:start}
.pic{position:relative;border-radius:var(--r-lg);overflow:hidden;background:var(--c-surface);aspect-ratio:4/3}.pic img,.pic svg{width:100%;height:100%;object-fit:cover;display:block}
.pic .chip{position:absolute;left:8px;bottom:8px;background:color-mix(in srgb,var(--c-raised) 88%,transparent)}
h1{margin:0;font-size:var(--fs-hl);line-height:1.25;font-weight:600}.sub{margin:4px 0 0;color:var(--c-text-2)}
.facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 16px;margin:12px 0 0;padding:0}
.facts div{min-width:0}.facts dt{font-size:var(--fs-xs);color:var(--c-text-2)}.facts dd{margin:0;font-weight:600;font-variant-numeric:tabular-nums}
.full{display:none}:root[data-mode=fullscreen] .full,.expanded .full{display:block}:root[data-mode=fullscreen] .inl-only,.expanded .inl-only{display:none}
:root[data-mode=fullscreen] .wrap{max-width:1120px;margin:0 auto;padding:6px 4px 110px}
.gal{display:grid;grid-template-columns:minmax(0,3fr) minmax(280px,2fr);gap:24px;align-items:start}
.stage{position:relative;border-radius:var(--r-lg);overflow:hidden;background:var(--c-surface)}
.stage img,.stage svg{width:100%;height:auto;display:block}.stage .chip{position:absolute;left:10px;bottom:10px;background:color-mix(in srgb,var(--c-raised) 88%,transparent)}
.thumbs{display:flex;gap:8px;margin-top:10px}.thumbs button{width:88px;min-height:66px;padding:0;border-radius:var(--r-md);border:2px solid transparent;background:var(--c-surface);overflow:hidden;cursor:pointer}
.thumbs button[aria-pressed=true]{border-color:var(--accent)}.thumbs img,.thumbs svg{width:100%;height:66px;object-fit:cover}
.cap{margin:8px 0 0;font-size:var(--fs-xs);color:var(--c-text-2)}
h2{margin:20px 0 8px;font-size:var(--fs-h);font-weight:600}
table{width:100%;border-collapse:collapse;font-size:var(--fs-sm)}th,td{text-align:left;vertical-align:top;padding:7px 8px 7px 0;border-bottom:var(--bw) solid var(--c-line)}th{font-weight:400;color:var(--c-text-2);width:52%}
td small{display:block;color:var(--c-text-2);font-size:var(--fs-xs)}tr.sec th{padding-top:14px;color:var(--c-text);font-weight:600;border-bottom-color:var(--c-line-2)}
.checks{display:grid;gap:8px;margin:0;padding:0;list-style:none}.checks li{display:flex;gap:10px;align-items:baseline}.dot{width:10px;height:10px;border-radius:50%;flex:none;background:var(--c-ok)}.dot.no{background:var(--c-warn)}
.slots{display:flex;flex-wrap:wrap;gap:8px}.slots button{min-height:44px;padding:0 12px;border-radius:var(--r-md);border:var(--bw) solid var(--c-line-2);background:transparent;cursor:pointer;font-weight:600}
@media (max-width:760px){.gal{grid-template-columns:1fr}}
@media (max-width:460px){.inl{grid-template-columns:1fr}.facts{grid-template-columns:repeat(2,minmax(0,1fr))}}`;

const BODY = `<div class="wrap"><div class="inl"><div class="sk" style="aspect-ratio:4/3"></div><div><div class="sk" style="height:22px;width:80%"></div><div class="sk" style="height:14px;width:50%;margin-top:8px"></div><div class="sk" style="height:84px;margin-top:14px"></div></div></div></div>`;

const JS = `
${profileSVG.toString()}
var LABELS=${JSON.stringify(LABELS)};
var FUEL={petrol:"Petrol",diesel:"Diesel",hybrid:"Petrol hybrid","plug-in hybrid":"Plug-in hybrid",electric:"Electric"};
var D=null,view=0;
function fmt(ymd){if(!ymd)return"–";var d=new Date(ymd+"T12:00:00Z");return d.toLocaleDateString("en-NZ",{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"})}
function val(k,v){if(v===null||v===undefined)return"Not applicable";if(v===true)return"Yes";if(v===false)return"No";if(k==="price.cash")return money(v);if(k==="odometer.km")return kmf(v);if(/expiry$/.test(k))return fmt(v);return String(v)}
function views(d){var out=(d.images||[]).filter(function(i){return safeImg(i.url)}).map(function(i){return {kind:"img",url:i.url,alt:i.alt,ratio:i.ratio,label:i.label}});
  out.push({kind:"svg",alt:"Side drawing of the "+d.car.title,label:"Drawing"});return out}
function stage(v,d){return v.kind==="img"?'<img src="'+esc(v.url)+'" alt="'+esc(v.alt)+'">'+chip("Simulated","Render · simulated car"):profileSVG((d.car.render&&d.car.render.kind)||d.car.body,(d.car.render&&d.car.render.paint)||"#C8CBCB",{title:v.alt})+chip("Simulated","Drawing · simulated car")}
function render(d){D=d;var c=d.car,vs=views(d),first=vs[0],k=d.checks||{};
  var inl='<div class="inl inl-only"><div class="pic">'+(first.kind==="img"?'<img src="'+esc(first.url)+'" alt="'+esc(first.alt)+'" width="1200" height="900">'+chip("Simulated","Render · simulated"):stage(first,d))+'</div><div>'+
    '<h1>'+esc(c.title)+'</h1><p class="sub">'+esc(c.site===c.region?c.site:c.site+', '+c.region)+' · '+chip("Simulated")+(c.hold!=="available"?' '+chip("Estimate","On hold"):'')+'</p>'+
    '<dl class="facts"><div><dt>Price</dt><dd>'+money(c.priceNzd)+'</dd></div><div><dt>Odometer</dt><dd>'+kmf(c.odometerKm)+'</dd></div><div><dt>Fuel</dt><dd>'+esc(FUEL[c.fuel]||c.fuel)+'</dd></div><div><dt>WOF</dt><dd>'+(k.wof?esc(k.wof.monthsLeft)+' months':'–')+'</dd></div></dl>'+
    '<div class="actions"><button class="btn primary" type="button" id="open">Open gallery</button><button class="btn" type="button" id="check">Check this car</button></div></div></div>';
  var thumbs=vs.map(function(v,i){return '<button type="button" data-v="'+i+'" aria-pressed="'+(i===view)+'" aria-label="'+esc(v.label+(v.ratio?" "+v.ratio:""))+'">'+(v.kind==="img"?'<img src="'+esc(v.url)+'" alt="">':profileSVG((c.render&&c.render.kind)||c.body,(c.render&&c.render.paint)||"#C8CBCB"))+'</button>'}).join("");
  var notice=d.notice||{},notes=d.noticeNotes||{},sec="",rows="";Object.keys(notice).forEach(function(key){var L=LABELS[key]||[key,""];if(L[1]!==sec){sec=L[1];rows+='<tr class="sec"><th colspan="2">'+esc(sec)+'</th></tr>'}
    rows+='<tr><th scope="row">'+esc(L[0])+'</th><td>'+esc(val(key,notice[key]))+(notes[key]?'<small>'+esc(notes[key])+'</small>':'')+'</td></tr>'});
  var slots=(d.testDriveSlots||[]).map(function(s){return '<button type="button" data-slot="'+esc(s.start)+'" data-label="'+esc(s.label)+'">'+esc(s.label)+'</button>'}).join("");
  var full='<div class="full"><div class="gal"><div><div class="stage" id="stage">'+stage(vs[view]||first,d)+'</div><div class="thumbs" role="group" aria-label="Views">'+thumbs+'</div>'+
    '<p class="cap">'+esc(d.imageNote||"")+'</p></div><div><h1>'+esc(c.title)+'</h1><p class="sub">'+esc(c.site===c.region?c.site:c.site+', '+c.region)+' · '+chip("Simulated")+'</p>'+
    '<dl class="facts"><div><dt>Price</dt><dd>'+money(c.priceNzd)+'</dd></div><div><dt>Odometer</dt><dd>'+kmf(c.odometerKm)+'</dd></div><div><dt>Fuel</dt><dd>'+esc(FUEL[c.fuel]||c.fuel)+'</dd></div><div><dt>Economy '+chip("Estimate")+'</dt><dd>'+esc(d.economy?d.economy.value+" "+d.economy.unit:"–")+'</dd></div>'+
    '<div><dt>Seats · drive</dt><dd>'+esc(c.seats)+' · '+esc(c.drivetrain)+'</dd></div><div><dt>Safety '+chip("Simulated")+'</dt><dd>'+esc(d.safety?d.safety.stars+" stars":"–")+'</dd></div></dl>'+
    '<h2>Quick checks</h2><ul class="checks"><li><span class="dot'+(k.wof&&k.wof.ok?"":" no")+'"></span><span>WOF to '+esc(fmt(k.wof&&k.wof.expiry))+' ('+esc(k.wof&&k.wof.monthsLeft)+' months)</span></li>'+
    '<li><span class="dot'+(k.licence&&k.licence.ok?"":" no")+'"></span><span>Licence to '+esc(fmt(k.licence&&k.licence.expiry))+'</span></li><li><span class="dot'+(k.moneyOwing&&k.moneyOwing.ok?"":" no")+'"></span><span>'+esc(k.moneyOwing&&k.moneyOwing.note)+'</span></li></ul>'+
    '<h2>Test-drive times</h2>'+(slots?'<p class="muted small" style="margin:0 0 8px">Pick one and the assistant will ask you before requesting it. The dealer confirms.</p><div class="slots">'+slots+'</div>':'<p class="muted">No free times'+(c.hold!=="available"?": it\\'s on hold for another buyer (Simulated).":" in the next 7 days.")+'</p>')+
    '<div class="actions"><button class="btn" type="button" id="check2">Check this car</button></div></div></div>'+
    '<h2>Consumer Information Notice '+chip("Simulated")+'</h2><table>'+rows+'</table><p class="note">The facts a New Zealand dealer must show on a used car, for a car that doesn\\'t exist.</p></div>';
  $("#root").innerHTML='<div class="wrap">'+inl+full+'</div>';
  var ask=function(){Host.message("Is the "+c.title+" ("+c.id+") a good buy? Run a car check on it.").catch(function(){})};
  $("#open").addEventListener("click",function(){Host.displayMode("fullscreen").catch(function(){$(".wrap").classList.add("expanded");Host.size()})});
  $("#check").addEventListener("click",ask);$("#check2").addEventListener("click",ask);
  $$(".thumbs button").forEach(function(b){b.addEventListener("click",function(){view=+b.dataset.v;$("#stage").innerHTML=stage(views(D)[view],D);$$(".thumbs button").forEach(function(x){x.setAttribute("aria-pressed",x===b)})})});
  $$(".slots button").forEach(function(b){b.addEventListener("click",function(){Host.message("I'd like to test drive the "+c.title+" ("+c.id+") at "+b.dataset.label+" (slot "+b.dataset.slot+"). Please check with me, then request it.").catch(function(){})})});
}
window.VIEW={name:"gallery",modes:["inline","fullscreen"],render:render,context:function(){Host.size()},
  input:function(a){},error:function(t){$("#root").innerHTML='<div class="err"><p style="margin:0">'+esc(t)+'</p></div>'}};
`;

export const GALLERY_HTML = page("Demo car", CSS, BODY, JS);
