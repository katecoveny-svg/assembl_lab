// ui://cars/car-check.v2.html: the MCP Apps view for car_check (inline card, with every check in fullscreen).
// Inline: the car, the verdict, the weekly running cost with two sliders (km a week, power price) and a fuel-versus-electric
// comparison, and the top red flags. The sliders redo the sums at once from the rates in the tool result; when the host lets
// views call tools (MCP Apps serverTools, or window.openai.callTool) the view then asks running_cost for the authoritative
// figure and tells the model the buyer's chosen distance (ui/update-model-context). Fullscreen adds every flag, the official
// checks with their links, the notice fields not given, the fair-price questions and each cost line's basis and source.
// Self-contained: no network requests apart from the car's render on IMG_BASE (demo cars only).
import { profileSVG } from "./profile.js";
import { page } from "./ui-kit.js";

const CSS = `
.top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
.eyebrow{margin:0;font-size:var(--fs-xs);color:var(--c-text-2)}
h1{margin:2px 0 0;font-size:var(--fs-hl);line-height:1.25;font-weight:600;color:var(--c-text)}
h2{margin:18px 0 8px;font-size:var(--fs-h);font-weight:600;color:var(--c-text)}
.hero{display:grid;grid-template-columns:minmax(140px,220px) 1fr;gap:14px;align-items:center;margin:12px 0 2px}
.hero .pic{border-radius:var(--r-md);overflow:hidden;background:var(--c-surface);aspect-ratio:4/3;position:relative}.hero .pic img,.hero .pic svg{width:100%;height:100%;object-fit:cover}
.hero .pic .chip{position:absolute;left:6px;bottom:6px;background:color-mix(in srgb,var(--c-raised) 88%,transparent)}
.sum{margin:0;font-size:var(--fs-md);font-weight:600;color:var(--c-text)}.stmt{margin:6px 0 0;font-size:var(--fs-xs);color:var(--c-text-2)}
.reg{margin-top:14px;padding:14px;border:var(--bw) solid var(--c-line);border-radius:var(--r-lg)}
.reg h2{margin:0 0 6px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}.reg .n{margin:0;font-size:var(--fs-md)}.reg .n b{font-weight:600;font-variant-numeric:tabular-nums}
.regf{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 16px;margin:10px 0 0}.regf dt{font-size:var(--fs-xs);color:var(--c-text-2)}.regf dd{margin:0;font-weight:600}.regf dd small{display:block;font-weight:400;color:var(--c-text-2);font-size:var(--fs-xs)}
.quiet{margin:12px 0 0;font-size:var(--fs-xs);color:var(--c-text-2)}
@media (max-width:440px){.regf{grid-template-columns:1fr}}
.cost{margin-top:14px;padding:14px;border:var(--bw) solid var(--c-line);border-radius:var(--r-lg);background:var(--c-raised)}
.cost h2{margin:0 0 10px}
.vs{display:grid;gap:8px}.vrow{display:grid;grid-template-columns:minmax(110px,34%) 1fr auto;gap:10px;align-items:center}
.vrow span:first-child{font-size:var(--fs-sm)}.bar{height:14px;border-radius:5px;background:color-mix(in srgb,var(--c-text) 8%,transparent);position:relative;overflow:hidden}
.bar i{position:absolute;inset:0 auto 0 0;border-radius:5px;background:var(--accent)}.vrow.alt .bar i{background:color-mix(in srgb,var(--c-text-2) 55%,transparent)}
.vrow b{font:600 var(--fs-sm) var(--f-sans);font-variant-numeric:tabular-nums;min-width:74px;text-align:right}
.diff{margin:8px 0 0;font-size:var(--fs-sm);color:var(--c-text-2)}
.sl{display:grid;gap:12px;margin-top:14px}
.sl label{display:grid;grid-template-columns:1fr auto;gap:4px 10px;align-items:center;font-size:var(--fs-sm)}
.sl output{font-weight:600;font-variant-numeric:tabular-nums}
.sl input[type=range]{grid-column:1/-1;width:100%;min-height:44px;margin:0;accent-color:var(--accent)}
.sl small{grid-column:1/-1;color:var(--c-text-2);font-size:var(--fs-xs)}
.lines{list-style:none;margin:12px 0 0;padding:0;display:grid;gap:6px}
.lines li{display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:center;font-size:var(--fs-sm)}.lines li b{font-weight:600;font-variant-numeric:tabular-nums;min-width:64px;text-align:right}
.lines li.total{padding-top:6px;border-top:var(--bw) solid var(--c-line)}
.lines .basis{grid-column:1/-1;margin:-2px 0 4px;color:var(--c-text-2);font-size:var(--fs-xs)}
.status{margin:10px 0 0;font-size:var(--fs-xs);color:var(--c-text-2)}
ul.list{list-style:none;margin:0;padding:0}ul.list li{display:grid;grid-template-columns:16px 1fr;gap:10px;padding:8px 0;border-bottom:var(--bw) solid var(--c-line)}ul.list li:last-child{border-bottom:0}
ul.list b{font-weight:600}ul.list small{display:block;color:var(--c-text-2);font-size:var(--fs-sm)}
.k{width:12px;height:12px;border-radius:50%;margin-top:4px;border:2px solid var(--c-text-3)}.k.stop{background:var(--c-danger);border-color:var(--c-danger)}.k.watch{border-color:var(--c-warn);background:color-mix(in srgb,var(--c-warn) 35%,transparent)}.k.ask{border-color:var(--c-info)}
.box{width:14px;height:14px;border:2px solid var(--c-text-2);border-radius:3px;margin-top:3px}
.miss{display:flex;flex-wrap:wrap;gap:6px}.miss span{font-size:var(--fs-xs);padding:4px 8px;border-radius:999px;border:var(--bw) solid var(--c-line)}
ol.qs{margin:0;padding-left:20px}ol.qs li{margin:4px 0}
.detail{display:none}:root[data-mode=fullscreen] .detail,.expanded .detail{display:block}:root[data-mode=fullscreen] .more,.expanded .more{display:none}
:root[data-mode=fullscreen] .card{max-width:860px;margin:0 auto;padding:8px 4px 96px}
.lines .basis{display:none}:root[data-mode=fullscreen] .lines .basis,.expanded .lines .basis{display:block}
@media (max-width:440px){.hero{grid-template-columns:1fr}.hero .pic{max-width:320px}.vrow{grid-template-columns:1fr auto}.vrow .bar{grid-column:1/-1;grid-row:2}}`;

