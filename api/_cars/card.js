// The MCP Apps view for car_check: ui://cars/car-check.html (mimeType text/html;profile=mcp-app).
// Hosts that support MCP Apps (Claude, ChatGPT and others) render it in a sandboxed iframe and send it the tool result over
// postMessage (ui/initialize → ui/notifications/tool-result). ChatGPT's older window.openai.toolOutput is read as a fallback.
// Self-contained: no network requests, no external fonts or scripts, so it needs no CSP domains.
import { profileSVG } from "./profile.js";
import { VERSION } from "./tools.js";

const CSS = `:root{--paper:#FFFDFB;--chalk:#F5F1F2;--ink:#492B3E;--deep:#240B21;--body:#654A4E;--rose:#916A70;--line:rgba(73,43,62,.14);
--sim:#7A5C6B;--est:#8C6D3F;--src:#3F6A52;--live:#2F7D5B;--pub:#A8642A;--you:#3D5A7A;--stop:#9B3D3A;color-scheme:light}
:root[data-theme=dark]{--paper:#1B0918;--chalk:#2A1426;--ink:#F5F1F2;--deep:#FFFDFB;--body:#D9CDD1;--rose:#B898A0;--line:rgba(245,241,242,.16);--sim:#C8A9B8;--est:#D2AE73;--src:#8CC7A4;--live:#7FC6A0;--pub:#F0A24A;--you:#9EBBE0;--stop:#E79A92;color-scheme:dark}
*{box-sizing:border-box}html,body{margin:0;background:var(--paper);color:var(--body);font:400 14px/1.5 "Instrument Sans",ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
.card{padding:18px 18px 16px;max-width:720px;margin:0 auto}
.mono,.chip,.ev{font-family:"IBM Plex Mono",ui-monospace,SFMono-Regular,Menlo,monospace}
.top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
h1{margin:2px 0 0;font-size:19px;line-height:1.25;font-weight:500;color:var(--deep);letter-spacing:-.2px}
.ev{font-size:11px;color:var(--rose);letter-spacing:.02em}
.chip{display:inline-block;font-size:9.5px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;padding:2px 7px;border-radius:999px;white-space:nowrap;color:var(--c);background:color-mix(in srgb,var(--c) 14%,transparent)}
.c-sim{--c:var(--sim)}.c-est{--c:var(--est)}.c-src{--c:var(--src)}.c-live{--c:var(--live)}.c-pub{--c:var(--pub)}.c-you{--c:var(--you)}
.hero{display:grid;grid-template-columns:150px 1fr;gap:14px;align-items:center;margin:12px 0 4px}
.hero svg{width:100%;height:auto;display:block}
.sum{font-size:15px;color:var(--ink);margin:0}
h2{font:500 10px/1.4 "IBM Plex Mono",ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase;color:var(--rose);margin:16px 0 6px;padding-top:12px;border-top:1px solid var(--line)}
.wf{display:flex;flex-direction:column;gap:6px}.wr{display:grid;grid-template-columns:minmax(96px,32%) 1fr auto;gap:8px;align-items:center;font-size:12.5px;color:var(--ink)}
.tr{position:relative;height:12px;border-radius:4px;background:color-mix(in srgb,var(--ink) 7%,transparent)}.tr i{position:absolute;top:0;bottom:0;border-radius:4px;opacity:.85}
.wr b{font:500 12px "IBM Plex Mono",ui-monospace,monospace;color:var(--deep);min-width:58px;text-align:right}.wr.tot{padding-top:6px;border-top:1px solid var(--line)}
ul{list-style:none;margin:0;padding:0}li{padding:6px 0;border-bottom:1px solid var(--line);display:grid;grid-template-columns:18px 1fr;gap:8px}
li:last-child{border-bottom:0}li b{font-weight:500;color:var(--ink)}li small{display:block;color:var(--body);font-size:12.5px}
.k{width:12px;height:12px;border-radius:50%;margin-top:4px;border:1.5px solid var(--rose)}.k.stop{background:var(--stop);border-color:var(--stop)}.k.watch{border-color:var(--pub);background:color-mix(in srgb,var(--pub) 40%,transparent)}.k.ask{border-color:var(--you)}.k.info{border-color:var(--line)}
.box{width:12px;height:12px;border:1.5px solid var(--ink);border-radius:3px;margin-top:4px}
a{color:var(--ink);text-underline-offset:3px}
.miss{font-size:12.5px}.foot{margin-top:14px;font-size:11px;color:var(--rose)}
.wait{padding:24px 18px;font:12px "IBM Plex Mono",ui-monospace,monospace;color:var(--rose)}
@media(max-width:420px){.hero{grid-template-columns:1fr}.hero svg{max-width:220px}}`;

