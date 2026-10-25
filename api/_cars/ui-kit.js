// Shared parts of the three MCP Apps views (search results, car check, gallery): CSS on the host's style tokens and a small
// bridge to the host. One codebase for Claude, ChatGPT and other MCP Apps hosts:
//  • MCP Apps first (spec 2026-01-26): ui/initialize (with appCapabilities.availableDisplayModes), ui/notifications/tool-input,
//    tool-result, tool-cancelled, host-context-changed, size-changed, ui/request-display-mode, ui/message, ui/open-link,
//    ui/update-model-context and tools/call (only when the host advertises serverTools);
//  • window.openai only as a fallback (toolOutput, callTool, sendFollowUpMessage, requestDisplayMode, openExternal).
// Rules the views keep (OpenAI UI guidelines, Claude MCP Apps design guidelines, 26 Oct 2026): system or host fonts only (no
// custom fonts), host colour tokens with fallbacks, transparent background, no logos, WCAG AA contrast, alt text on every image,
// 44px tap targets, no nested scrolling inline, at most two actions on a card and one per carousel item, skeletons not spinners.
// Images load only from IMG_BASE (declared in the resource's _meta.ui.csp.resourceDomains); anything else is ignored.
import { IMG_BASE, VERSION } from "./tools.js";

export const KIT_CSS = `:root{color-scheme:light dark;
--c-text:var(--color-text-primary,light-dark(#141413,#FAF9F5));--c-text-2:var(--color-text-secondary,light-dark(#3D3D3A,#C2C0B6));--c-text-3:var(--color-text-tertiary,light-dark(#5E5D58,#A8A69E));
--c-surface:var(--color-background-secondary,light-dark(#F5F4ED,#262624));--c-raised:var(--color-background-primary,light-dark(#FFFFFF,#30302E));
--c-line:var(--color-border-tertiary,light-dark(rgba(31,30,29,.15),rgba(222,220,209,.15)));--c-line-2:var(--color-border-secondary,light-dark(rgba(31,30,29,.3),rgba(222,220,209,.3)));
--c-ring:var(--color-ring-primary,light-dark(rgba(20,20,19,.7),rgba(250,249,245,.7)));
--c-danger:var(--color-text-danger,light-dark(#7F2C28,#EE8884));--c-warn:var(--color-text-warning,light-dark(#5A4815,#D1A041));--c-info:var(--color-text-info,light-dark(#3266AD,#80AADD));--c-ok:var(--color-text-success,light-dark(#265B19,#7AB948));
--r-sm:var(--border-radius-sm,6px);--r-md:var(--border-radius-md,8px);--r-lg:var(--border-radius-xl,12px);--bw:var(--border-width-regular,1px);
--f-sans:var(--font-sans,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif);--f-mono:var(--font-mono,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace);
--fs-xs:var(--font-text-xs-size,12px);--fs-sm:var(--font-text-sm-size,14px);--fs-md:var(--font-text-md-size,16px);--fs-h:var(--font-heading-md-size,16px);--fs-hl:var(--font-heading-lg-size,20px);
--accent:light-dark(#492B3E,#E3C6D4);--accent-ink:light-dark(#FFFFFF,#240B21);
--t-sim:light-dark(#6B4C5B,#D7B9C7);--t-est:light-dark(#6B4E24,#DDBB80);--t-src:light-dark(#2F5A42,#93CDAA);--t-pub:light-dark(#7E4615,#F0A961);--t-live:light-dark(#22603F,#86CFA6);--t-you:light-dark(#2F4C6C,#A7C3E6)}
:root[data-theme=light]{color-scheme:light}:root[data-theme=dark]{color-scheme:dark}
*{box-sizing:border-box}html,body{margin:0;background:transparent;color:var(--c-text);font:400 var(--fs-sm)/1.45 var(--f-sans);-webkit-text-size-adjust:100%}
img{display:block;max-width:100%}button{font:inherit;color:inherit}a{color:var(--c-text);text-underline-offset:3px}
.root{padding:var(--pad-t,4px) var(--pad-r,2px) var(--pad-b,6px) var(--pad-l,2px)}
.chip{display:inline-flex;align-items:center;gap:4px;font:600 11px/1.2 var(--f-sans);letter-spacing:.04em;text-transform:uppercase;padding:3px 8px;border-radius:999px;white-space:nowrap;color:var(--tc,var(--t-sim));background:color-mix(in srgb,var(--tc,var(--t-sim)) 13%,transparent)}
.chip[data-truth="Estimate"]{--tc:var(--t-est)}.chip[data-truth="Source"]{--tc:var(--t-src)}.chip[data-truth="Latest published"]{--tc:var(--t-pub)}.chip[data-truth="Live"]{--tc:var(--t-live)}.chip[data-truth="Your data"]{--tc:var(--t-you)}
.muted{color:var(--c-text-2)}.small{font-size:var(--fs-xs)}.mono{font-family:var(--f-mono)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:44px;padding:0 16px;border-radius:var(--r-md);border:var(--bw) solid var(--c-line-2);background:transparent;cursor:pointer;font-weight:600;font-size:var(--fs-sm);text-decoration:none}
.btn.primary{background:var(--accent);color:var(--accent-ink);border-color:transparent}.btn:focus-visible,a:focus-visible,input:focus-visible,[tabindex]:focus-visible{outline:2px solid var(--c-ring);outline-offset:2px}
.btn[disabled]{opacity:.5;cursor:default}.actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
.sk{background:linear-gradient(90deg,var(--c-surface),color-mix(in srgb,var(--c-surface) 55%,transparent),var(--c-surface));background-size:200% 100%;border-radius:var(--r-md)}
@media (prefers-reduced-motion:no-preference){.sk{animation:sk 1.4s ease-in-out infinite}@keyframes sk{0%{background-position:100% 0}100%{background-position:-100% 0}}}
.note{margin:10px 0 0;font-size:var(--fs-xs);color:var(--c-text-2)}.err{padding:14px;border:var(--bw) solid var(--c-line);border-radius:var(--r-lg)}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}`;

