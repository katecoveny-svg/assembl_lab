(()=>{
"use strict";
// The English exam machine (Year 9): pick 1–3 texts from a library (or bring your own), then
// Read → Quick check → Memorise → Short answer → Long answer, sit a practice paper in a format you set,
// and tag an unseen text technique → effect → link. Content and copyright notes live in y9english-texts.js.
// Everything is saved in this browser only (localStorage, wrapped in try/catch).
const K=window.StudyKit||null, D=window.Y9E, MID="y9english";
const TEXTS=D.TEXTS, UNSEEN=D.UNSEEN;
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let muted=false;try{muted=localStorage.getItem("studysound")==="off"}catch(e){}
const sfx=n=>{if(muted)return;try{K&&K.sfx&&K.sfx(n)}catch(e){}};
const burst=el=>{try{K&&K.burst&&el&&K.burst(el)}catch(e){}};
function nzDate(){try{return new Date().toLocaleDateString("en-CA",{timeZone:"Pacific/Auckland"})}catch(e){return new Date().toISOString().slice(0,10)}}
function logStudy(kind){try{const L=JSON.parse(localStorage.getItem("studylog")||"[]");L.push({d:nzDate(),m:MID,kind,t:Date.now()});localStorage.setItem("studylog",JSON.stringify(L.slice(-800)))}catch(e){}}

/* ---------------- storage (this browser only) ---------------- */
const KEY="study-y9english-v1";
const S={sel:[],prog:{},text:{},draft:{},missed:{},plan:{},tags:{},fmt:null,best:null,byo:null,tel:[],examDate:"",lib:"all"};
try{const o=JSON.parse(localStorage.getItem(KEY)||"null");if(o&&typeof o==="object")for(const k in o)if(k in S)S[k]=o[k]}catch(e){}
S.sel=(Array.isArray(S.sel)?S.sel:[]).filter(id=>TEXTS[id]).slice(0,3);
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
function prog(id){return S.prog[id]||(S.prog[id]={read:false,best:null,total:null,mem:false,sa:false,la:false})}
function steps5(id){const p=prog(id);return [p.read,p.best!=null&&p.total&&p.best/p.total>=0.8,p.mem,p.sa,p.la].filter(Boolean).length}
function draft(k,v){if(v===undefined)return S.draft[k]||"";S.draft[k]=v;save()}

/* ---------------- helpers ---------------- */
function h(tag,attrs,...kids){const el=document.createElement(tag);
  if(attrs)for(const a in attrs){const v=attrs[a];if(v==null||v===false)continue;
    if(a==="class")el.className=v;else if(a==="text")el.textContent=v;else if(a==="html")el.innerHTML=v;
    else if(a.slice(0,2)==="on")el.addEventListener(a.slice(2),v);else el.setAttribute(a,v===true?"":v)}
  kids.flat(Infinity).forEach(c=>{if(c==null||c===false)return;el.appendChild(typeof c==="string"?document.createTextNode(c):c)});return el}
const $=s=>document.querySelector(s);
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
let timers=[];function clearTimers(){timers.forEach(t=>clearInterval(t));timers=[]}
const KIND={poem:"Poem",story:"Short story"};
const STATUS={pd:["Full text included","public domain","pd"],original:["Original text","written for assembly","og"],summary:["Summary only","bring your class copy","sum"]};
function statusChip(st,small){const s=STATUS[st];return h("span",{class:"ye-st ye-st-"+s[2]},h("b",{text:s[0]}),small?null:h("span",{text:" · "+s[1]}))}
const CUBE={poem:["#D9CBF2","#C3AFEA","#AE96DE"],story:["#BFE8D6","#A3DCC3","#86CFAF"],og:["#F7E7A6","#F0D97F","#E5C95E"],blush:["#F3B8C8","#EC9DB2","#E0839C"],sky:["#BFDDF5","#A3CBEE","#86B8E4"]};
// a small isometric pastel cube (the assembly bench look)
function cube(x,y,s,c){const w=s*0.866,top=`${x},${y} ${x+w},${y+s/2} ${x},${y+s} ${x-w},${y+s/2}`,l=`${x-w},${y+s/2} ${x},${y+s} ${x},${y+2*s} ${x-w},${y+1.5*s}`,r=`${x+w},${y+s/2} ${x},${y+s} ${x},${y+2*s} ${x+w},${y+1.5*s}`;
  return `<polygon points="${top}" fill="${c[0]}"/><polygon points="${l}" fill="${c[1]}"/><polygon points="${r}" fill="${c[2]}"/><polyline points="${x-w},${y+s/2} ${x},${y} ${x+w},${y+s/2}" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1.2"/>`}
const cubeIcon=k=>`<svg viewBox="0 0 40 46" aria-hidden="true">${cube(20,4,19,CUBE[k]||CUBE.blush)}</svg>`;

/* ---------------- CSS ---------------- */
const css=`
:root{--as-bg:#F8F4EF}
@supports (overflow:clip){.ye .bench{overflow:clip}}
.ye-tabs.texts button[aria-selected="true"]{background:var(--acc);border-color:var(--acc)}
html,body{background:#F8F4EF}
.ye .mh{align-items:center}
.ye-head{position:relative}
.ye-lede{margin:6px 0 0;color:var(--as-muted);font-size:15px;max-width:52ch}
.ye-cubes{width:120px;flex:none;margin-left:auto}
.ye-cubes svg{width:100%;height:auto}
@media (max-width:640px){.ye-cubes{display:none}}
.ye-days{font:600 13px var(--as-font);background:var(--as-card);border:1px solid var(--as-line);border-radius:999px;padding:7px 12px;color:var(--as-ink)}
.ye-days b{color:var(--acc-deep)}
#ye-stage{display:grid;gap:16px;min-width:0;grid-template-columns:minmax(0,1fr)}
#ye-stage>*{min-width:0}
#ye-allen:empty{display:none}
.ye h2{margin:0;font:600 22px/1.2 var(--as-display);color:var(--as-ink);letter-spacing:-.01em;text-wrap:balance}
.ye h3{margin:0;font:600 17px/1.25 var(--as-display);color:var(--as-ink)}
.ye p{margin:0}
.ye .card{display:grid;gap:12px;min-width:0}
.ye .card h3{margin:0;font:600 17px/1.25 var(--as-display);letter-spacing:0;text-transform:none;color:var(--as-ink);display:block}
.ye .card h3.cap{font:600 12px var(--as-font);letter-spacing:.06em;text-transform:uppercase;color:var(--as-muted)}
.ye-mono{font:500 11.5px var(--as-mono);letter-spacing:.06em;text-transform:uppercase;color:var(--as-muted)}
.ye-muted{color:var(--as-muted)}.ye-small{font-size:14px}
.ye-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.ye-between{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;justify-content:space-between}
.ye .btn{min-height:44px}
.ye .btn.full{width:100%}
.ye .btn.ghost{background:transparent}
.ye .btn.ink{background:var(--as-ink);border-color:var(--as-ink);color:#fff}
.ye .btn.ink:hover{background:var(--as-plum);border-color:var(--as-plum)}
.ye .btn:disabled{opacity:.45;cursor:default}
.ye-note{background:#FFF6DC;color:#5A4300;border-radius:14px;padding:10px 14px;font-size:14px}
.ye-note b{color:inherit}
.ye-st{display:inline-flex;align-items:center;gap:2px;font:500 12px var(--as-font);border-radius:999px;padding:3px 10px;color:var(--as-ink);white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}
.ye-st b{font-weight:600}
.ye-st-pd{background:#E3F0FB}.ye-st-og{background:#FBF1CC}.ye-st-sum{background:#FCE3D3}
.ye-kind{font:500 11.5px var(--as-mono);letter-spacing:.05em;text-transform:uppercase;color:var(--as-muted)}
/* library */
.ye-filters{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding-bottom:2px}
.ye-filters::-webkit-scrollbar{display:none}
.ye-filters button,.ye-tabs button{appearance:none;flex:none;min-height:40px;border:1.5px solid var(--as-line);background:var(--as-card);color:var(--as-text);border-radius:999px;padding:6px 14px;font:600 13.5px var(--as-font);cursor:pointer}
.ye-filters button[aria-pressed="true"],.ye-tabs button[aria-selected="true"]{background:var(--as-ink);border-color:var(--as-ink);color:#fff}
.ye-tabs{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding-bottom:2px}
.ye-tabs::-webkit-scrollbar{display:none}
.ye-tabs .tick{color:var(--as-mint);margin-left:5px}
.ye-tabs button[aria-selected="true"] .tick{color:#BFE8D6}
.ye-lib{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px}
.ye-tcard{position:relative;display:grid;grid-template-rows:auto auto 1fr auto;gap:8px;border:1.5px solid var(--as-line);border-radius:22px;background:var(--as-card);padding:14px 14px 12px;min-width:0;transition:border-color .2s ease,box-shadow .2s ease,transform .2s ease}
.ye-tcard:hover{border-color:var(--as-line2);box-shadow:var(--as-shadow);transform:translateY(-1px)}
.ye-tcard.on{border-color:var(--acc);box-shadow:0 0 0 3px var(--acc-soft)}
.ye-tcard .top{display:flex;gap:10px;align-items:flex-start}
.ye-tcard .ic{width:34px;flex:none}
.ye-tcard .ic svg{width:100%;height:auto;display:block}
.ye .ye-tcard h3{font-size:18px}
.ye-tcard .by{font-size:13.5px;color:var(--as-muted)}
.ye-tcard .bl{font-size:14px;color:var(--as-text)}
.ye-tcard .acts{display:flex;gap:8px;flex-wrap:wrap}
.ye-tcard .acts .btn{flex:1 1 auto;padding:8px 12px;font-size:13.5px}
.ye-tcard .add[aria-pressed="true"]{background:var(--acc);border-color:var(--acc);color:#fff}
.ye-bar{height:6px;border-radius:9px;background:var(--as-soft);overflow:hidden}
.ye-bar>i{display:block;height:100%;background:var(--as-mint);border-radius:9px}
.ye-tray{position:sticky;bottom:calc(max(14px,env(safe-area-inset-bottom,0px)) + 70px);z-index:5;display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;justify-content:space-between;background:var(--as-plum);color:#fff;border-radius:20px;padding:10px 12px 10px 16px;box-shadow:0 18px 40px -20px rgba(36,11,33,.6)}
.ye-tray p{color:#fff;font-size:14px}
.ye-tray .btn{background:#fff;color:var(--as-plum);border-color:#fff}
.ye-tray .btn.ghost{background:transparent;color:#fff;border-color:rgba(255,255,255,.4)}
.ye-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
.ye-tile{appearance:none;text-align:left;display:grid;gap:6px;border:1.5px solid var(--as-line);background:var(--as-card);border-radius:22px;padding:14px 16px;cursor:pointer;color:var(--as-ink);font:inherit;min-width:0}
.ye-tile:hover{border-color:var(--acc-line);background:var(--acc-soft)}
.ye-tile b{font:600 17px var(--as-display)}
.ye-tile span{font-size:14px;color:var(--as-muted)}
/* read */
ol.ye-sum{margin:0;padding-left:1.3em;display:grid;gap:8px;font-size:16px;line-height:1.5;color:var(--as-ink)}
.ye-facts{display:grid;grid-template-columns:1fr;gap:12px}
@media (min-width:700px){.ye-facts{grid-template-columns:1fr 1fr}}
.ye-fact{border-left:3px solid var(--acc-tint);padding:2px 0 2px 12px}
.ye-fact.poem{border-left-color:#C3AFEA}.ye-fact.story{border-left-color:#A3DCC3}
.ye-fact h4{margin:0 0 3px;font:500 11.5px var(--as-mono);letter-spacing:.06em;text-transform:uppercase;color:var(--as-muted)}
.ye-fact p{font-size:15px;color:var(--as-ink)}
.ye details{border:1px solid var(--as-line);border-radius:16px;background:var(--as-card);padding:0 14px}
.ye details>summary{min-height:48px;display:flex;align-items:center;gap:8px;font:600 15px var(--as-font);color:var(--as-ink);cursor:pointer;list-style:none}
.ye details>summary::-webkit-details-marker{display:none}
.ye details>summary::before{content:"+";font:500 15px var(--as-mono);color:var(--acc-deep);width:14px;flex:none}
.ye details[open]>summary::before{content:"–"}
.ye details>div{padding:0 0 14px;display:grid;gap:10px}
.ye-text{font-size:17px;line-height:1.65;color:var(--as-ink);max-width:68ch}
.ye-text p{margin:0 0 .9em}
.ye-text .brk{text-align:center;color:var(--as-muted);letter-spacing:.4em}
.ye-poem{font-size:17px;line-height:1.7;color:var(--as-ink);counter-reset:none}
.ye-poem .ln{display:grid;grid-template-columns:2.4em minmax(0,1fr);gap:4px}
.ye-poem .ln i{font:500 11px/2.3 var(--as-mono);color:var(--as-muted);font-style:normal;text-align:right;padding-right:8px}
.ye-poem .sp{height:.8em}
/* quiz */
.ye-qhead{display:flex;justify-content:space-between;gap:8px;font:500 13px var(--as-font);color:var(--as-muted);font-variant-numeric:tabular-nums}
.ye-dots{display:flex;gap:4px;flex-wrap:wrap}
.ye-dots i{width:10px;height:10px;border-radius:50%;background:var(--as-line)}
.ye-dots i.r{background:var(--as-mint)}.ye-dots i.w{background:var(--as-warn)}.ye-dots i.cur{outline:2px solid var(--as-ink);outline-offset:1px}
.ye-q{font:600 19px/1.35 var(--as-display);color:var(--as-ink)}
.ye-opts{display:grid;gap:8px}
.ye-opt{appearance:none;text-align:left;min-height:54px;padding:10px 14px;border-radius:16px;border:1.5px solid var(--as-line2);background:var(--as-card);font:500 16px/1.35 var(--as-font);color:var(--as-ink);display:flex;gap:12px;align-items:center;cursor:pointer}
.ye-opt:hover:not(:disabled){border-color:var(--acc-line);background:var(--acc-soft)}
.ye-opt .k{font:500 12px var(--as-mono);color:var(--as-muted);width:18px;flex:none}
.ye-opt.right{border-color:var(--as-mint);background:var(--as-mintsoft)}
.ye-opt.wrong{border-color:var(--as-warn);background:#FFF0EB}
.ye-opt:disabled{cursor:default}
.ye-fb{border-radius:14px;padding:10px 14px;font:600 15px var(--as-font)}
.ye-fb span{display:block;font-weight:400;color:var(--as-ink);margin-top:3px}
.ye-fb.right{background:var(--as-mintsoft);color:var(--as-mintink)}
.ye-fb.wrong{background:#FFF0EB;color:var(--as-warn)}
.ye-srcchip{justify-self:start;font:600 12px var(--as-font);border-radius:999px;padding:3px 10px;background:var(--as-soft);color:var(--as-ink)}
.ye-score{font:600 52px/1 var(--as-display);color:var(--as-ink);font-variant-numeric:tabular-nums}
.ye-missed{margin:0;padding-left:1.1em;display:grid;gap:6px;font-size:14px}
/* memorise */
.ye textarea,.ye input[type=text],.ye input[type=date]{width:100%;font:400 16px/1.45 var(--as-font);color:var(--as-ink);background:#FFFDFB;border:1.5px solid var(--as-line2);border-radius:14px;padding:10px 12px}
.ye textarea{min-height:90px;resize:vertical}
.ye textarea.big{min-height:200px}
.ye input[type=date]{max-width:220px}
.ye-seg{display:flex;gap:4px;background:var(--as-soft);border-radius:14px;padding:4px;flex-wrap:wrap}
.ye-seg button{appearance:none;flex:1 1 auto;min-height:42px;border:0;border-radius:11px;background:transparent;font:600 14px var(--as-font);color:var(--as-text);cursor:pointer;padding:6px 10px}
.ye-seg button[aria-pressed="true"]{background:var(--as-card);color:var(--as-ink);box-shadow:0 1px 3px rgba(36,11,33,.14)}
.ye-mem{font-size:18px;line-height:2.1;overflow-wrap:anywhere;color:var(--as-ink)}
.ye-mem .line{display:block;min-height:1em}
.ye-mem .gap{display:block;height:.8em}
.ye-w{appearance:none;border:0;background:transparent;padding:1px 3px;margin:0 1px;border-radius:6px;font:inherit;line-height:1.4;color:inherit;cursor:pointer}
.ye-w.hid{font-family:var(--as-mono);color:var(--acc-deep);background:var(--acc-soft)}
.ye-w.blank{display:inline-block;border-bottom:2px solid var(--acc);border-radius:0;color:transparent}
.ye-w.shown{background:#FFF1C7;color:#5A4300}
.ye-built{display:grid;gap:6px}
.ye-built div{padding:8px 12px;border-radius:12px;background:var(--as-mintsoft);color:var(--as-ink)}
.ye-lineopt{appearance:none;text-align:left;min-height:50px;padding:10px 14px;border-radius:14px;border:1.5px solid var(--as-line2);background:var(--as-card);font:400 15.5px var(--as-font);color:var(--as-ink);cursor:pointer}
.ye-lineopt.shake{border-color:var(--as-warn);animation:yeshake .3s}
@keyframes yeshake{25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
/* writing */
.ye-field{display:grid;gap:5px}
.ye-field label{font:600 15px var(--as-font);color:var(--as-ink)}
.ye-field .hint{font-size:13.5px;color:var(--as-muted)}
.ye-timer{display:flex;align-items:center;gap:10px;justify-content:space-between;background:var(--as-soft);border-radius:16px;padding:6px 6px 6px 14px}
.ye-timer .clock{font:500 26px var(--as-mono);font-variant-numeric:tabular-nums;color:var(--as-ink)}
.ye-timer.end .clock{color:var(--as-warn)}
.ye-choices{display:grid;gap:6px}
.ye-choice{appearance:none;text-align:left;min-height:46px;padding:9px 14px;border-radius:14px;border:1.5px solid var(--as-line2);background:var(--as-card);font:500 15px var(--as-font);color:var(--as-ink);cursor:pointer}
.ye-choice[aria-pressed="true"]{border-color:var(--acc);background:var(--acc-soft)}
.ye-model{background:var(--acc-soft);border-radius:14px;padding:12px 14px;line-height:1.6;color:var(--as-ink);font-size:15px}
.ye-model b{color:var(--acc-deep)}
.ye-stepn{font:500 12px var(--as-mono);color:var(--acc-deep);letter-spacing:.04em}
.ye-check label{display:flex;gap:10px;align-items:flex-start;font-size:15px;padding:4px 0;cursor:pointer}
.ye-check input{width:20px;height:20px;margin:2px 0 0;accent-color:var(--as-mint);flex:none}
/* paper */
.ye-stepper{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px 0;border-top:1px solid var(--as-line)}
.ye-stepper:first-of-type{border-top:0}
.ye-stepper .lab b{display:block;font:600 15px var(--as-font);color:var(--as-ink)}
.ye-stepper .lab span{font-size:13.5px;color:var(--as-muted)}
.ye-num{display:flex;align-items:center;gap:4px;background:var(--as-soft);border-radius:999px;padding:3px}
.ye-num button{appearance:none;width:38px;height:38px;border-radius:50%;border:0;background:var(--as-card);font:600 18px var(--as-font);color:var(--as-ink);cursor:pointer;box-shadow:0 1px 2px rgba(36,11,33,.12)}
.ye-num output{min-width:2.2ch;text-align:center;font:600 17px var(--as-display);font-variant-numeric:tabular-nums}
.ye-pbar{position:sticky;top:8px;z-index:4;display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;background:var(--as-card);border:1px solid var(--as-line);border-radius:18px;padding:8px 8px 8px 14px;box-shadow:var(--as-shadow)}
.ye-pbar .sec{font:600 14px var(--as-font);color:var(--as-ink)}
.ye-pbar .clock{font:500 18px var(--as-mono);font-variant-numeric:tabular-nums;color:var(--as-ink)}
.ye-pbar.over .clock{color:var(--as-warn)}
.ye-res{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px}
.ye-res div{background:var(--as-soft);border-radius:16px;padding:10px 12px;display:grid;gap:2px}
.ye-res span{font:600 11px var(--as-font);letter-spacing:.05em;text-transform:uppercase;color:var(--as-muted)}
.ye-res b{font:600 22px var(--as-display);color:var(--as-ink);font-variant-numeric:tabular-nums}
/* unseen */
.ye-passage{font-size:17px;line-height:1.75;color:var(--as-ink);white-space:pre-wrap;max-width:68ch;overflow-wrap:break-word}
.ye-tag{appearance:none;display:inline;border:0;padding:1px 2px;margin:0;border-radius:5px;font:inherit;line-height:inherit;color:inherit;background:#FFF1C7;box-shadow:inset 0 -2px 0 #E9C75A;cursor:pointer;text-align:left;white-space:pre-wrap}
.ye-tag:hover{background:#FFE8A3}
.ye-tag.done{background:var(--as-mintsoft);box-shadow:inset 0 -2px 0 var(--as-mint)}
.ye-tag.cur{outline:2px solid var(--acc);outline-offset:1px}
.ye-plain .ye-tag:not(.done){background:transparent;box-shadow:none}
.ye-panel{border:1.5px solid var(--acc-line);background:var(--acc-soft)}
.ye-panel .ye-quote{font:500 16px/1.45 var(--as-font);color:var(--as-ink);background:var(--as-card);border-radius:12px;padding:8px 12px}
.ye-tstep{display:grid;gap:6px}
.ye-tstep .ye-choice.no{border-color:var(--as-warn);animation:yeshake .3s}
.ye-tstep .ye-choice.yes{border-color:var(--as-mint);background:var(--as-mintsoft)}
.ye-stack{display:grid;gap:8px;margin:0;padding:0;list-style:none}
.ye-stack li{background:var(--as-card);border:1px solid var(--as-line);border-left:4px solid var(--as-mint);border-radius:12px;padding:8px 12px;font-size:14.5px;color:var(--as-ink)}
.ye-count{font:600 13px var(--as-font);background:var(--as-soft);border-radius:999px;padding:4px 10px;color:var(--as-ink)}
/* bring your own: feature finder */
.ye-find{display:grid;gap:8px}
.ye-find .hit{display:grid;gap:6px;background:var(--as-soft);border-radius:14px;padding:10px 12px}
.ye-find mark{background:#FFE8A3;color:inherit;border-radius:4px;padding:0 2px}
.ye-find .hit p{font-size:15px;color:var(--as-ink)}
.ye-starters{display:flex;flex-wrap:wrap;gap:6px}
.ye-starters button{appearance:none;border:1px dashed var(--as-line2);background:var(--as-card);border-radius:999px;padding:5px 10px;font:500 13px var(--as-font);color:var(--as-ink);cursor:pointer;min-height:34px}
/* plan + glossary */
.ye-plan{list-style:none;margin:0;padding:0;display:grid;gap:4px}
.ye-plan label{display:grid;grid-template-columns:24px 52px minmax(0,1fr);gap:8px;align-items:start;padding:7px 4px;border-radius:10px;cursor:pointer;font-size:15px;line-height:1.4}
.ye-plan input{width:20px;height:20px;margin:1px 0 0;accent-color:var(--as-mint)}
.ye-plan .t{font:500 13px var(--as-mono);color:var(--as-muted);padding-top:2px}
.ye-plan li.done .what{text-decoration:line-through;color:var(--as-muted)}
dl.ye-gl{margin:0;display:grid;grid-template-columns:minmax(0,1fr);gap:2px}
@media (min-width:700px){dl.ye-gl{grid-template-columns:minmax(0,12em) minmax(0,1fr);column-gap:16px}}
dl.ye-gl dt{font:600 15px var(--as-font);color:var(--as-ink);padding-top:8px}
dl.ye-gl dd{margin:0;color:var(--as-text);font-size:15px;padding:0 0 8px;border-bottom:1px solid var(--as-line)}
@media (min-width:700px){dl.ye-gl dt{border-bottom:1px solid var(--as-line);padding-bottom:8px}dl.ye-gl dd{padding-top:8px}}
.ye-src{margin:0;padding-left:1.1em;display:grid;gap:6px;font-size:14px}
.ye-src a{color:var(--as-ink)}
.ye a{color:var(--acc-deep)}
@media (prefers-reduced-motion:reduce){.ye-lineopt.shake,.ye-tstep .ye-choice.no{animation:none}.ye-tcard{transition:none}}
@media (max-width:600px){.ye h2{font-size:20px}.ye-q{font-size:18px}.ye-text,.ye-poem,.ye-passage{font-size:16.5px}.ye-tray{bottom:calc(max(14px,env(safe-area-inset-bottom,0px)) + 66px)}}
@media print{.crumbs,header.mh,nav.steps,.prog,footer,.ye-tray,.ye-pbar{display:none!important}.bench{border:0;box-shadow:none}}
`;

/* ---------------- shell ---------------- */
const RAIL=[["home","Choose texts","1"],["study","Study","2"],["paper","Exam paper","3"],["unseen","Unseen text","4"],["byo","Your own text","5"],null,["plan","Tonight's plan","☑"],["kupu","Terms & kupu","Aa"]];
const RAILK=RAIL.filter(Boolean);
let ui={v:"home",id:null,tab:"read"};
const app=document.getElementById("app");
let allen=null;
function allenSetup(){if(!K||!K.companion)return;try{const nav=$("nav.steps"),slot=$("#ye-allen");allen=K.companion(nav);
  let mq=null;try{mq=matchMedia("(max-width:820px)")}catch(e){}
  const place=()=>{const t=mq&&mq.matches?slot:nav;if(allen.el.parentNode!==t)t.appendChild(allen.el)};place();try{mq&&mq.addEventListener("change",place)}catch(e){}
  const b=$("#ye-al"),sync=()=>{const L=K.allen.load();b.setAttribute("aria-pressed",L.minimal?"true":"false")};sync();
  b.onclick=()=>{const L=K.allen.load();L.minimal=!L.minimal;K.allen.save(L);sync();allen.render();sfx("pop")}}catch(e){allen=null}}
function say(html,ms){try{allen&&allen.speak(html,ms||4200)}catch(e){}}
function cheer(ok){try{const before=K&&K.allen?K.allen.state().has:undefined;allen&&allen.react(ok,before)}catch(e){}}

function shell(){const st=document.createElement("style");st.textContent=css;document.head.appendChild(st);
  try{if(K){document.documentElement.style.setProperty("--acc",K.accentFor(MID));document.documentElement.style.setProperty("--acc-tint",K.tintFor(MID))}}catch(e){}
  const cubes=`<svg viewBox="0 0 120 84" aria-hidden="true">${cube(38,22,18,CUBE.story)}${cube(82,22,18,CUBE.poem)}${cube(60,8,18,CUBE.blush)}${cube(60,44,14,CUBE.og)}</svg>`;
  app.innerHTML=`<div class="wrap ye">
  <div class="crumbs">${K&&K.lockup?`<a class="as-lock" href="../index.html" aria-label="assembly, by assembl: all study machines">${K.lockup}</a>`:""}<a class="as-back" href="../index.html">← All study machines</a><span>English · Year 9 exam practice</span></div>
  <header class="mh ye-head"><div><div class="eyebrow">English · Year 9</div><h1>The English exam machine</h1><p class="ye-lede">Pick the texts in your exam. Read them, quiz yourself, memorise lines, then sit a practice paper.</p></div>
    <div class="ye-cubes">${cubes}</div>
    <div class="mhr"><span id="ye-days"></span><button class="btn snd" type="button" id="ye-snd"></button>${K&&K.companion?`<button class="btn al-min" type="button" id="ye-al" aria-pressed="false">Tiny Allen</button>`:""}</div></header>
  <section class="bench" aria-label="The English exam machine">
    <nav class="steps" aria-label="Sections"><div class="fig">EXAM PRACTICE</div><h2>Your exam</h2><div id="ye-rail" style="display:contents"></div></nav>
    <div class="prog" aria-hidden="true"><i id="ye-prog"></i></div>
    <div class="stage"><div id="ye-stage" aria-live="polite"></div><div id="ye-allen"></div></div>
  </section>
  <footer>
    <p><span class="truth">Public domain</span>Full texts are included only for works first published before 1929 by writers who died long ago: Katherine Mansfield, Wilfred Owen and Robert Frost.</p>
    <p><span class="truth">Original</span>Texts marked Original were written for assembly.</p>
    <p><span class="truth">Summary</span>Texts still in copyright get our own summary, facts and questions, with no quoted lines. Read the real text in your class copy or at the link given. Your class copy wins if anything differs.</p>
    <p>Not made by or endorsed by NZQA, the Ministry of Education, the writers or their publishers. Your school sets the real exam format. Progress and anything you paste stay in this browser only.</p>
    ${K&&K.lockup?`<p class="as-foot">${K.lockup}<span>assembly is made by assembl in Aotearoa.</span></p>`:`<p>assembly is made by assembl in Aotearoa.</p>`}
  </footer></div>`;
  const rail=$("#ye-rail");
  RAIL.forEach(r=>{if(!r)return;const b=h("button",{class:"step",type:"button","data-go":r[0]},h("span",{class:"n",text:r[2]}),r[1]);
    b.onclick=()=>{sfx("whoosh");go({v:r[0]})};rail.appendChild(b)});
  const snd=$("#ye-snd");const showSnd=()=>{snd.textContent=muted?"Sound off":"Sound on";snd.setAttribute("aria-pressed",String(!muted))};showSnd();
  snd.onclick=()=>{muted=!muted;try{localStorage.setItem("studysound",muted?"off":"on")}catch(e){}showSnd();sfx("pop")};
}
function daysChip(){const el=$("#ye-days");if(!el)return;el.className="";el.innerHTML="";if(!S.examDate)return;
  const d=Math.ceil((new Date(S.examDate+"T09:00:00")-new Date())/864e5);if(!isFinite(d))return;
  el.className="ye-days";el.innerHTML=d>1?`Exam in <b>${d} days</b>`:d===1?`Exam <b>tomorrow</b>`:d===0?`Exam <b>today</b>`:`Exam done`}

function go(v){ui=Object.assign({v:ui.v},v);if(v.v!==undefined&&v.v!==ui.v)ui.v=v.v;clearTimers();render();
  try{const b=$(".bench");if(b&&b.getBoundingClientRect().top<0)b.scrollIntoView({block:"start"})}catch(e){}}
function stage(){return $("#ye-stage")}
function toTop(el){try{el=el||stage();if(el.getBoundingClientRect().top<0)el.scrollIntoView({block:"start"})}catch(e){}}
function render(){const st=stage();st.innerHTML="";
  document.querySelectorAll("#ye-rail .step").forEach(b=>{const on=b.dataset.go===ui.v;b.setAttribute("aria-current",on?"true":"false");
    if(b.dataset.go==="study"){b.classList.toggle("done",S.sel.some(id=>steps5(id)>=3)&&!on)}});
  const i=RAILK.findIndex(r=>r[0]===ui.v);$("#ye-prog").style.width=((i+1)/RAILK.length*100)+"%";
  daysChip();
  ({home:vHome,study:vStudy,paper:vPaper,unseen:vUnseen,byo:vByo,plan:vPlan,kupu:vKupu}[ui.v]||vHome)(st);
  publish();
}

/* ---- Allen context: the tutor (study/tutor.js) reads StudyKit.current for the step it explains */
function publish(){if(!K)return;
  const t=ui.v==="study"&&ui.id?TEXTS[ui.id]:null;
  const caps={home:"Choose the 1 to 3 texts that are in your exam. Full texts are included for public domain and original texts; for in-copyright texts you get a summary and should use your class copy.",
    study:t?`Studying ${t.title} by ${t.author}. Read the summary and facts, do the quick check, memorise key lines, then practise a short answer and a long-answer plan.`:"Pick a text to study.",
    paper:"Set up a practice paper: recall questions across your texts, questions on one given text, unseen-text questions, short answers and a long answer.",
    unseen:"Tag the highlighted phrases in an unseen passage: name the technique, explain its effect, then link it to the main idea.",
    byo:"Paste any poem or story. Memorise it, look for features, check your terms, and build short and long answers.",
    plan:"A 45-minute plan for tonight, built from your texts.",kupu:"Te reo Māori words from the texts, the literary terms you need, and where every text came from."};
  const step={k:ui.v,lab:(RAILK.find(r=>r[0]===ui.v)||RAILK[0])[1],cap:caps[ui.v]||"",
    big:t?t.facts[2][1]:"In an English exam, every answer needs a point, evidence from the text, and an explanation of the effect.",
    trap:t?t.trap:"Naming a technique isn't enough. Say what it does to the reader and how it links to the main idea.",
    exam:t&&t.sa[0]?t.sa[0][1].replace(/<[^>]+>/g,""):"Technique → evidence → effect → link to the big idea."};
  const api={get step(){return step},state:{},redraw(){},setStep(n){const r=RAILK[n];if(r)go({v:r[0]})}};
  const cfg={title:"The English exam machine",eyebrow:"English · Year 9",steps:RAILK.map(r=>({k:r[0],lab:r[1]})),controls:[],challenges:[],truth:"Practice questions written for assembly."};
  try{K.current={api,cfg,mid:MID};dispatchEvent(new Event("studykit:mounted"))}catch(e){}}

/* ---------------- home: choose texts ---------------- */
const FILTERS=[["all","All"],["poem","Poems"],["story","Short stories"],["full","Full text"],["nz","NZ voices"]];
function matches(t,f){if(f==="all")return true;if(f==="poem"||f==="story")return t.kind===f;if(f==="full")return t.status!=="summary";
  if(f==="nz")return t.voice.some(v=>/NZ|Māori|Pasifika/.test(v));return true}
function toggleSel(id,btn){const i=S.sel.indexOf(id);
  if(i>-1){S.sel.splice(i,1);sfx("tick")}
  else{if(S.sel.length>=3){say("You can pick up to three texts. Remove one first.");const n=$("#ye-limit");if(n){n.hidden=false}return false}S.sel.push(id);sfx("pop");if(btn)burst(btn)}
  save();return true}
function vHome(st){
  const dateIn=h("input",{type:"date",id:"ye-date",value:S.examDate||"",onchange:e=>{S.examDate=e.target.value;save();daysChip()}});
  st.appendChild(h("section",{class:"card"},
    h("div",{class:"ye-between"},h("h2",{text:"1. Choose the texts in your exam"}),h("span",{class:"ye-count",text:S.sel.length+" of 3 chosen"})),
    h("p",{class:"ye-muted",text:"Pick one to three. Ask your teacher which texts are in your exam if you're not sure. Not in the list? Use “Your own text”."}),
    h("div",{class:"ye-field"},h("label",{for:"ye-date"},"Exam date (optional)"),dateIn),
    h("details",{},h("summary",{},"What's in a Year 9 English exam?"),h("div",{class:"ye-small"},
      h("p",{html:"Every school sets its own Year 9 exam, so check with your teacher. Most mix some of these:"}),
      h("p",{html:"<b>Recall questions</b> on the texts you studied in class: who, what, where, why."}),
      h("p",{html:"<b>Questions on a given text</b>, printed in the paper: language features and their effects."}),
      h("p",{html:"<b>An unseen text</b> you haven't read before: find techniques and explain them."}),
      h("p",{html:"<b>A short answer</b> (one paragraph) and a <b>long answer</b> or essay."}),
      h("p",{html:"The <b>Exam paper</b> section lets you set the mix to match yours."})))));
  const f=S.lib||"all";
  const filt=h("div",{class:"ye-filters",role:"group","aria-label":"Filter texts"});
  FILTERS.forEach(([k,l])=>filt.appendChild(h("button",{type:"button","aria-pressed":String(f===k),onclick:()=>{S.lib=k;save();render()}},l)));
  const grid=h("div",{class:"ye-lib",id:"ye-lib"});
  Object.entries(TEXTS).filter(([,t])=>matches(t,f)).forEach(([id,t])=>grid.appendChild(textCard(id,t)));
  st.appendChild(h("section",{class:"card"},h("div",{class:"ye-between"},h("h3",{text:"Text library"}),h("span",{class:"ye-muted ye-small",text:Object.keys(TEXTS).length+" texts"})),filt,
    h("p",{class:"ye-note",id:"ye-limit",hidden:true,text:"You can choose up to three. Remove one to add another."}),grid));
  st.appendChild(h("div",{class:"ye-tiles"},
    h("button",{type:"button",class:"ye-tile",id:"go-byo",onclick:()=>go({v:"byo"})},h("b",{text:"Bring your own text"}),h("span",{text:"Paste any poem or story. Memorise it, find its features, plan answers."})),
    h("button",{type:"button",class:"ye-tile",id:"go-unseen",onclick:()=>go({v:"unseen"})},h("b",{text:"Unseen text practice"}),h("span",{text:"Tag technique → effect → link on a passage you haven't read."})),
    h("button",{type:"button",class:"ye-tile",id:"go-paper",onclick:()=>go({v:"paper"})},h("b",{text:"Practice exam paper"}),h("span",{text:"Set the number of questions to match your real exam."}))));
  if(S.sel.length)st.appendChild(h("div",{class:"ye-tray",id:"ye-tray"},h("p",{},h("b",{text:"My texts: "}),S.sel.map(id=>TEXTS[id].title).join(" · ")),
    h("div",{class:"ye-row"},h("button",{class:"btn ghost",type:"button",onclick:()=>go({v:"paper"})},"Exam paper"),h("button",{class:"btn",type:"button",id:"btn-start",onclick:()=>go({v:"study",id:S.sel[0],tab:"read"})},"Start studying →"))));
}
function textCard(id,t){const on=S.sel.includes(id),n=steps5(id);
  const add=h("button",{class:"btn add",type:"button",id:"add-"+id,"aria-pressed":String(on),onclick:e=>{if(toggleSel(id,e.currentTarget))render()}},on?"✓ In my exam":"Add to my exam");
  return h("article",{class:"ye-tcard"+(on?" on":""),id:"card-"+id},
    h("div",{class:"top"},h("span",{class:"ic",html:cubeIcon(t.status==="original"?"og":t.kind)}),h("div",{},h("div",{class:"ye-kind",text:KIND[t.kind]+(t.year?" · "+t.year:"")}),h("h3",{text:t.title}),h("div",{class:"by",text:t.author}))),
    h("div",{},statusChip(t.status)),
    h("p",{class:"bl",text:t.blurb}),
    h("div",{style:"display:grid;gap:8px"},n?h("div",{class:"ye-bar","aria-label":n+" of 5 study steps done"},h("i",{style:"width:"+(n*20)+"%"})):null,
      h("div",{class:"acts"},add,h("button",{class:"btn",type:"button",id:"open-"+id,onclick:()=>go({v:"study",id,tab:"read"})},"Open"))));
}

/* ---------------- study a text ---------------- */
const TABS=[["read","Read"],["quiz","Quick check"],["mem","Memorise"],["sa","Short answer"],["la","Long answer"]];
function vStudy(st){
  if(!ui.id||!TEXTS[ui.id])ui.id=S.sel[0]||null;
  if(!ui.id){st.appendChild(h("section",{class:"card"},h("h2",{text:"Choose a text first"}),h("p",{class:"ye-muted",text:"Pick the texts in your exam, or open any text from the library."}),h("button",{class:"btn primary",type:"button",onclick:()=>go({v:"home"})},"Choose texts")));return}
  ui.tab=ui.tab||"read";const id=ui.id,t=TEXTS[id],p=prog(id);
  const list=S.sel.includes(id)?S.sel:[...S.sel,id];
  if(list.length>1){const sw=h("div",{class:"ye-tabs texts",role:"tablist","aria-label":"Your texts"});
    list.forEach(x=>sw.appendChild(h("button",{type:"button",role:"tab","aria-selected":String(x===id),onclick:()=>go({v:"study",id:x,tab:ui.tab||"read"})},TEXTS[x].title)));st.appendChild(sw)}
  st.appendChild(h("header",{style:"display:grid;gap:6px"},h("div",{class:"ye-kind",text:KIND[t.kind]+" · "+t.author+(t.year?" · "+t.year:"")}),h("h2",{text:t.title}),
    h("div",{class:"ye-row"},statusChip(t.status),S.sel.includes(id)?null:h("button",{class:"btn",type:"button",onclick:e=>{if(toggleSel(id,e.currentTarget))render()}},"Add to my exam"),h("button",{class:"btn ghost",type:"button","data-allen":"explain",id:"ask-allen"},"Stuck? Ask Allen"))));
  const done={read:p.read,quiz:p.best!=null&&p.total&&p.best/p.total>=0.8,mem:p.mem,sa:p.sa,la:p.la};
  const tabs=h("div",{class:"ye-tabs",role:"tablist","aria-label":"Study steps"});
  TABS.forEach(([k,l])=>tabs.appendChild(h("button",{type:"button",role:"tab",id:"tab-"+k,"aria-selected":String(ui.tab===k),onclick:()=>{sfx("tick");go({v:"study",id,tab:k})}},l,done[k]?h("span",{class:"tick","aria-label":"done",text:"✓"}):null)));
  st.appendChild(tabs);
  const body=h("div",{style:"display:grid;gap:16px;min-width:0"});st.appendChild(body);
  ({read:readTab,quiz:quizTab,mem:memTab,sa:saTab,la:laTab}[ui.tab]||readTab)(body,id);
  setTimeout(()=>{const s=document.getElementById("tab-"+ui.tab);try{s&&s.scrollIntoView({block:"nearest",inline:"center"})}catch(e){}},0);
}
function poemEl(text){const box=h("div",{class:"ye-poem"});let n=0;
  text.split("\n").forEach(l=>{if(!l.trim()){box.appendChild(h("div",{class:"sp"}));return}n++;box.appendChild(h("div",{class:"ln"},h("i",{text:n%5===0?String(n):""}),h("span",{text:l})))});return box}
function proseEl(text){const box=h("div",{class:"ye-text"});text.split(/\n\n+/).forEach(pa=>box.appendChild(pa.trim()==="* * *"?h("p",{class:"brk",text:"* * *"}):h("p",{text:pa})));return box}
function readTab(body,id){const t=TEXTS[id];
  if(t.status==="summary")body.appendChild(h("div",{class:"ye-note"},h("b",{text:"Summary only. "}),"This text is still in copyright, so we don't reproduce it here. Use your class copy, or read it here: ",h("a",{href:t.read.url,target:"_blank",rel:"noopener"},t.read.label+" ↗"),". You can paste your copy into Memorise.",t.heard?" "+t.heard:""));
  if(t.note)body.appendChild(h("p",{class:"ye-note",text:t.note}));
  const ol=h("ol",{class:"ye-sum"});t.summary.forEach(s=>ol.appendChild(h("li",{text:s})));
  body.appendChild(h("section",{class:"card"},h("h3",{class:"cap",text:"In five lines"}),ol));
  if(t.full){const words=t.full.split(/\s+/).length,mins=Math.max(1,Math.round(words/200));
    body.appendChild(h("details",{open:t.kind==="poem"?true:null,id:"full-text"},h("summary",{},t.kind==="poem"?"The poem":"Read the full story",h("span",{class:"ye-muted ye-small",style:"font-weight:400",text:" · "+(t.kind==="poem"?t.full.split("\n").filter(l=>l.trim()).length+" lines":"about "+mins+" min")})),
      h("div",{},t.kind==="poem"?poemEl(t.full):proseEl(t.full),h("p",{class:"ye-small ye-muted",text:t.source}))))}
  const facts=h("div",{class:"ye-facts"});t.facts.forEach(([a,b])=>facts.appendChild(h("div",{class:"ye-fact "+t.kind},h("h4",{text:a}),h("p",{text:b}))));
  body.appendChild(facts);
  body.appendChild(h("h3",{text:"Think deeper"}));
  t.think.forEach(([q,a])=>body.appendChild(h("details",{},h("summary",{},q),h("div",{},h("p",{text:a})))));
  body.appendChild(h("p",{class:"ye-note"},h("b",{text:"Common trap: "}),t.trap));
  if(!t.full)body.appendChild(h("p",{class:"ye-small ye-muted",text:t.source}));
  else if(t.read)body.appendChild(h("p",{class:"ye-small ye-muted"},"Source: ",h("a",{href:t.read.url,target:"_blank",rel:"noopener"},t.read.label+" ↗")));
  body.appendChild(h("button",{class:"btn primary full",type:"button",id:"btn-done-read",onclick:()=>{prog(id).read=true;save();logStudy("open");go({v:"study",id,tab:"quiz"})}},"I've read it → Quick check"));
}

/* ---------------- quiz engine ---------------- */
function bank(id,which){const t=TEXTS[id],src=which==="lang"?t.lang:t.quiz,tag=which==="lang"?"-l":"-";
  return src.map((q,i)=>({qid:id+tag+i,src:id,q:q[0],a:q[1],w:q[2],why:q[3]}))}
function bankOf(rows,prefix,src){return rows.map((q,i)=>({qid:prefix+i,src,q:q[0],a:q[1],w:q[2],why:q[3]}))}
// pick n, missed ones first, then the rest at random; keep the bank's order so a text reads in sequence
function pick(b,n,keepOrder){const missed=b.filter(q=>S.missed[q.qid]),rest=shuffle(b.filter(q=>!S.missed[q.qid]));
  const chosen=shuffle(missed).slice(0,n).concat(rest).slice(0,n);return keepOrder===false?shuffle(chosen):b.filter(q=>chosen.includes(q))}
function runQuiz(mount,qs,opts){const queue=qs.map((_,i)=>i),first={};let pos=0,streak=0;
  function step(){mount.innerHTML="";if(pos>=queue.length)return finish();
    const qi=queue[pos],q=qs[qi],retry=first[qi]===false;
    const dots=h("div",{class:"ye-dots","aria-hidden":"true"});qs.forEach((_,i)=>dots.appendChild(h("i",{class:(first[i]===true?"r":first[i]===false?"w":"")+(i===qi?" cur":"")})));
    const answered=Object.keys(first).length;
    const head=h("div",{class:"ye-qhead"},h("span",{text:(retry?"Coming back: ":"")+"Question "+Math.min(qs.length,answered+(retry?0:1))+" of "+qs.length}),h("span",{text:(queue.length-pos)+" left"}));
    const chip=opts.showSrc&&q.src&&TEXTS[q.src]?h("span",{class:"ye-srcchip",text:TEXTS[q.src].title}):opts.showSrc&&q.src&&UNSEEN[q.src]?h("span",{class:"ye-srcchip",text:"Unseen: "+UNSEEN[q.src].title}):null;
    const options=shuffle([q.a].concat(q.w)),box=h("div",{class:"ye-opts",role:"group","aria-label":"Answers"}),fb=h("div",{"aria-live":"polite"});
    const next=h("button",{class:"btn primary full",type:"button",id:"btn-next",hidden:true,onclick:()=>{pos++;step()}},"Next");
    options.forEach((o,i)=>box.appendChild(h("button",{class:"ye-opt",type:"button",id:"opt-"+i,"data-correct":o===q.a?"1":null,onclick:e=>{
      const right=o===q.a;[...box.children].forEach(b=>{b.disabled=true;if(b.dataset.correct)b.classList.add("right")});
      if(!right)e.currentTarget.classList.add("wrong");
      if(!(qi in first))first[qi]=right;
      if(right&&!retry)delete S.missed[q.qid];
      if(!right){S.missed[q.qid]=1;queue.splice(Math.min(pos+4,queue.length),0,qi);streak=0}else streak++;
      save();sfx(right?"ding":"buzz");if(right&&streak===3){burst(e.currentTarget);say("Three in a row. Nice.",2600)}
      fb.className="ye-fb "+(right?"right":"wrong");fb.innerHTML="";
      fb.appendChild(document.createTextNode(right?"Correct.":"Not quite. It's: "+q.a));fb.appendChild(h("span",{text:q.why+(right?"":" This one will come back soon.")}));
      next.hidden=false;next.textContent=pos+1>=queue.length?(opts.doneLabel||"See my score"):"Next";next.focus()}},h("span",{class:"k",text:"ABCD"[i]}),h("span",{text:o}))));
    mount.appendChild(h("div",{class:"card"},head,dots,chip,h("p",{class:"ye-q",text:q.q}),box,fb,next));toTop(mount)}
  function finish(){let score=0;const missed=[];qs.forEach((q,i)=>{if(first[i])score++;else missed.push(q)});opts.onDone(score,qs.length,missed)}
  step()}
function resultCard(score,total,missed,...extra){const pct=total?score/total:0;
  const msg=pct>=0.9?"Excellent. You know this.":pct>=0.7?"Solid. One more round tomorrow morning.":"Good start. Do it again now. It gets easier fast.";
  const c=h("div",{class:"card",id:"result"},h("p",{class:"ye-mono",text:"First-try score"}),h("p",{class:"ye-score",text:score+"/"+total}),h("p",{text:msg}));
  if(missed.length){const ul=h("ul",{class:"ye-missed"});missed.forEach(q=>ul.appendChild(h("li",{},q.q+" ",h("b",{text:"→ "+q.a}))));c.appendChild(h("details",{},h("summary",{},"Ones to look at again ("+missed.length+")"),h("div",{},ul)))}
  extra.forEach(x=>x&&c.appendChild(x));return c}
function quizTab(body,id){
  const qs=pick(bank(id),10).concat(pick(bank(id,"lang"),3));
  body.appendChild(h("p",{class:"ye-muted ye-small",text:"10 recall questions, then 3 on how it's written. Wrong ones come back a few questions later, and come first next time."}));
  const m=h("div",{style:"display:grid;gap:12px"});body.appendChild(m);
  runQuiz(m,qs,{onDone:(score,total,missed)=>{const p=prog(id);if(p.best==null||score/total>p.best/p.total){p.best=score;p.total=total}save();
    logStudy(score/total>=0.8?"pass":"done");cheer(score/total>=0.7);if(score/total>=0.7)sfx("win");
    m.innerHTML="";m.appendChild(resultCard(score,total,missed,
      h("button",{class:"btn primary full",type:"button",id:"btn-again",onclick:()=>go({v:"study",id,tab:"quiz"})},"Go again (new mix)"),
      h("button",{class:"btn full",type:"button",id:"btn-to-mem",onclick:()=>go({v:"study",id,tab:"mem"})},"Next: Memorise")))}})}

/* ---------------- memorise ---------------- */
const WORD=/[\p{L}\p{N}]/u;
const abbrev=w=>{const m=w.match(/^([^\p{L}\p{N}]*)([\p{L}\p{N}])[\p{L}\p{N}'’\-]*(.*)$/u);return m?m[1]+m[2]+m[3]:w};
function memTab(body,id){const t=TEXTS[id];
  const own=S.text[id]||"";
  const hasInc=!!t.full;
  let src=ui.src||(own?"own":hasInc?"inc":"own");if(src==="inc"&&!hasInc)src="own";
  if(hasInc){const seg=h("div",{class:"ye-seg",role:"group","aria-label":"Which text to memorise"});
    [["inc",t.kind==="poem"?"The included poem":"A key passage"],["own","My own copy"]].forEach(([k,l])=>seg.appendChild(h("button",{type:"button",id:"src-"+k,"aria-pressed":String(src===k),onclick:()=>{ui.src=k;render()}},l)));body.appendChild(seg)}
  if(src==="inc"){const txt=t.kind==="poem"?t.full:t.memoText;
    if(t.kind!=="poem")body.appendChild(h("p",{class:"ye-small ye-muted",text:t.memo+". Want a different part? Paste it under My own copy."}));
    memTools(body,txt,()=>{prog(id).mem=true;save()});return}
  memEditor(body,own,v=>{if(v)S.text[id]=v;else delete S.text[id];save();render()},t.status==="summary"?"Paste your class copy of "+t.title+". It stays on this device only. If it's long, paste the part you most want to know, like the opening or the ending.":"Paste the version your class uses. It stays on this device only.");
  if(own)memTools(body,own,()=>{prog(id).mem=true;save()});
}
function memEditor(body,txt,onSave,intro){let arm=false;
  const ta=h("textarea",{id:"mem-input",class:"big",placeholder:"Paste your copy here. Keep the line breaks.",oninput:()=>{status.textContent=ta.value.trim()?"Not saved yet":""}});ta.value=txt;
  const status=h("span",{class:"ye-small ye-muted",text:txt?"Saved on this device":""});
  const card=h("section",{class:"card"},h("h3",{text:txt?"Your copy":"Add your copy"}),h("p",{class:"ye-small ye-muted",text:intro}),
    h("label",{for:"mem-input",class:"ye-small",style:"font-weight:600"},"Text"),ta,
    h("div",{class:"ye-row"},h("button",{class:"btn primary",type:"button",id:"btn-save",onclick:()=>onSave(ta.value.replace(/\r/g,"").replace(/\n{3,}/g,"\n\n").trim())},"Save"),
      txt?h("button",{class:"btn ghost",type:"button",id:"btn-clear",onclick:e=>{if(arm)onSave("");else{arm=true;e.currentTarget.textContent="Tap again to clear"}}},"Clear"):null,status));
  if(txt)body.appendChild(h("details",{},h("summary",{},"Edit your copy"),h("div",{},card)));else{body.appendChild(card);
    body.appendChild(h("div",{class:"card"},h("h3",{class:"cap",text:"What you'll get"}),
      h("p",{class:"ye-small",html:"<b>First letters:</b> every word becomes its first letter. Say the line, then tap to check."}),
      h("p",{class:"ye-small",html:"<b>Fill the gaps:</b> 20%, then 50%, then 80% of words hidden."}),
      h("p",{class:"ye-small",html:"<b>Line order:</b> lines get shuffled. Tap them back in order."})))}}
function memTools(body,txt,onUse){onUse&&onUse();const mode=ui.mode||"letters";
  const seg=h("div",{class:"ye-seg",role:"group","aria-label":"Practice mode"});
  [["letters","First letters"],["gaps","Fill the gaps"],["order","Line order"]].forEach(([k,l])=>seg.appendChild(h("button",{type:"button",id:"mode-"+k,"aria-pressed":String(mode===k),onclick:()=>{ui.mode=k;render()}},l)));
  body.appendChild(seg);const area=h("section",{class:"card"});body.appendChild(area);
  (mode==="gaps"?gaps:mode==="order"?order:letters)(area,txt)}
function memLines(txt){let lines=txt.split("\n");if(lines.filter(l=>l.trim()).length<3)lines=txt.replace(/\s+/g," ").split(/(?<=[.!?”"])\s+/);return lines}
function letters(area,txt){area.appendChild(h("p",{class:"ye-small ye-muted",text:"Say each line out loud from the first letters. Tap a word to check it. Aim for a clean run with everything hidden."}));
  const box=h("div",{class:"ye-mem",id:"mem-letters"}),all=[];
  memLines(txt).forEach(line=>{if(!line.trim()){box.appendChild(h("span",{class:"gap"}));return}const l=h("span",{class:"line"});
    line.split(/(\s+)/).forEach(w=>{if(!w)return;if(!WORD.test(w)){l.appendChild(document.createTextNode(w));return}
      const b=h("button",{class:"ye-w hid",type:"button","aria-label":"hidden word, tap to show",text:abbrev(w)});b._f=w;
      b.onclick=()=>{const hid=b.classList.toggle("hid");b.textContent=hid?abbrev(w):w;b.classList.toggle("shown",!hid);b.setAttribute("aria-label",hid?"hidden word, tap to show":w)};all.push(b);l.appendChild(b)});box.appendChild(l)});
  area.appendChild(box);
  area.appendChild(h("div",{class:"ye-row"},h("button",{class:"btn",type:"button",id:"btn-showall",onclick:()=>all.forEach(b=>{b.classList.remove("hid");b.classList.add("shown");b.textContent=b._f})},"Show all"),
    h("button",{class:"btn",type:"button",id:"btn-hideall",onclick:()=>all.forEach(b=>{b.classList.add("hid");b.classList.remove("shown");b.textContent=abbrev(b._f)})},"Hide all")))}
function gaps(area,txt){const level=ui.level||20;
  const seg=h("div",{class:"ye-seg",role:"group","aria-label":"How many gaps"});[20,50,80].forEach(n=>seg.appendChild(h("button",{type:"button",id:"lvl-"+n,"aria-pressed":String(level===n),onclick:()=>{ui.level=n;render()}},n+"% hidden")));area.appendChild(seg);
  area.appendChild(h("p",{class:"ye-small ye-muted",text:"Say the missing word, then tap the gap to check. When it feels easy, move up a level."}));
  const box=h("div",{class:"ye-mem",id:"mem-gaps"}),slots=[],lines=memLines(txt).map(l=>l.split(/(\s+)/));
  lines.forEach((ws,li)=>ws.forEach((w,wi)=>{if(w&&WORD.test(w))slots.push(li+":"+wi)}));
  const hide={};shuffle(slots).slice(0,Math.round(slots.length*level/100)).forEach(k=>hide[k]=1);let count=0;
  lines.forEach((ws,li)=>{if(!ws.join("").trim()){box.appendChild(h("span",{class:"gap"}));return}const l=h("span",{class:"line"});
    ws.forEach((w,wi)=>{if(!w)return;if(hide[li+":"+wi]){count++;const core=w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}'’\-]+$/gu,""),at=w.indexOf(core),lead=w.slice(0,at),trail=w.slice(at+core.length);
      const b=h("button",{class:"ye-w blank",type:"button","aria-label":"gap, tap to show",style:"width:"+Math.max(2,core.length)+"ch",text:core});
      b.onclick=()=>{b.classList.remove("blank");b.classList.add("shown");b.style.width="";b.setAttribute("aria-label",core)};
      if(lead)l.appendChild(document.createTextNode(lead));l.appendChild(b);if(trail)l.appendChild(document.createTextNode(trail))}else l.appendChild(document.createTextNode(w))});box.appendChild(l)});
  area.appendChild(box);area.appendChild(h("div",{class:"ye-row"},h("button",{class:"btn",type:"button",id:"btn-newgaps",onclick:()=>render()},"New gaps"),h("span",{class:"ye-small ye-muted",text:count+" gaps"})))}
function order(area,txt){const lines=memLines(txt).map(l=>l.trim()).filter(Boolean),size=6,chunks=Math.ceil(lines.length/size),c=Math.min(ui.chunk||0,Math.max(0,chunks-1));
  if(chunks>1){const seg=h("div",{class:"ye-tabs"});for(let i=0;i<chunks;i++)seg.appendChild(h("button",{type:"button",id:"chunk-"+i,"aria-selected":String(i===c),onclick:()=>{ui.chunk=i;render()}},"Lines "+(i*size+1)+"–"+Math.min(lines.length,(i+1)*size)));area.appendChild(seg)}
  const part=lines.slice(c*size,c*size+size);if(part.length<2){area.appendChild(h("p",{class:"ye-muted",text:"Add at least two lines to practise the order."}));return}
  area.appendChild(h("p",{class:"ye-small ye-muted",text:"Tap the lines in the right order."}));
  const built=h("div",{class:"ye-built",id:"order-built"}),pool=h("div",{class:"ye-opts",id:"order-pool"}),status=h("p",{class:"ye-small ye-muted","aria-live":"polite"});let next=0,slips=0;
  let sh=shuffle(part.map((_,i)=>i));if(sh.every((v,i)=>v===i))sh.reverse();
  sh.forEach(i=>{const b=h("button",{class:"ye-lineopt",type:"button",text:part[i]});b.onclick=()=>{
    if(i===next){built.appendChild(h("div",{text:part[i]}));b.remove();next++;sfx("tick");
      if(next===part.length){status.className="ye-fb right";status.textContent=slips?"Done, with "+slips+" slip"+(slips>1?"s":"")+". Go again to get it clean.":"Perfect order. Try the next set or go again.";if(!slips){sfx("win");burst(status)}}}
    else{slips++;sfx("buzz");b.classList.remove("shake");void b.offsetWidth;b.classList.add("shake")}};pool.appendChild(b)});
  area.appendChild(built);area.appendChild(pool);area.appendChild(status);area.appendChild(h("button",{class:"btn",type:"button",id:"btn-reshuffle",onclick:()=>render()},"Shuffle again"))}

/* ---------------- timer ---------------- */
function makeTimer(seconds,label){let left=seconds,iv=null;const fmt=s=>Math.floor(s/60)+":"+String(s%60).padStart(2,"0");
  const clock=h("span",{class:"clock",role:"timer","aria-label":label,text:fmt(left)}),btn=h("button",{class:"btn primary",type:"button",id:"btn-timer",text:"Start "+label}),wrap=h("div",{class:"ye-timer"},clock,btn);
  btn.onclick=()=>{if(iv){clearInterval(iv);iv=null;left=seconds;clock.textContent=fmt(left);wrap.classList.remove("end");btn.textContent="Start "+label;return}
    btn.textContent="Reset";iv=setInterval(()=>{left--;clock.textContent=fmt(Math.max(0,left));if(left<=0){clearInterval(iv);iv=null;wrap.classList.add("end");clock.textContent="Time";btn.textContent="Start again";left=seconds;sfx("chime")}},1000);timers.push(iv)};
  return wrap}

/* ---------------- short answer ---------------- */
function saTab(body,id){const t=TEXTS[id];const prompts=t.sa.map(r=>({q:r[0],model:r[1]})).concat(D.GENERIC.sa.slice(0,3).map(r=>({q:r[0],guide:r[1]})));
  shortAnswer(body,{prompts,key:id+"-sa",onWrite:()=>{prog(id).sa=true;save()},quoteNote:t.status==="summary"})}
function shortAnswer(body,o){const pi=Math.min(o.fixed!=null?o.fixed:(ui.pi||0),o.prompts.length-1),pr=o.prompts[pi],key=o.key+"-"+pi;
  body.appendChild(h("p",{class:"ye-muted ye-small",text:"Point, evidence, explain. About four sentences. Aim to finish in 2 minutes."}));
  if(o.fixed==null&&o.prompts.length>1){const ch=h("div",{class:"ye-choices"});o.prompts.forEach((p,i)=>ch.appendChild(h("button",{class:"ye-choice",type:"button",id:"sa-q-"+i,"aria-pressed":String(i===pi),onclick:()=>{ui.pi=i;render()}},p.q)));body.appendChild(ch)}
  else body.appendChild(h("p",{class:"ye-q",text:pr.q}));
  body.appendChild(makeTimer(120,"2 min"));
  const vals={},preview=h("p",{class:"ye-small"});
  const upd=()=>{const s=["p","e","x"].map(f=>(vals[f]||"").trim()).filter(Boolean).join(" ");preview.textContent=s||"Your paragraph appears here as you type."};
  [["p","Point","Answer the question in one sentence."],["e","Evidence",o.quoteNote?"A specific moment, or a short quote from your class copy.":"A short quote, or a specific moment."],["x","Explain + effect","What does it show? How does it make the reader think or feel? Link to the big idea."]].forEach(([f,l,hint])=>{
    const k=key+"-"+f;vals[f]=draft(k);const ta=h("textarea",{id:k,rows:"3",oninput:e=>{vals[f]=e.target.value;draft(k,e.target.value);if(e.target.value.trim()&&o.onWrite)o.onWrite();upd()}});ta.value=vals[f];
    body.appendChild(h("div",{class:"ye-field"},h("label",{for:k},l),h("span",{class:"hint",text:hint}),ta))});upd();
  body.appendChild(h("div",{class:"card"},h("p",{class:"ye-mono",text:"Your paragraph"}),preview));
  const checks=["My first sentence answers the question","I used specific evidence","I explained the effect on the reader","I linked it to a big idea or theme"];
  const ck=h("div",{class:"ye-check"});checks.forEach((c,i)=>{const cid=key+"-ck"+i;const inp=h("input",{type:"checkbox",id:cid,onchange:e=>{draft(cid,e.target.checked?"1":"")}});inp.checked=!!draft(cid);ck.appendChild(h("label",{for:cid},inp,c))});
  body.appendChild(h("details",{},h("summary",{},"Check it yourself"),h("div",{},ck)));
  body.appendChild(h("details",{},h("summary",{},pr.model?"See a model paragraph":"How to build this one"),h("div",{},h("div",{class:"ye-model",html:pr.model||pr.guide}),
    pr.model&&o.quoteNote?h("p",{class:"ye-small ye-muted",text:"Written in our own words with no quotes, because this text is in copyright. In the exam, add a short quote from your copy."}):null)));
}

/* ---------------- long answer ---------------- */
function laTab(body,id){const t=TEXTS[id];longAnswer(body,{key:id+"-la",prompts:t.la.concat(D.GENERIC.la),onWrite:()=>{prog(id).la=true;save()},link:t.kupu&&t.kupu.length?"Connect to the big ideas. A te reo word you can explain, such as "+t.kupu.slice(0,3).join(", ")+", can lift an answer if it fits.":"Connect to the big ideas: what the text says about people, society or the world."})}
function longAnswer(body,o){const key=o.key;
  body.appendChild(h("p",{class:"ye-muted ye-small",text:"Plan for 3 minutes, write for 12. A plan stops you running out of ideas."}));
  body.appendChild(makeTimer(o.seconds||900,o.seconds?Math.round(o.seconds/60)+" min":"15 min"));
  const field=(k,label,hint,rows)=>{const ta=h("textarea",{id:key+k,rows:String(rows||2),style:"min-height:"+(rows>2?96:64)+"px",oninput:e=>{draft(key+k,e.target.value);if(e.target.value.trim()&&o.onWrite)o.onWrite()}});ta.value=draft(key+k);
    return h("div",{class:"ye-field"},h("label",{for:key+k},label),hint?h("span",{class:"hint",text:hint}):null,ta)};
  const qBox=h("div",{class:"ye-choices"}),qSel=draft(key+"-qi");
  o.prompts.forEach((p,i)=>qBox.appendChild(h("button",{class:"ye-choice",type:"button",id:"la-q-"+i,"aria-pressed":String(String(i)===qSel),onclick:()=>{draft(key+"-qi",String(i));const ta=document.getElementById(key+"-q");ta.value=p;draft(key+"-q",p);[...qBox.children].forEach((b,j)=>b.setAttribute("aria-pressed",String(j===i)))}},p)));
  body.appendChild(h("section",{class:"card"},h("p",{class:"ye-stepn",text:"Step 1 of 4"}),h("h3",{text:"The question"}),h("p",{class:"ye-small ye-muted",text:"Pick a practice question, or type the one your teacher gave."}),qBox,field("-q","Question in your words","Underline the key words: explain, how, why, discuss.")));
  body.appendChild(h("section",{class:"card"},h("p",{class:"ye-stepn",text:"Step 2 of 4"}),h("h3",{text:"Three points"}),field("-p1","Point 1","One idea that answers the question."),field("-p2","Point 2"),field("-p3","Point 3")));
  body.appendChild(h("section",{class:"card"},h("p",{class:"ye-stepn",text:"Step 3 of 4"}),h("h3",{text:"Evidence for each point"}),field("-e1","Evidence 1","A short quote or a specific moment."),field("-e2","Evidence 2"),field("-e3","Evidence 3")));
  body.appendChild(h("section",{class:"card"},h("p",{class:"ye-stepn",text:"Step 4 of 4"}),h("h3",{text:"Link to the big ideas"}),h("p",{class:"ye-small ye-muted",text:o.link||"Connect to the big ideas: what the text says about people, society or the world."}),field("-l","My link",null,3)));
  if(o.write)body.appendChild(h("section",{class:"card"},h("h3",{text:"Now write it"}),h("p",{class:"ye-small ye-muted",text:"Intro, three body paragraphs, conclusion. Use your plan."}),field("-w","Your answer",null,10)));
  body.appendChild(h("details",{},h("summary",{},"How to turn the plan into an essay"),h("div",{class:"ye-small"},
    h("p",{html:"<b>Intro (2 sentences):</b> name the text and writer, then answer the question in one line. That line is your thesis."}),
    h("p",{html:"<b>Three body paragraphs:</b> point, evidence, explain. One paragraph per point, each linked back to the thesis."}),
    h("p",{html:"<b>Conclusion (2 sentences):</b> sum up, then say why it matters: your link from Step 4."}))))}

/* ---------------- exam paper ---------------- */
const PRESETS=[["std","Standard paper",{recall:15,given:10,unseen:0,sa:1,la:1}],["quick","Quick 15 minutes",{recall:8,given:5,unseen:0,sa:1,la:0}],["unseen","Unseen focus",{recall:0,given:0,unseen:6,sa:1,la:0}],["mock","Full mock",{recall:15,given:10,unseen:6,sa:2,la:1}]];
const LIMITS={recall:[0,20],given:[0,15],unseen:[0,6],sa:[0,3],la:[0,1]};
function fmt(){if(!S.fmt||typeof S.fmt!=="object")S.fmt={recall:15,given:10,unseen:0,sa:1,la:1,givenId:"",unseenId:"",clock:true};return S.fmt}
function mins(f){return Math.round(f.recall*0.5+f.given*0.75+(f.unseen?5+f.unseen*0.75:0)+f.sa*5+f.la*20)}
let paper=null;
function vPaper(st){if(paper&&paper.phase!=="setup")return runPaper(st);paperSetup(st)}
function paperSetup(st){const f=fmt();
  st.appendChild(h("section",{class:"card"},h("h2",{text:"3. Set up your practice paper"}),h("p",{class:"ye-muted",text:"Match the mix to your real exam. Ask your teacher if you're not sure what's in it."})));
  const pre=h("div",{class:"ye-filters",role:"group","aria-label":"Presets"});
  PRESETS.forEach(([k,l,v])=>{const on=Object.keys(v).every(x=>f[x]===v[x]);pre.appendChild(h("button",{type:"button",id:"preset-"+k,"aria-pressed":String(on),onclick:()=>{Object.assign(f,v);save();sfx("tick");render()}},l))});
  const rows=[["recall","Recall questions","Across "+(S.sel.length?"your texts":"the texts you choose")+": who, what, where, why."],["given","Given-text questions","On one of your texts, as if it were printed in the paper."],["unseen","Unseen-text questions","On a passage you haven't studied."],["sa","Short answers","One paragraph each, with a model to compare."],["la","Long answer","Plan and write an essay-style answer."]];
  const card=h("section",{class:"card"},h("h3",{class:"cap",text:"Presets"}),pre);
  rows.forEach(([k,l,s])=>{const [lo,hi]=LIMITS[k];const out=h("output",{id:"n-"+k,text:k==="la"?(f.la?"Yes":"No"):String(f[k])});
    const set=v=>{f[k]=Math.max(lo,Math.min(hi,v));save();render()};
    card.appendChild(h("div",{class:"ye-stepper"},h("div",{class:"lab"},h("b",{text:l}),h("span",{text:s})),
      h("div",{class:"ye-num"},h("button",{type:"button","aria-label":"Fewer "+l.toLowerCase(),id:"dec-"+k,onclick:()=>set(f[k]-1)},"−"),out,h("button",{type:"button","aria-label":"More "+l.toLowerCase(),id:"inc-"+k,onclick:()=>set(f[k]+1)},"+"))))});
  st.appendChild(card);
  const needTexts=(f.recall||f.given||f.sa||f.la)&&!S.sel.length;
  const gSel=h("select",{id:"sel-given","aria-label":"Given text",onchange:e=>{f.givenId=e.target.value;save()}},h("option",{value:""},"Surprise me"),S.sel.map(id=>h("option",{value:id},TEXTS[id].title)));gSel.value=S.sel.includes(f.givenId)?f.givenId:"";
  const uSel=h("select",{id:"sel-unseen","aria-label":"Unseen passage",onchange:e=>{f.unseenId=e.target.value;save()}},h("option",{value:""},"Surprise me"),Object.entries(UNSEEN).map(([k,u])=>h("option",{value:k},u.title)));uSel.value=UNSEEN[f.unseenId]?f.unseenId:"";
  const clk=h("input",{type:"checkbox",id:"chk-clock",onchange:e=>{f.clock=e.target.checked;save()}});clk.checked=f.clock!==false;
  st.appendChild(h("section",{class:"card"},
    S.sel.length?h("p",{},h("b",{text:"Your texts: "}),S.sel.map(id=>TEXTS[id].title).join(" · ")):null,
    needTexts?h("p",{class:"ye-note"},"Choose your texts first, or set recall, given, short and long answers to zero for an unseen-only paper. ",h("button",{class:"btn",type:"button",onclick:()=>go({v:"home"})},"Choose texts")):null,
    f.given&&S.sel.length?h("div",{class:"ye-field"},h("label",{for:"sel-given"},"Given text"),gSel):null,
    f.unseen?h("div",{class:"ye-field"},h("label",{for:"sel-unseen"},"Unseen passage"),uSel):null,
    h("div",{class:"ye-check"},h("label",{for:"chk-clock"},clk,"Exam clock: about "+mins(f)+" minutes")),
    S.best?h("p",{class:"ye-small ye-muted",text:"Your best paper so far: "+S.best.score+"/"+S.best.total+" on the questions."}):null,
    h("button",{class:"btn primary full",type:"button",id:"btn-start-paper",disabled:needTexts||!(f.recall+f.given+f.unseen+f.sa+f.la)?true:null,onclick:startPaper},"Start the paper")))}
function startPaper(){const f=fmt();const sel=S.sel.slice();
  // Section A: recall, interleaved across texts so you have to tell them apart
  let A=[];if(f.recall&&sel.length){const per=sel.map((id,i)=>Math.floor(f.recall/sel.length)+(i<f.recall%sel.length?1:0));const lists=sel.map((id,i)=>shuffle(pick(bank(id),per[i])));
    for(let i=0;A.length<f.recall&&i<40;i++)lists.forEach(l=>{if(l[i]&&A.length<f.recall)A.push(l[i])})}
  const givenId=f.given&&sel.length?(sel.includes(f.givenId)?f.givenId:sel[Math.floor(Math.random()*sel.length)]):null;
  let B=[];if(givenId){const used=new Set(A.map(q=>q.qid));const lang=shuffle(bank(givenId,"lang")),rest=shuffle(bank(givenId).filter(q=>!used.has(q.qid)));B=lang.concat(rest).slice(0,f.given);B=shuffle(B)}
  const uid=f.unseen?(UNSEEN[f.unseenId]?f.unseenId:shuffle(Object.keys(UNSEEN))[0]):null;
  const C=uid?shuffle(bankOf(UNSEEN[uid].quiz,"u-"+uid+"-",uid)).slice(0,f.unseen):[];
  const pool=[];sel.forEach(id=>TEXTS[id].sa.forEach(r=>pool.push({q:r[0],model:r[1],src:id})));if(uid)pool.push({q:UNSEEN[uid].sa[0],model:UNSEEN[uid].sa[1],src:uid});
  const SA=shuffle(pool).slice(0,f.sa);
  const laPool=sel.flatMap(id=>TEXTS[id].la).concat(D.GENERIC.la);const LA=f.la?laPool[Math.floor(Math.random()*laPool.length)]:null;
  const order=[A.length&&"A",B.length&&"B",C.length&&"C",SA.length&&"D",LA&&"E"].filter(Boolean);
  paper={phase:order[0]||"done",order,A,B,C,SA,LA,givenId,uid,res:{},saI:0,end:f.clock!==false?Date.now()+mins(f)*60000:null,id:Date.now()};
  logStudy("open");sfx("whoosh");render();toTop()}
const SECN={A:"Section A · Recall",B:"Section B · Given text",C:"Section C · Unseen text",D:"Section D · Short answer",E:"Section E · Long answer",done:"Results"};
function nextSection(){const i=paper.order.indexOf(paper.phase);paper.phase=paper.order[i+1]||"done";render();toTop()}
function runPaper(st){const P=paper;
  const clock=h("span",{class:"clock",role:"timer","aria-label":"Time left"});
  const bar=h("div",{class:"ye-pbar"},h("span",{class:"sec",text:SECN[P.phase]+(P.phase!=="done"?" ("+(P.order.indexOf(P.phase)+1)+" of "+P.order.length+")":"")}),
    h("div",{class:"ye-row"},P.end&&P.phase!=="done"?clock:null,P.phase!=="done"?h("button",{class:"btn",type:"button",id:"btn-endpaper",onclick:()=>{P.phase="done";render()}},"End paper"):null));
  st.appendChild(bar);
  if(P.end&&P.phase!=="done"){const tick=()=>{const s=Math.round((P.end-Date.now())/1000);if(s<=0){clock.textContent="Time's up";bar.classList.add("over")}else clock.textContent=Math.floor(s/60)+":"+String(s%60).padStart(2,"0")};tick();timers.push(setInterval(tick,1000))}
  const m=h("div",{style:"display:grid;gap:14px;min-width:0"});st.appendChild(m);
  const quizSec=(key,qs,intro)=>{if(intro)m.appendChild(intro);const q=h("div",{style:"display:grid;gap:12px"});m.appendChild(q);
    runQuiz(q,qs,{showSrc:key!=="B",doneLabel:"Finish this section",onDone:(score,total,missed)=>{P.res[key]={score,total,missed};sfx("ding");nextSection()}})};
  if(P.phase==="A")quizSec("A",P.A,h("p",{class:"ye-muted ye-small",text:"Questions jump between your texts. That trains you to tell them apart."}));
  else if(P.phase==="B"){const t=TEXTS[P.givenId];
    m.appendChild(h("section",{class:"card"},h("h2",{text:"The given text: "+t.title}),h("p",{class:"ye-muted ye-small",text:t.full?"In the exam, read the printed text first. Here it is.":"In the exam the text is printed for you. This one is in copyright, so have your class copy open, or answer from memory."}),
      t.full?h("details",{open:t.kind==="poem"?true:null},h("summary",{},t.kind==="poem"?"The poem":"The story"),h("div",{},t.kind==="poem"?poemEl(t.full):proseEl(t.full))):h("a",{href:t.read.url,target:"_blank",rel:"noopener"},t.read.label+" ↗")));
    quizSec("B",P.B)}
  else if(P.phase==="C"){const u=UNSEEN[P.uid];
    m.appendChild(h("section",{class:"card"},h("h2",{text:"Unseen: "+u.title}),h("p",{class:"ye-small ye-muted",text:u.from}),u.kind==="poem"?poemEl(u.text):proseEl(u.text)));
    quizSec("C",P.C)}
  else if(P.phase==="D"){const pr=P.SA[P.saI];
    m.appendChild(h("p",{class:"ye-mono",text:"Short answer "+(P.saI+1)+" of "+P.SA.length+(pr.src&&TEXTS[pr.src]?" · "+TEXTS[pr.src].title:pr.src&&UNSEEN[pr.src]?" · Unseen: "+UNSEEN[pr.src].title:"")}));
    shortAnswer(m,{prompts:[pr],fixed:0,key:"paper-"+P.id+"-sa"+P.saI,quoteNote:pr.src&&TEXTS[pr.src]&&TEXTS[pr.src].status==="summary"});
    m.appendChild(h("button",{class:"btn primary full",type:"button",id:"btn-sa-next",onclick:()=>{P.saI++;if(P.saI>=P.SA.length)nextSection();else{render();toTop()}}},P.saI+1>=P.SA.length?"Finish this section":"Next short answer"))}
  else if(P.phase==="E"){m.appendChild(h("p",{class:"ye-q",text:P.LA}));
    longAnswer(m,{key:"paper-"+P.id+"-la",prompts:[P.LA],seconds:1200,write:true});
    m.appendChild(h("button",{class:"btn primary full",type:"button",id:"btn-la-done",onclick:nextSection},"Finish the paper"))}
  else paperResults(m)}
function paperResults(m){const P=paper;let sc=0,tot=0,missed=[];
  const res=h("div",{class:"ye-res"});["A","B","C"].forEach(k=>{const r=P.res[k];if(!r)return;sc+=r.score;tot+=r.total;missed=missed.concat(r.missed);res.appendChild(h("div",{},h("span",{text:SECN[k].split(" · ")[1]}),h("b",{text:r.score+"/"+r.total})))});
  if(P.SA.length)res.appendChild(h("div",{},h("span",{text:"Short answers"}),h("b",{text:String(P.SA.length)})));
  if(P.LA)res.appendChild(h("div",{},h("span",{text:"Long answer"}),h("b",{text:"Planned"})));
  if(tot&&(!S.best||sc/tot>S.best.score/S.best.total)){S.best={score:sc,total:tot};save()}
  if(tot){cheer(sc/tot>=0.7);if(sc/tot>=0.7)sfx("win");logStudy(sc/tot>=0.8?"pass":"done")}
  m.appendChild(tot?resultCard(sc,tot,missed,res):h("div",{class:"card"},h("h2",{text:"Paper finished"}),res));
  m.appendChild(h("p",{class:"ye-small ye-muted",text:"Writing isn't marked here. Compare your answers with the models, then show them to your teacher."}));
  m.appendChild(h("div",{class:"ye-row"},h("button",{class:"btn primary",type:"button",id:"btn-paper-again",onclick:startPaper},"New paper, same format"),h("button",{class:"btn",type:"button",id:"btn-paper-setup",onclick:()=>{paper=null;render()}},"Change the format")))}

/* ---------------- unseen ---------------- */
function vUnseen(st){
  st.appendChild(h("section",{class:"card"},h("h2",{text:"4. Unseen text practice"}),h("p",{class:"ye-muted",text:"Tap a highlighted phrase. Name the technique, choose its effect, then link it to the main idea. That's the move every unseen answer needs."})));
  const tiles=h("div",{class:"ye-tiles"});
  Object.entries(UNSEEN).forEach(([k,u])=>{const n=(S.tags[k]||[]).length;tiles.appendChild(h("button",{type:"button",class:"ye-tile",id:"pass-"+k,"aria-pressed":String(ui.pid===k),style:ui.pid===k?"border-color:var(--acc);background:var(--acc-soft)":null,onclick:()=>go({v:"unseen",pid:k})},
    h("b",{text:u.title}),h("span",{text:u.from}),h("div",{},statusChip(u.status,true),n?h("span",{class:"ye-small ye-muted",text:"  "+n+"/"+u.tags.length+" tagged"}):null)))});
  st.appendChild(tiles);
  const k=ui.pid;if(!k||!UNSEEN[k])return;const u=UNSEEN[k];const done=new Set(S.tags[k]||[]);
  const plain=!!ui.plain;
  const passage=h("div",{class:"ye-passage"+(plain?" ye-plain":""),id:"passage"});
  // find each tag phrase in the text (whitespace-tolerant) and turn it into a button
  const norm=s=>s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&").replace(/\s+/g,"\\s+");
  const hits=u.tags.map((tg,i)=>{const m=new RegExp(norm(tg[0])).exec(u.text);return m?{i,at:m.index,len:m[0].length}:null}).filter(Boolean).sort((a,b)=>a.at-b.at);
  let pos=0;hits.forEach(x=>{if(x.at<pos)return;passage.appendChild(document.createTextNode(u.text.slice(pos,x.at)));
    passage.appendChild(h("button",{type:"button",class:"ye-tag"+(done.has(x.i)?" done":"")+(ui.tag===x.i?" cur":""),id:"tag-"+x.i,"aria-label":(done.has(x.i)?"Tagged: ":"Tag this phrase: ")+u.tags[x.i][0],onclick:()=>{ui.tag=x.i;ui.tstep=0;sfx("tick");render();setTimeout(()=>{const p=$("#tag-panel");try{p&&p.scrollIntoView({block:"nearest",behavior:"smooth"})}catch(e){}},0)}},u.text.slice(x.at,x.at+x.len)));pos=x.at+x.len});
  passage.appendChild(document.createTextNode(u.text.slice(pos)));
  const plainB=h("button",{class:"btn tog",type:"button",id:"btn-plain","aria-pressed":String(plain),onclick:()=>{ui.plain=!plain;render()}},"Hide the highlights");
  st.appendChild(h("section",{class:"card"},h("div",{class:"ye-between"},h("div",{},h("h2",{text:u.title}),h("p",{class:"ye-small ye-muted",text:u.from})),statusChip(u.status)),
    u.note?h("p",{class:"ye-small ye-muted",text:u.note}):null,
    h("div",{class:"ye-row"},plainB,h("span",{class:"ye-count",id:"tag-count",text:done.size+" of "+u.tags.length+" tagged"})),
    plain?h("p",{class:"ye-small ye-muted",text:"Exam mode: find the features yourself. The phrases are still tappable."}):null,
    passage,makeTimer(1200,"20 min")));
  if(ui.tag!=null&&u.tags[ui.tag])st.appendChild(tagPanel(k,u,ui.tag));
  if(done.size){const ul=h("ul",{class:"ye-stack",id:"tag-stack"});[...done].sort((a,b)=>a-b).forEach(i=>ul.appendChild(h("li",{text:tagSentence(u.tags[i])})));
    st.appendChild(h("section",{class:"card"},h("h3",{class:"cap",text:"Your tag stack"}),h("p",{class:"ye-small ye-muted",text:"Each tag is the skeleton of an exam sentence. Add one more sentence explaining it in your own words."}),ul))}
  st.appendChild(h("section",{class:"card"},h("h3",{text:"Main idea"}),h("details",{},h("summary",{},"Show the main idea"),h("div",{},h("p",{text:u.idea}))),
    h("div",{class:"ye-row"},h("button",{class:"btn primary",type:"button",id:"btn-unseen-quiz",onclick:()=>{ui.uq=true;render();setTimeout(()=>{try{$("#unseen-quiz").scrollIntoView({block:"start"})}catch(e){}},0)}},"Questions on this passage"))));
  if(ui.uq){const q=h("div",{style:"display:grid;gap:12px",id:"unseen-quiz"});st.appendChild(q);
    runQuiz(q,pick(bankOf(u.quiz,"u-"+k+"-",k),u.quiz.length,false),{onDone:(score,total,missed)=>{cheer(score/total>=0.7);q.innerHTML="";
      q.appendChild(resultCard(score,total,missed));const sa=h("div",{style:"display:grid;gap:12px"});q.appendChild(h("h3",{text:"Now: one short answer"}));
      shortAnswer(sa,{prompts:[{q:u.sa[0],model:u.sa[1]}],fixed:0,key:"unseen-"+k+"-sa"});q.appendChild(sa)}})}}
function tagSentence(tg){let eff=tg[3];if(/^(Makes|Drops|Copies|Invites|Creates|Captures|Contrasts|Adds|Puts|Shows|Gives)\b/.test(eff))eff="This "+eff[0].toLowerCase()+eff.slice(1);
  return `In “${tg[0].replace(/\s+/g," ").replace(/[.,;:]$/,"")}”, the writer uses ${tg[1].charAt(0).toLowerCase()+tg[1].slice(1)}. ${eff}, which ${tg[5]}.`}
function tagPanel(k,u,i){const tg=u.tags[i],stepN=ui.tstep||0,done=(S.tags[k]||[]).includes(i);
  const panel=h("section",{class:"card ye-panel",id:"tag-panel","aria-live":"polite"},h("div",{class:"ye-between"},h("h3",{class:"cap",text:"Tag it"}),h("div",{class:"ye-row"},h("button",{class:"btn ghost",type:"button","data-allen":"explain"},"Ask Allen"),h("button",{class:"btn ghost",type:"button",onclick:()=>{ui.tag=null;render()}},"Close"))),h("p",{class:"ye-quote",text:"“"+tg[0].replace(/\s+/g," ")+"”"}));
  const STEPS=[["1 · Technique","What is the writer doing here?",tg[1],tg[2]],["2 · Effect","What does it do to the reader?",tg[3],tg[4]],["3 · Link","How does it connect to the main idea? It…",tg[5],tg[6]]];
  if(done||stepN>=3){panel.appendChild(h("p",{class:"ye-fb right"},"Tagged.",h("span",{text:tagSentence(tg)})));
    const nxt=u.tags.findIndex((_,j)=>!(S.tags[k]||[]).includes(j));
    panel.appendChild(nxt>-1?h("button",{class:"btn primary",type:"button",id:"btn-next-tag",onclick:()=>{ui.tag=nxt;ui.tstep=0;render()}},"Next phrase →"):h("p",{class:"ye-small",text:"Every phrase tagged. Try the questions, or hide the highlights and do it again from memory."}));return panel}
  STEPS.forEach(([lab,q,right,wrong],s)=>{if(s>stepN)return;const box=h("div",{class:"ye-tstep"},h("p",{class:"ye-stepn",text:lab}),h("p",{class:"ye-small",text:q}));
    if(s<stepN){box.appendChild(h("div",{class:"ye-choice yes",text:right}));panel.appendChild(box);return}
    const opts=h("div",{class:"ye-choices"});shuffle([right].concat(wrong)).forEach(o=>opts.appendChild(h("button",{class:"ye-choice",type:"button",onclick:e=>{
      if(o===right){sfx("ding");if(s===2){S.tags[k]=[...new Set([...(S.tags[k]||[]),i])];save();burst(e.currentTarget);const n=S.tags[k].length;if(n===u.tags.length){sfx("win");cheer(true)}else if(n%3===0)say(n+" tagged. You're building real exam sentences.",3000)}ui.tstep=s+1;render()}
      else{sfx("buzz");const b=e.currentTarget;b.classList.remove("no");void b.offsetWidth;b.classList.add("no");b.disabled=true}}},o)));
    box.appendChild(opts);panel.appendChild(box)});
  return panel}

/* ---------------- bring your own ---------------- */
const BTABS=[["text","Your text"],["mem","Memorise"],["find","Feature finder"],["terms","Terms check"],["sa","Short answer"],["la","Long answer"]];
function vByo(st){const tab=ui.btab||"text",b=S.byo&&S.byo.text?S.byo:null;
  st.appendChild(h("section",{class:"card"},h("h2",{text:"5. Your own text"}),h("p",{class:"ye-muted",text:"Studying a poem or story that isn't in the library? Paste it here. It stays in this browser and is never uploaded."})));
  const tabs=h("div",{class:"ye-tabs",role:"tablist","aria-label":"Your own text tools"});
  BTABS.forEach(([k,l])=>tabs.appendChild(h("button",{type:"button",role:"tab",id:"btab-"+k,"aria-selected":String(tab===k),onclick:()=>{sfx("tick");go({v:"byo",btab:k})}},l)));st.appendChild(tabs);
  const body=h("div",{style:"display:grid;gap:16px;min-width:0"});st.appendChild(body);
  if(tab==="terms"){termsQuiz(body);return}
  if(tab==="sa"){shortAnswer(body,{prompts:D.GENERIC.sa.map(r=>({q:r[0],guide:r[1]})),key:"byo-sa"});return}
  if(tab==="la"){longAnswer(body,{key:"byo-la",prompts:D.GENERIC.la});return}
  if(tab!=="text"&&!b){body.appendChild(h("p",{class:"ye-note",text:"Paste your text first, under Your text."}));tab!=="text"&&body.appendChild(h("button",{class:"btn primary",type:"button",onclick:()=>go({v:"byo",btab:"text"})},"Add your text"));return}
  if(tab==="mem"){memTools(body,b.text);return}
  if(tab==="find"){finder(body,b);return}
  // the editor
  const ti=h("input",{type:"text",id:"byo-title",placeholder:"e.g. The Hollow Tree"});ti.value=b?b.title||"":"";
  const au=h("input",{type:"text",id:"byo-author",placeholder:"e.g. your teacher's handout"});au.value=b?b.author||"":"";
  let kind=b&&b.kind||"poem";const seg=h("div",{class:"ye-seg",role:"group","aria-label":"Kind of text"});
  [["poem","Poem"],["story","Story or prose"]].forEach(([k,l])=>seg.appendChild(h("button",{type:"button",id:"byo-k-"+k,"aria-pressed":String(kind===k),onclick:e=>{kind=k;[...seg.children].forEach(x=>x.setAttribute("aria-pressed",String(x===e.currentTarget)))}},l)));
  const ta=h("textarea",{id:"byo-text",class:"big",placeholder:"Paste the poem or story here. Keep the line breaks."});ta.value=b?b.text:"";
  body.appendChild(h("section",{class:"card"},h("div",{class:"ye-field"},h("label",{for:"byo-title"},"Title"),ti),h("div",{class:"ye-field"},h("label",{for:"byo-author"},"Writer (optional)"),au),seg,
    h("div",{class:"ye-field"},h("label",{for:"byo-text"},"Text"),ta),
    h("div",{class:"ye-row"},h("button",{class:"btn primary",type:"button",id:"byo-save",onclick:()=>{const v=ta.value.replace(/\r/g,"").replace(/\n{3,}/g,"\n\n").trim();if(!v){ta.focus();return}
      S.byo={title:ti.value.trim()||"My text",author:au.value.trim(),kind,text:v};save();sfx("pop");go({v:"byo",btab:"find"})}},"Save and find features"),
      b?h("button",{class:"btn ghost",type:"button",id:"byo-clear",onclick:e=>{if(e.currentTarget.dataset.arm){S.byo=null;S.tel=[];save();render()}else{e.currentTarget.dataset.arm="1";e.currentTarget.textContent="Tap again to clear"}}},"Clear"):null)));}
function termsQuiz(body){body.appendChild(h("p",{class:"ye-muted ye-small",text:"The words you need for any text. Ten at a time; missed ones come first next time."}));
  const m=h("div",{style:"display:grid;gap:12px"});body.appendChild(m);
  runQuiz(m,pick(bankOf(D.TERMS,"term-"),10,false),{onDone:(s,t,missed)=>{cheer(s/t>=0.7);m.innerHTML="";m.appendChild(resultCard(s,t,missed,h("button",{class:"btn primary full",type:"button",onclick:()=>render()},"Go again")))}})}
// feature finder: pattern clues, not answers. The student checks each one.
const STOP=new Set("a an and the of to in on at for with as is was are were be been it its this that these those i me my we our you your he she him her his they them their there here but or so if then than not no yes do did does from by up down out into over just very can could would should will shall have has had all any some one two".split(" "));
const SOUNDS=new Set("buzz bang boom crash crack clatter clang click crunch drip fizz gargling gurgle hiss hum humming murmur pop rattle roar rumble rustle sizzle slam slap snap splash splat squeak squelch swish thud thump tick tock twang whack whirr whisper whispered whoosh zap zip kiss howl creak creaks creaked jangle tinkle".split(" "));
function features(text){const lines=text.split("\n"),out={simile:[],rep:[],allit:[],q:[],ex:[],sound:[],caps:[]};
  lines.forEach(l=>{if(!l.trim())return;
    let m=l.match(/\b(like|as)\b(?:\s+\w+){0,4}/i);if(m&&!/\bas (well|if|though|soon|long)\b/i.test(m[0]))out.simile.push([l,m[0]]);
    if(/\?/.test(l))out.q.push([l,l.slice(Math.max(0,l.lastIndexOf("?")-40),l.lastIndexOf("?")+1)]);
    if(/!/.test(l))out.ex.push([l,l.slice(Math.max(0,l.indexOf("!")-30),l.indexOf("!")+1)]);
    const ws=l.match(/[\p{L}'’]+/gu)||[];
    ws.forEach(w=>{if(SOUNDS.has(w.toLowerCase()))out.sound.push([l,w])});
    const cw=ws.filter(w=>!STOP.has(w.toLowerCase())&&w.length>2);
    for(let i=0;i+1<cw.length;i++){const a=cw[i][0].toLowerCase();if(/[a-z]/.test(a)&&cw[i+1][0].toLowerCase()===a){let j=i+1;while(j+1<cw.length&&cw[j+1][0].toLowerCase()===a)j++;
      const run=cw.slice(i,j+1);if(ws.indexOf(run[run.length-1])-ws.indexOf(run[0])<=run.length+1){out.allit.push([l,run.join(" … ")]);i=j}}}
    if(/\b[A-Z]{3,}\b/.test(l)&&l!==l.toUpperCase())out.caps.push([l,l.match(/\b[A-Z]{3,}\b/)[0]])});
  const freq={};(text.toLowerCase().match(/[\p{L}'’]+/gu)||[]).forEach(w=>{if(!STOP.has(w)&&w.length>3)freq[w]=(freq[w]||0)+1});
  Object.entries(freq).filter(([,n])=>n>=3).sort((a,b)=>b[1]-a[1]).slice(0,6).forEach(([w,n])=>out.rep.push([w+" ("+n+" times)",w]));
  const seen={};lines.map(l=>l.trim()).filter(Boolean).forEach(l=>{seen[l]=(seen[l]||0)+1});Object.entries(seen).filter(([,n])=>n>1).forEach(([l])=>out.rep.unshift([l,l]));
  const lw=(text.toLowerCase().match(/[\p{L}'’]+/gu)||[]);const c=ws=>lw.filter(w=>ws.includes(w)).length;
  const pov={first:c(["i","me","my","we","us","our"]),second:c(["you","your"]),third:c(["he","she","they","him","her","them","his","their"])};
  const shape={lines:lines.filter(l=>l.trim()).length,stanzas:text.split(/\n\s*\n/).filter(s=>s.trim()).length,sentences:(text.match(/[.!?]+(\s|$)/g)||[]).length,words:lw.length};
  return {out,pov,shape}}
function mark(line,hit){const i=line.toLowerCase().indexOf(String(hit).split(" … ")[0].toLowerCase());if(i<0)return esc(line);const end=String(hit).includes(" … ")?line.toLowerCase().indexOf(String(hit).split(" … ").pop().toLowerCase(),i)+String(hit).split(" … ").pop().length:i+String(hit).length;
  return esc(line.slice(0,i))+"<mark>"+esc(line.slice(i,end))+"</mark>"+esc(line.slice(end))}
function finder(body,b){const {out,pov,shape}=features(b.text);
  const povT=pov.first>=Math.max(pov.second,pov.third)&&pov.first>1?"Mostly first person (I, we): it feels personal.":pov.second>pov.third&&pov.second>1?"Lots of you: direct address, talking to the reader.":"Mostly third person (he, she, they): we watch from outside.";
  body.appendChild(h("section",{class:"card"},h("h3",{class:"cap",text:"The shape of "+b.title}),h("div",{class:"ye-res"},
    h("div",{},h("span",{text:"Words"}),h("b",{text:String(shape.words)})),h("div",{},h("span",{text:b.kind==="poem"?"Lines":"Sentences"}),h("b",{text:String(b.kind==="poem"?shape.lines:shape.sentences)})),
    h("div",{},h("span",{text:b.kind==="poem"?"Stanzas":"Paragraphs"}),h("b",{text:String(shape.stanzas)}))),h("p",{class:"ye-small",text:povT})));
  body.appendChild(h("p",{class:"ye-note",html:"<b>These are clues, not answers.</b> The finder spots patterns. You decide: is it really a simile? What is being compared? Then build a sentence with <b>Explain it</b>."}));
  const GROUPS=[["simile","Possible similes","Simile","Look for like or as. Check two different things are being compared."],["sound","Sound words","Onomatopoeia","Words that sound like what they describe."],["allit","Repeated first sounds","Alliteration","Nearby words starting with the same sound."],["rep","Repetition","Repetition","Words or lines that come back. Why repeat them?"],["q","Questions","Rhetorical question","Is the writer asking for an answer, or making you think?"],["ex","Exclamations","Exclamation","Strong feeling, surprise or urgency."],["caps","Capital letters","Emphasis (capitals)","Shouting, a sign, or a name?"]];
  const wrap=h("div",{class:"ye-find",id:"finder"});let any=false;
  GROUPS.forEach(([k,l,tech,tip])=>{const list=out[k].slice(0,5);if(!list.length)return;any=true;
    wrap.appendChild(h("h3",{text:l+" ("+out[k].length+")"}));wrap.appendChild(h("p",{class:"ye-small ye-muted",text:tip}));
    list.forEach(([line,hit],n)=>wrap.appendChild(h("div",{class:"hit"},h("p",{html:k==="rep"?esc(line):mark(line,hit)}),h("div",{},h("button",{class:"btn",type:"button",id:"tel-"+k+"-"+n,onclick:()=>{ui.tel={tech,ex:k==="rep"?hit:(line.trim().length<120?line.trim():hit)};render();setTimeout(()=>{try{$("#tel-builder").scrollIntoView({block:"nearest"})}catch(e){}},0)}},"Explain it")))))});
  if(!any)wrap.appendChild(h("p",{class:"ye-muted",text:"No pattern clues found. Read it slowly for images, comparisons and word choices the finder can't spot: metaphor, personification, symbolism."}));
  body.appendChild(wrap);
  body.appendChild(telBuilder(ui.tel||{tech:"",ex:""}));
  if(S.tel.length){const ul=h("ul",{class:"ye-stack",id:"tel-list"});S.tel.forEach((s,i)=>ul.appendChild(h("li",{},s+" ",h("button",{class:"btn ghost",type:"button","aria-label":"Remove this sentence",style:"min-height:32px;padding:2px 8px",onclick:()=>{S.tel.splice(i,1);save();render()}},"×"))));
    body.appendChild(h("section",{class:"card"},h("h3",{class:"cap",text:"Your sentences"}),ul))}}
function telBuilder(o){const TECH=["Simile","Metaphor","Personification","Onomatopoeia","Alliteration","Sibilance","Repetition","Rhetorical question","Imagery","Symbolism","Contrast","Hyperbole","Direct address","Short sentence","Exclamation","Emphasis (capitals)"];
  const sel=h("select",{id:"tel-tech"},h("option",{value:""},"Choose a technique"),TECH.map(t=>h("option",{value:t},t)));sel.value=o.tech||"";
  const ex=h("textarea",{id:"tel-ex",rows:"2"});ex.value=o.ex||"";
  const ef=h("textarea",{id:"tel-ef",rows:"2",placeholder:"This makes the reader…"}),ln=h("textarea",{id:"tel-ln",rows:"2",placeholder:"This shows that…"});
  const prev=h("p",{class:"ye-model",id:"tel-preview"});
  const upd=()=>{const t=sel.value,e=ex.value.trim(),f=ef.value.trim(),l=ln.value.trim();prev.textContent=t&&e?`The writer uses ${t.toLowerCase()} in “${e}”. ${f||"[effect]"} ${l||"[link]"}`:"Pick a technique and an example, and your sentence builds here."};
  [sel,ex,ef,ln].forEach(x=>x.addEventListener("input",upd));sel.addEventListener("change",upd);upd();
  const starters=(ta,list)=>h("div",{class:"ye-starters"},list.map(s=>h("button",{type:"button",onclick:()=>{ta.value=s+" ";ta.focus();upd()}},s)));
  return h("section",{class:"card",id:"tel-builder"},h("h3",{text:"Technique → effect → link"}),
    h("div",{class:"ye-field"},h("label",{for:"tel-tech"},"Technique"),sel),
    h("div",{class:"ye-field"},h("label",{for:"tel-ex"},"Example (quote it exactly)"),ex),
    h("div",{class:"ye-field"},h("label",{for:"tel-ef"},"Effect"),starters(ef,["This makes the reader picture","This creates a","This emphasises","This makes us feel"]),ef),
    h("div",{class:"ye-field"},h("label",{for:"tel-ln"},"Link to the main idea"),starters(ln,["This shows that","This connects to the theme of","The writer wants us to realise"]),ln),
    prev,h("button",{class:"btn primary",type:"button",id:"tel-save",onclick:()=>{if(!sel.value||!ex.value.trim()){sel.focus();return}S.tel.push(prev.textContent);S.tel=S.tel.slice(-30);ui.tel=null;save();sfx("pop");cheer(true);render()}},"Save sentence"))}

/* ---------------- tonight's plan ---------------- */
function planItems(){const sel=S.sel,n=sel.length;if(!n)return [];const per=n===1?15:n===2?10:8,items=[];
  sel.forEach(id=>items.push(["t-"+id,"Read, then Quick check: "+TEXTS[id].title,per]));
  if(n>1)items.push(["low","Quick check again on the text you scored lowest on",5]);else items.push(["mem","Memorise: first letters on the key lines",8]);
  items.push(["paper","Exam paper: the Quick 15 minutes preset",12]);items.push(["sa","One short answer with the 2-minute timer",5]);items.push(["la","Long answer: just the plan, no essay",3]);
  let t=0;return items.map(([k,w,m])=>{const r=[k,Math.floor(t/60)+":"+String(t%60).padStart(2,"0"),w,m];t+=m;return r}).concat([["am","Morning","One more Quick check before school, then stop.",10]])}
function vPlan(st){const items=planItems();
  if(!items.length){st.appendChild(h("section",{class:"card"},h("h2",{text:"Tonight's plan"}),h("p",{class:"ye-muted",text:"Choose your texts first and a plan will appear here."}),h("button",{class:"btn primary",type:"button",onclick:()=>go({v:"home"})},"Choose texts")));return}
  const total=items.slice(0,-1).reduce((a,r)=>a+r[3],0);const ol=h("ol",{class:"ye-plan"});
  items.forEach(([k,t,w,m])=>{const id="plan-"+k,done=!!S.plan[k];const li=h("li",{class:done?"done":null});const inp=h("input",{type:"checkbox",id,onchange:e=>{S.plan[k]=e.target.checked;save();li.className=e.target.checked?"done":"";if(e.target.checked)sfx("tick")}});inp.checked=done;
    li.appendChild(h("label",{for:id},inp,h("span",{class:"t",text:t}),h("span",{class:"what"},w,h("span",{class:"ye-muted ye-small",text:" · "+m+" min"}))));ol.appendChild(li)});
  st.appendChild(h("section",{class:"card"},h("div",{class:"ye-between"},h("h2",{text:"Tonight: "+total+" minutes"}),h("button",{class:"btn ghost",type:"button",id:"plan-reset",onclick:()=>{S.plan={};save();render()}},"Untick all")),ol,
    h("p",{class:"ye-small ye-muted",text:"Then sleep. Sleep is when your brain locks in what you practised."})));
  st.appendChild(h("details",{},h("summary",{},"Why this works"),h("div",{class:"ye-small"},
    h("p",{text:"Testing yourself beats rereading. Every time you pull an answer out of memory, it gets easier next time."}),
    h("p",{text:"Wrong answers come back a few questions later. That spacing is what makes them stick."}),
    h("p",{text:"The exam paper jumps between your texts, which trains you to tell them apart."}),
    h("p",{text:"First letters give your memory a hint without giving away the answer."}))))}

/* ---------------- terms & kupu ---------------- */
function vKupu(st){
  const dl=h("dl",{class:"ye-gl"});D.TERMS.forEach(r=>{const long=r[1].length>24,term=long?(/effect/.test(r[0])?"Explain the effect":"Purpose"):r[1];
    const def=long?r[1]+". "+r[3]:r[0].replace(/…$/,"").replace(/(, it is| is in the| is the| is its| is a| is| are)$/,"").replace(/,$/,"")+". Example: "+r[3];
    dl.appendChild(h("dt",{text:term}));dl.appendChild(h("dd",{text:def}))});
  st.appendChild(h("section",{class:"card"},h("h2",{text:"Literary terms"}),h("p",{class:"ye-muted ye-small",text:"Use the exact word, then explain the effect. Test yourself in Your own text → Terms check."}),dl));
  const kl=h("dl",{class:"ye-gl",lang:"mi"});D.KUPU.forEach(([w,m])=>{kl.appendChild(h("dt",{text:w}));kl.appendChild(h("dd",{lang:"en",text:m}))});
  st.appendChild(h("section",{class:"card"},h("h2",{text:"Kupu Māori from the texts"}),h("p",{class:"ye-muted ye-small",text:"Words used in the texts here. Using one correctly, and explaining it, can lift an answer. Meanings can vary between iwi; check with your teacher."}),kl));
  const ul=h("ul",{class:"ye-src"});D.SOURCES.forEach(([what,label,url])=>ul.appendChild(h("li",{},h("b",{text:what+": "}),h("a",{href:url,target:"_blank",rel:"noopener"},label+" ↗"))));
  const cr=h("ul",{class:"ye-src"});Object.values(TEXTS).forEach(t=>cr.appendChild(h("li",{},h("b",{text:t.title+" ("+t.author+"): "}),STATUS[t.status][0]+". "+t.source)));
  Object.values(UNSEEN).forEach(u=>cr.appendChild(h("li",{},h("b",{text:"Unseen, "+u.title+": "}),STATUS[u.status][0]+". "+u.from)));
  st.appendChild(h("section",{class:"card"},h("h2",{text:"Where the texts come from"}),cr,h("h3",{class:"cap",text:"Sources we checked"}),ul))}

/* ---------------- boot ---------------- */
shell();
const hash=(location.hash||"").slice(1);if(RAILK.some(r=>r[0]===hash))ui.v=hash;
render();allenSetup();logStudy("open");
addEventListener("hashchange",()=>{const k=(location.hash||"").slice(1);if(RAILK.some(r=>r[0]===k)&&k!==ui.v)go({v:k})});
})();