const SCRIPT = `
var VERSION=${JSON.stringify(VERSION)};
${profileSVG.toString()}
var $=function(s){return document.querySelector(s)};
var esc=function(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})};
var money=function(n,d){return n==null?"–":"$"+Number(n).toLocaleString("en-NZ",{minimumFractionDigits:d||0,maximumFractionDigits:d||0})};
var CHIP={"Simulated":"c-sim","Estimate":"c-est","Source":"c-src","Live":"c-live","Latest published":"c-pub","Your data":"c-you"};
var chip=function(t){return '<span class="chip '+(CHIP[t]||"c-sim")+'">'+esc(t)+'</span>'};
function waterfall(rc){
  var max=rc.totalWeekly||1,acc=0,rows=rc.lines.map(function(l){var x=acc/max*100,w=Math.max(.8,l.weekly/max*100);acc+=l.weekly;
    return '<div class="wr"><span>'+esc(l.label)+'</span><span class="tr"><i style="left:'+x.toFixed(2)+'%;width:'+w.toFixed(2)+'%;background:'+(l.truth==="Estimate"?"var(--est)":l.truth==="Your data"?"var(--you)":"var(--pub)")+'"></i></span><b>'+money(l.weekly,2)+'</b></div>'}).join("");
  return '<div class="wf" role="img" aria-label="Weekly running cost '+money(rc.totalWeekly,2)+'">'+rows+'<div class="wr tot"><span>A week, all in</span><span class="tr"><i style="left:0;width:100%;background:var(--ink)"></i></span><b>'+money(rc.totalWeekly,2)+'</b></div></div>';
}
function render(r){
  if(!r||!r.car){return}
  var rc=r.runningCost||{lines:[],totalWeekly:0},kind=(r.car.render&&r.car.render.kind)||"hatch",paint=(r.car.render&&r.car.render.paint)||"#C8CBCB";
  var flags=(r.redFlags||[]).map(function(f){return '<li><span class="k '+esc(f.level)+'"></span><span><b>'+esc(f.title)+'</b><small>'+esc(f.why)+'</small></span></li>'}).join("");
  var checks=(r.checks||[]).map(function(c){return '<li><span class="box"></span><span><b>'+esc(c.title)+'</b><small>'+esc(c.how)+(c.link?' <a href="'+esc(c.link.url)+'" data-link="'+esc(c.link.url)+'" target="_blank" rel="noopener">'+esc(c.link.name)+'</a>':'')+'</small></span></li>'}).join("");
  var miss=(r.notice&&r.notice.missing||[]).map(function(m){return esc(m.label)}).join(" · ");
  $("#root").innerHTML='<div class="card"><div class="top"><div><div class="ev">car_check · '+esc(r.car.source||"")+'</div><h1>'+esc(r.car.name)+'</h1></div>'+chip(r.car.truth)+'</div>'+
    '<div class="hero">'+profileSVG(kind,paint,{title:r.car.name})+'<div><p class="sum">'+esc(r.summary)+'</p><p class="ev">'+esc(r.statement)+'</p></div></div>'+
    '<h2>Running cost · '+esc(rc.kmPerWeek)+' km a week · '+esc(rc.place||"")+'</h2>'+waterfall(rc)+
    '<p class="ev">'+rc.lines.map(function(l){return esc(l.label)+": "+esc(l.truth)+(l.period?" · "+esc(l.period):"")}).join(" &nbsp;/&nbsp; ")+'</p>'+
    (flags?'<h2>Red flags and questions</h2><ul>'+flags+'</ul>':'')+
    '<h2>Before you pay</h2><ul>'+checks+'</ul>'+
    (miss?'<h2>Notice fields not given · '+esc(r.notice.present)+' of '+esc(r.notice.total)+'</h2><p class="miss">'+miss+'</p>':'<h2>Notice</h2><p class="miss">All '+esc(r.notice&&r.notice.total)+' notice fields present.</p>')+
    '<p class="foot">'+esc(r.fairPrice&&r.fairPrice.note)+' assembl lab · Agent-ready cars (demo) · v'+VERSION+'</p></div>';
  size();
}
var nextId=1,pending={},inHost=window.parent&&window.parent!==window;
function send(m){try{window.parent.postMessage(m,"*")}catch(e){}}
function rpc(method,params){return new Promise(function(res,rej){var id=nextId++;pending[id]={res:res,rej:rej};send({jsonrpc:"2.0",id:id,method:method,params:params});setTimeout(function(){if(pending[id]){delete pending[id];rej(new Error("timeout"))}},5000)})}
function notify(method,params){send({jsonrpc:"2.0",method:method,params:params||{}})}
var lastH=0;function size(){if(!inHost)return;var el=document.getElementById("root"),h=Math.ceil(el.getBoundingClientRect().height);if(Math.abs(h-lastH)<2)return;lastH=h;notify("ui/notifications/size-changed",{height:h})}
function theme(ctx){if(ctx&&ctx.theme)document.documentElement.dataset.theme=ctx.theme}
window.addEventListener("message",function(e){var m=e.data;if(!m||m.jsonrpc!=="2.0")return;
  if(m.id!=null&&pending[m.id]&&("result" in m||"error" in m)){var p=pending[m.id];delete pending[m.id];m.error?p.rej(m.error):p.res(m.result);return}
  if(m.method==="ui/notifications/tool-result"){render(m.params&&m.params.structuredContent);return}
  if(m.method==="ui/notifications/tool-input"){if(!$(".card"))$("#root").innerHTML='<p class="wait">Checking the notice for '+esc((m.params&&m.params.arguments&&(m.params.arguments.car_id||[m.params.arguments.make,m.params.arguments.model].join(" ")))||"this car")+'</p>';return}
  if(m.method==="ui/notifications/host-context-changed"){theme(m.params);return}
  if(m.id!=null&&m.method){send({jsonrpc:"2.0",id:m.id,result:{}})}
});
document.addEventListener("click",function(e){var a=e.target.closest&&e.target.closest("a[data-link]");if(!a||!inHost)return;e.preventDefault();rpc("ui/open-link",{url:a.dataset.link}).catch(function(){window.open(a.dataset.link,"_blank","noopener")})});
if(matchMedia("(prefers-color-scheme: dark)").matches)document.documentElement.dataset.theme="dark";
if(inHost)rpc("ui/initialize",{protocolVersion:"2026-01-26",appInfo:{name:"agent-ready-cars-card",title:"Is this car a good buy?",version:VERSION},appCapabilities:{}}).then(function(r){theme(r&&r.hostContext);notify("ui/notifications/initialized",{});size()}).catch(function(){});
function fromOpenAI(){var o=window.openai;if(o&&o.toolOutput)render(o.toolOutput);if(o&&o.theme)theme({theme:o.theme})}
window.addEventListener("openai:set_globals",fromOpenAI);fromOpenAI();
if(window.ResizeObserver)new ResizeObserver(size).observe(document.getElementById("root"));
`;

export const CARD_HTML = `<!doctype html><html lang="en-NZ"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Is this car a good buy?</title><style>${CSS}</style></head>
<body><div id="root"><p class="wait">Waiting for the car check…</p></div><script>${SCRIPT}</script></body></html>`;