// The bridge. Each view defines window.VIEW = { name, modes, render(result, meta), input(args), cancelled(reason), context(ctx) }.
export const KIT_JS = `
var VERSION=${JSON.stringify(VERSION)},IMG_BASE=${JSON.stringify(IMG_BASE)};
var $=function(s,r){return (r||document).querySelector(s)},$$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
var esc=function(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})};
var money=function(n,d){return n==null||!isFinite(n)?"–":"$"+Number(n).toLocaleString("en-NZ",{minimumFractionDigits:d||0,maximumFractionDigits:d||0})};
var kmf=function(n){return n==null?"–":Number(n).toLocaleString("en-NZ")+" km"};
var chip=function(t,label){return '<span class="chip" data-truth="'+esc(t)+'">'+esc(label||t)+'</span>'};
// view-only data a tool puts in its result's _meta (hidden from the model): direct, or wrapped by ChatGPT's toolResponseMetadata
var viewOf=function(m){if(!m)return null;var w=function(x){return x&&x._meta&&x._meta["assembl/view"]};return m["assembl/view"]||w(m.mcp_tool_result)||w(m.call_tool_result)||null};
var safeImg=function(u){return typeof u==="string"&&u.indexOf(IMG_BASE)===0&&!/[\\s"'<>]/.test(u)?u:null};
var Host=(function(){
  var nextId=1,pending={},inHost=window.parent&&window.parent!==window,ctx={},caps={},ready=false,last=null,lastOA=null;
  function send(m){try{window.parent.postMessage(m,"*")}catch(e){}}
  function request(method,params,ms){return new Promise(function(res,rej){if(!inHost)return rej(new Error("no host"));var id=nextId++;pending[id]={res:res,rej:rej};send({jsonrpc:"2.0",id:id,method:method,params:params||{}});setTimeout(function(){if(pending[id]){delete pending[id];rej(new Error("timeout"))}},ms||8000)})}
  function notify(method,params){if(inHost)send({jsonrpc:"2.0",method:method,params:params||{}})}
  function applyCtx(c){if(!c)return;for(var k in c)ctx[k]=c[k];
    var root=document.documentElement;if(c.theme){root.dataset.theme=c.theme;root.style.colorScheme=c.theme}
    if(c.styles&&c.styles.variables){for(var v in c.styles.variables){var val=c.styles.variables[v];if(typeof val==="string"&&/^--[a-z0-9-]+$/i.test(v))root.style.setProperty(v,val)}}
    var s=c.safeAreaInsets;if(s){["t","r","b","l"].forEach(function(x,i){var n=[s.top,s.right,s.bottom,s.left][i];if(typeof n==="number")root.style.setProperty("--pad-"+x,Math.max(2,n)+"px")})}
    if(c.displayMode)root.dataset.mode=c.displayMode;
    if(window.VIEW&&VIEW.context)VIEW.context(ctx)}
  function deliver(r){if(!r)return;last=r;var sc=r.structuredContent;if(r.isError||!sc){VIEW.error(textOf(r)||"The tool didn't return a result.");return}VIEW.render(sc,r._meta||{});size()}
  function textOf(r){var c=r&&r.content;if(!c)return"";if(typeof c==="string")return c;return c.filter(function(b){return b&&b.type==="text"}).map(function(b){return b.text}).join("\\n")}
  window.addEventListener("message",function(e){if(e.source!==window.parent)return;var m=e.data;if(!m||m.jsonrpc!=="2.0")return;
    if(m.id!=null&&pending[m.id]&&("result" in m||"error" in m)){var p=pending[m.id];delete pending[m.id];m.error?p.rej(m.error):p.res(m.result);return}
    switch(m.method){
      case "ui/notifications/tool-input":if(VIEW.input)VIEW.input((m.params&&m.params.arguments)||{});return;
      case "ui/notifications/tool-result":deliver(m.params);return;
      case "ui/notifications/tool-cancelled":VIEW.error("Cancelled"+(m.params&&m.params.reason?": "+m.params.reason:"")+".");return;
      case "ui/notifications/host-context-changed":applyCtx(m.params);size();return;
      case "ui/resource-teardown":send({jsonrpc:"2.0",id:m.id,result:{}});return;
      case "ping":send({jsonrpc:"2.0",id:m.id,result:{}});return}
    if(m.id!=null&&m.method)send({jsonrpc:"2.0",id:m.id,error:{code:-32601,message:"Not supported by this view"}})});
  var lastH=0,lastW=0;function size(){var el=document.getElementById("root");if(!el)return;var r=el.getBoundingClientRect(),h=Math.ceil(r.height),w=Math.ceil(r.width);if(Math.abs(h-lastH)<2&&Math.abs(w-lastW)<2)return;lastH=h;lastW=w;notify("ui/notifications/size-changed",{width:w,height:h})}
  function oa(){return window.openai||null}
  function fromOpenAI(){var o=oa();if(!o)return;if(o.theme)applyCtx({theme:o.theme});if(o.displayMode)applyCtx({displayMode:o.displayMode});if(o.toolOutput&&o.toolOutput!==lastOA){lastOA=o.toolOutput;deliver({structuredContent:o.toolOutput,_meta:o.toolResponseMetadata||{}})}}
  window.addEventListener("openai:set_globals",fromOpenAI);
  if(!(window.parent&&window.parent!==window)&&matchMedia("(prefers-color-scheme: dark)").matches)document.documentElement.dataset.theme="dark";
  function start(){
    if(inHost)request("ui/initialize",{protocolVersion:"2026-01-26",appInfo:{name:"agent-ready-cars-"+VIEW.name,version:VERSION},appCapabilities:{availableDisplayModes:VIEW.modes}},6000)
      .then(function(r){caps=(r&&r.hostCapabilities)||{};applyCtx(r&&r.hostContext);ready=true;notify("ui/notifications/initialized",{});size()}).catch(function(){});
    fromOpenAI();
    if(window.ResizeObserver)new ResizeObserver(size).observe(document.getElementById("root"));
  }
  return {start:start,size:size,ctx:function(){return ctx},
    canCallTools:function(){return !!(caps&&caps.serverTools)||!!(oa()&&oa().callTool)},
    callTool:function(name,args){if(caps&&caps.serverTools)return request("tools/call",{name:name,arguments:args},15000);var o=oa();if(o&&o.callTool)return o.callTool(name,args);return Promise.reject(new Error("no tool access"))},
    message:function(text){if(ready)return request("ui/message",{role:"user",content:[{type:"text",text:text}]}).catch(function(){var o=oa();if(o&&o.sendFollowUpMessage)return o.sendFollowUpMessage({prompt:text})});var o=oa();if(o&&o.sendFollowUpMessage)return o.sendFollowUpMessage({prompt:text});return Promise.reject(new Error("no host"))},
    modelContext:function(text,structured){if(ready)request("ui/update-model-context",{content:[{type:"text",text:text}],structuredContent:structured}).catch(function(){})},
    openLink:function(url){if(!/^https:\\/\\//.test(url))return;var fallback=function(){var o=oa();if(o&&o.openExternal)o.openExternal({href:url,redirectUrl:false});else window.open(url,"_blank","noopener")};if(ready)request("ui/open-link",{url:url}).catch(fallback);else fallback()},
    canFullscreen:function(){var m=ctx.availableDisplayModes;return (m&&m.indexOf("fullscreen")>=0)||!!(oa()&&oa().requestDisplayMode)},
    displayMode:function(mode){if(ready&&ctx.availableDisplayModes&&ctx.availableDisplayModes.indexOf(mode)>=0)return request("ui/request-display-mode",{mode:mode}).then(function(r){applyCtx({displayMode:(r&&r.mode)||ctx.displayMode});return r});var o=oa();if(o&&o.requestDisplayMode)return o.requestDisplayMode({mode:mode}).then(function(){applyCtx({displayMode:mode})});return Promise.reject(new Error("not available"))}};
})();
document.addEventListener("click",function(e){var a=e.target.closest&&e.target.closest("a[href^='https://']");if(!a)return;e.preventDefault();Host.openLink(a.href)});
`;

// one HTML document per view (the host renders it in a sandboxed iframe; everything is inline)
export const page = (title, css, body, js) => `<!doctype html><html lang="en-NZ"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>${title}</title><style>${KIT_CSS}\n${css}</style></head>
<body><div id="root" class="root">${body}</div><script>${KIT_JS}\n${js}\nHost.start();</script></body></html>`;