const BODY = `<div class="card"><div class="sk" style="height:22px;width:60%"></div><div class="hero"><div class="sk" style="aspect-ratio:4/3"></div><div><div class="sk" style="height:16px;margin-bottom:8px"></div><div class="sk" style="height:12px;width:80%"></div></div></div><div class="sk" style="height:210px;margin-top:14px"></div></div>`;

const JS = `
${profileSVG.toString()}
var R=null,base=null,state={kmw:200,ckwh:40,dirty:false,source:"result"};
var FUEL={petrol:"Petrol",diesel:"Diesel",hybrid:"Hybrid","plug-in hybrid":"Plug-in hybrid",electric:"Electric"};
// the same sums as running_cost, from the rates it returned: energy, road user charges, WOF + licence, servicing
function cost(rc,fuel,eco,kmw,ckwh){var r=rc.rates,e=0;
  if(fuel==="electric")e=kmw*eco/100*(1+r.chargingLoss)*ckwh/100;
  else if(fuel==="plug-in hybrid")e=kmw*r.phevElectricShare*r.phevKwhPer100km/100*(1+r.chargingLoss)*ckwh/100+kmw*(1-r.phevElectricShare)*eco/100*r.petrol91Cpl/100;
  else e=kmw*eco/100*(fuel==="diesel"?r.dieselCpl:r.petrol91Cpl)/100;
  var ruc=kmw/1000*((r.rucPerThousandKm||{})[fuel]||0),wl=r.wofLicenceAnnual/52,m=((r.maintenanceAnnual||{})[fuel]||0)/52;
  return {energy:e,ruc:ruc,wofLicence:wl,maintenance:m,total:e+ruc+wl+m}}
// the tool's own figures until a slider moves, then the same sums redone here
function figures(){var rc=R.runningCost;if(rc.rates&&state.dirty)return recompute();var L={};(rc.lines||[]).forEach(function(l){L[l.key]=(L[l.key]||0)+l.weekly});
  return {mine:{energy:L.energy||0,ruc:L.ruc||0,wofLicence:L.wof_licence||0,maintenance:L.maintenance||0,total:rc.totalWeekly},other:{total:rc.compare.totalWeekly}}}
function recompute(){var rc=R.runningCost;var mine=cost(rc,rc.fuel,rc.economy.value,state.kmw,state.ckwh),other=cost(rc,rc.compare.fuel,rc.compare.economy.value,state.kmw,state.ckwh);return {mine:mine,other:other}}
function costHTML(){var rc=R.runningCost,c=figures(),max=Math.max(c.mine.total,c.other.total,1),d=c.mine.total-c.other.total;
  var lbl={energy:rc.fuel==="plug-in hybrid"?"Charging and petrol":(rc.lines[0]&&rc.lines[0].label)||"Energy",ruc:"Road user charges",wofLicence:"WOF and licence",maintenance:"Servicing, tyres, brakes"};
  var truth={energy:(rc.lines[0]&&rc.lines[0].truth)||"Latest published",ruc:"Latest published",wofLicence:"Estimate",maintenance:"Estimate"};
  var basis={};(rc.lines||[]).forEach(function(l){var k=l.key==="wof_licence"?"wofLicence":l.key;if(basis[k]&&l.basis)basis[k]={basis:basis[k].basis+" + "+l.basis,source:basis[k].source||l.source};else basis[k]=l});
  var rows=["energy","ruc","wofLicence","maintenance"].map(function(k){var l=basis[k]||{};return '<li><span>'+esc(lbl[k])+'</span>'+chip(state.dirty&&k==="energy"&&/charg/i.test(lbl.energy)&&state.ckwh!==base.ckwh?"Your data":((basis[k]&&basis[k].truth)||truth[k]))+'<b>'+money(c.mine[k],2)+'</b>'+
    (l.basis?'<span class="basis">'+esc(l.basis)+(l.source&&l.source.url?' · <a href="'+esc(l.source.url)+'">'+esc(l.source.name)+'</a>':'')+'</span>':'')+'</li>'}).join("");
  return '<div class="vs" role="img" aria-label="This car about '+money(c.mine.total,2)+' a week; '+esc(rc.compare.label)+' about '+money(c.other.total,2)+' a week">'+
    '<div class="vrow"><span>This car · '+esc(FUEL[rc.fuel]||rc.fuel)+'</span><span class="bar"><i style="width:'+(c.mine.total/max*100).toFixed(1)+'%"></i></span><b>'+money(c.mine.total,2)+'</b></div>'+
    '<div class="vrow alt"><span>'+esc(rc.compare.label)+'</span><span class="bar"><i style="width:'+(c.other.total/max*100).toFixed(1)+'%"></i></span><b>'+money(c.other.total,2)+'</b></div></div>'+
    '<p class="diff">'+(Math.abs(d)<0.5?"About the same each week.":(d>0?"About "+money(d,2)+" a week more than ":"About "+money(-d,2)+" a week less than ")+esc(rc.compare.label.charAt(0).toLowerCase()+rc.compare.label.slice(1))+", "+money(Math.abs(d)*52)+" a year.")+' '+chip("Estimate","Comparison: estimate")+'</p>'+
    '<ul class="lines">'+rows+'<li class="total"><span>A week, all in</span><span></span><b>'+money(c.mine.total,2)+'</b></li></ul>'}
function sliders(){var rc=R.runningCost;if(!rc.rates)return "";return '<div class="sl">'+
  '<label for="kmw">Kilometres a week <output id="kmw-o">'+state.kmw+' km</output><input id="kmw" type="range" min="25" max="800" step="25" value="'+state.kmw+'" aria-describedby="kmw-h"><small id="kmw-h">'+Math.round(state.kmw*52).toLocaleString("en-NZ")+' km a year</small></label>'+
  '<label for="ckwh">Power price for charging <output id="ckwh-o">'+state.ckwh.toFixed(1)+' c/kWh</output><input id="ckwh" type="range" min="10" max="'+Math.max(60,Math.ceil(state.ckwh))+'" step="0.5" value="'+state.ckwh+'" aria-describedby="ckwh-h"><small id="ckwh-h">Starts at MBIE\\'s average household price for '+esc(rc.rates.electricityLocation)+'. Set your plan\\'s rate: off-peak EV plans are often lower.</small></label></div>'}
function credits(){var rc=R.runningCost;return (rc.credits||(R.credits||[]).filter(function(c){return !/Motor Vehicle Register/.test(c.name)})).map(function(c){return '<a href="'+esc(c.url)+'">'+esc(c.name)+'</a>'+(c.licence?" ("+esc(c.licence)+")":"")}).join(" · ")}
// "On the NZ register": NZTA's open data for the model (counts only, never this car's plate or owner); a quiet line when not looked up
function regHTML(g){if(!g)return "";var credit='Source: <a href="'+esc(g.source&&g.source.url)+'">NZ Transport Agency Waka Kotahi, Motor Vehicle Register</a> (CC BY 4.0)';
  if(g.found===null||g.status==="unavailable"||g.status==="skipped")return '<p class="quiet">On the NZ register: not looked up this time'+(g.reason?' ('+esc(g.reason.replace(/\\.$/,""))+')':'')+'.</p>';
  if(!g.found)return '<section class="reg"><h2>On the NZ register '+chip("Source","NZTA open data")+'</h2><p class="n">No '+esc(g.name)+' is on NZTA\\'s register under that name. Check the make and model spelling.</p><p class="quiet">'+esc(g.period||"")+' · '+credit+'</p></section>';
  var imp=g.usedImportPct>=50?g.usedImportPct+'% used imports'+(g.previousCountry?' <small>mostly from '+esc(g.previousCountry.value)+'</small>':''):g.nzNewPct+'% NZ-new'+(g.usedImportPct?' <small>'+g.usedImportPct+'% used imports</small>':'');
  return '<section class="reg" aria-labelledby="reg-h"><h2 id="reg-h">On the NZ register '+chip("Source","NZTA open data")+'</h2>'+
    '<p class="n"><b>'+Number(g.total).toLocaleString("en-NZ")+'</b> '+esc(g.name)+(g.total===1?' is':'s are')+' on the register</p>'+
    '<dl class="regf"><div><dt>How they came in</dt><dd>'+imp+'</dd></div>'+(g.fuel?'<div><dt>Fuel</dt><dd>'+esc(g.fuel.pct)+'% '+esc(g.fuel.value)+'</dd></div>':'')+
    (g.engineCc?'<div><dt>Typical engine</dt><dd>'+Number(g.engineCc.cc).toLocaleString("en-NZ")+' cc</dd></div>':'')+
    (g.ratedEconomy?'<div><dt>Rated economy</dt><dd>'+Number(g.ratedEconomy.lPer100km).toFixed(1)+' L/100 km <small>combined; rated, not real-world</small></dd></div>':'')+'</dl>'+
    '<p class="quiet">'+esc(g.period?g.period.charAt(0).toUpperCase()+g.period.slice(1):"")+(g.matchedFrom?' · matched "'+esc(g.matchedFrom)+'" to the model':'')+(g.scope?' · '+esc(g.scope):'')+'<br>'+credit+'</p></section>'}
function render(r,meta){var v=viewOf(meta);if(v&&v.runningCost)r.runningCost=v.runningCost;R=r;var rc=r.runningCost;
  if(!base){base={kmw:rc.kmPerWeek,ckwh:rc.rates?rc.rates.electricityCkwh:0};state.kmw=base.kmw;state.ckwh=base.ckwh}
  var src=safeImg(r.car.image&&r.car.image.url),kind=r.car.body&&r.car.body!=="unknown"?r.car.body:"hatch";
  var pic=src?'<img src="'+esc(src)+'" alt="'+esc(r.car.image.alt)+'" width="1200" height="900">'+chip("Simulated","Render · simulated"):profileSVG(kind,"#C9C6C2",{title:"Drawing of a "+kind+" (not this car)"})+chip("Estimate","Drawing, not this car");
  var flags=(r.redFlags||[]).slice().sort(function(a,b){var o={stop:0,watch:1,ask:2,info:3};return o[a.level]-o[b.level]});
  var li=function(f){return '<li><span class="k '+esc(f.level)+'" aria-hidden="true"></span><span><b>'+esc(f.title)+'</b><small>'+esc(f.why)+'</small></span></li>'};
  var checks=(r.checks||[]).map(function(c){return '<li><span class="box" aria-hidden="true"></span><span><b>'+esc(c.title)+'</b><small>'+esc(c.how)+(c.link?' <a href="'+esc(c.link.url)+'">'+esc(c.link.name)+'</a>':'')+'</small></span></li>'}).join("");
  var miss=(r.notice&&r.notice.missing||[]).map(function(m){return '<span>'+esc(m.label)+'</span>'}).join("");
  $("#root").innerHTML='<div class="card"><div class="top"><div><p class="eyebrow">Car check · '+esc(r.car.source||"")+'</p><h1>'+esc(r.car.name)+'</h1></div>'+chip(r.car.truth)+'</div>'+
    '<div class="hero"><div class="pic">'+pic+'</div><div><p class="sum">'+esc(r.summary)+'</p><p class="stmt">'+esc(r.statement)+'</p></div></div>'+
    regHTML(r.register)+'<section class="cost" aria-labelledby="rc-h"><h2 id="rc-h">Running cost a week · '+esc(rc.region)+'</h2><div id="rc">'+costHTML()+'</div>'+sliders()+
    '<p class="status" id="rc-status">'+status()+'</p><p class="status">Data: '+credits()+'. Not included: '+esc((rc.notIncluded||[]).join(", "))+'.</p></section>'+
    (flags.length?'<h2>Red flags and questions</h2><ul class="list">'+flags.slice(0,3).map(li).join("")+'</ul>':'')+
    '<div class="detail">'+(flags.length>3?'<ul class="list">'+flags.slice(3).map(li).join("")+'</ul>':'')+
      '<h2>Before you pay</h2><ul class="list">'+checks+'</ul>'+
      (miss?'<h2>Notice facts not given · '+esc(r.notice.present)+' of '+esc(r.notice.total)+'</h2><p class="muted small">'+esc(r.notice.note)+'</p><div class="miss">'+miss+'</div>':'<h2>Notice</h2><p>All '+esc(r.notice.total)+' notice facts are given.</p>')+
      '<h2>Is the price fair?</h2><ol class="qs">'+(r.fairPrice.questions||[]).map(function(q){return '<li>'+esc(q)+'</li>'}).join("")+'</ol><p class="note">'+esc(r.fairPrice.note)+'</p></div>'+
    '<div class="actions more"><button class="btn primary" type="button" id="all">See every check</button></div>'+
    '<p class="note">Agent-ready cars (demo) · v'+esc(VERSION)+'</p></div>';
  wire()}
function status(){return state.source==="tool"?"Updated by running_cost for "+state.kmw+" km a week.":state.dirty?"Worked out here from the rates in the result"+(Host.canCallTools()?"; checking with running_cost…":"."):"From running_cost at "+state.kmw+" km a week."}
var timer=0;function wire(){
  var km=$("#kmw"),pw=$("#ckwh");if(!km)return;
  var upd=function(){state.kmw=+km.value;state.ckwh=+pw.value;state.dirty=true;state.source="local";$("#kmw-o").textContent=state.kmw+" km";$("#kmw-h").textContent=Math.round(state.kmw*52).toLocaleString("en-NZ")+" km a year";$("#ckwh-o").textContent=state.ckwh.toFixed(1)+" c/kWh";$("#rc").innerHTML=costHTML();$("#rc-status").textContent=status();Host.size()};
  km.addEventListener("input",upd);pw.addEventListener("input",upd);km.addEventListener("change",ask);pw.addEventListener("change",ask);
  var all=$("#all");if(all)all.addEventListener("click",function(){Host.displayMode("fullscreen").catch(function(){$(".card").classList.add("expanded");Host.size()})})}
function ask(){clearTimeout(timer);timer=setTimeout(function(){
  var rc=R.runningCost,args=R.car.id?{car_id:R.car.id}:{make:R.facts.make,model:R.facts.model,year:R.facts.year,fuel:FUEL[rc.fuel]?rc.fuel:undefined,body:R.car.body||undefined};
  args.km_per_week=state.kmw;args.region=rc.region;if(Math.abs(state.ckwh-base.ckwh)>0.01)args.electricity_c_per_kwh=state.ckwh;
  Object.keys(args).forEach(function(k){if(args[k]==null)delete args[k]});
  Host.modelContext("The buyer moved the running-cost sliders to "+state.kmw+" km a week and "+state.ckwh.toFixed(1)+" c/kWh for charging.",{kmPerWeek:state.kmw,electricityCkwh:state.ckwh});
  if(!Host.canCallTools())return;
  Host.callTool("running_cost",args).then(function(res){var v=viewOf(res&&res._meta),sc=(v&&v.runningCost)||(res&&(res.structuredContent||res));if(!sc||!sc.lines||sc.kmPerWeek!==state.kmw)return;if(!sc.rates)sc.rates=R.runningCost.rates;R.runningCost=sc;state.dirty=false;R.credits=sc.credits||R.credits;state.source="tool";$("#rc").innerHTML=costHTML();$("#rc-status").textContent=status();Host.size()}).catch(function(){var s=$("#rc-status");if(s)s.textContent="Worked out here from the rates in the result."})},250)}
window.VIEW={name:"car-check",modes:["inline","fullscreen"],render:render,
  input:function(a){if(!R)$("#root").innerHTML='<div class="card"><p class="eyebrow">Car check</p><h1>'+esc(a.car_id||[a.year,a.make,a.model].filter(Boolean).join(" ")||"This car")+'</h1><div class="sk" style="height:210px;margin-top:14px"></div></div>'},
  context:function(){Host.size()},
  error:function(t){$("#root").innerHTML='<div class="err"><p style="margin:0">'+esc(t)+'</p></div>'}};
`;

export const CARD_HTML = page("Is this car a good buy?", CSS, BODY, JS);
