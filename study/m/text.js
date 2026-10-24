(()=>{
"use strict";
// The text studio: a lightbox for one unfamiliar text (NCEA L1 English 91927), plus a planner for two aspects of a studied text (91925).
// The poem "Low Tide" is original, written for assembly. The readings here are one valid interpretation, not the only one.
const K=window.StudyKit, esc=K.esc;
const LINES=[
  "The estuary breathes out at dawn,",
  "a slow grey sigh across the flats.",
  "Mud shines like a sheet of tinfoil,",
  "and the mangroves grip and grip and grip,",
  "as if the tide might never come home.",
  "Gulls bicker over a broken shell,",
  "sharp beaks, sharp words, sharp light.",
  "My grandfather walks the edge in gumboots,",
  "counting crab holes like he’s checking on old friends.",
  "Then the water turns.",
  "It slides back silver, soft, certain,",
  "filling every footprint we leave behind."];
const GAP=new Set([5,7,9]);            // stanza breaks before these lines (0-based)
// techniques, each with a highlighter colour (hl) and a deeper edge (hd)
const TECH=[
  {k:"pers",l:"Personification",hl:"#FFC9BC",hd:"#FF6B4A",hint:"Is something non-human doing a human thing?"},
  {k:"meta",l:"Metaphor",hl:"#BFE0FA",hd:"#2F8FD8",hint:"It says one thing is another, with no “like” or “as”."},
  {k:"sim",l:"Simile",hl:"#FFE08A",hd:"#E89B00",hint:"Look for “like” or “as”."},
  {k:"rep",l:"Repetition",hl:"#BDEBCB",hd:"#2E9E57",hint:"Which word comes back again and again?"},
  {k:"sib",l:"Sibilance",hl:"#DDD2FF",hd:"#7B61FF",hint:"Say it out loud. Which sound repeats?"},
  {k:"short",l:"Short sentence",hl:"#FFCCE0",hd:"#D9468F",hint:"Count the words in that sentence."},
  {k:"sym",l:"Symbol",hl:"#B4EEE5",hd:"#12A386",hint:"Does an object stand for a bigger idea?"}];
const TK=Object.fromEntries(TECH.map(t=>[t.k,t]));
const PH=[
  {l:0,ph:"breathes out",t:"pers",why:"An estuary can’t breathe. It’s given a human action, so the place feels alive."},
  {l:1,ph:"a slow grey sigh",t:"meta",why:"The tide going out simply is a sigh. No “like”, so it’s a metaphor."},
  {l:2,ph:"like a sheet of tinfoil",t:"sim",why:"The mud is compared to tinfoil using “like”: bright, flat, a little cold."},
  {l:3,ph:"grip and grip and grip",t:"rep",why:"Three “grip”s in a row make the holding on feel endless and desperate."},
  {l:5,ph:"Gulls bicker",t:"pers",why:"Bickering is a human habit, given to the gulls. It makes them petty and loud."},
  {l:6,ph:"sharp beaks, sharp words, sharp light",t:"rep",why:"“Sharp” three times: the whole scene feels harsh and cutting."},
  {l:8,ph:"like he’s checking on old friends",t:"sim",why:"Counting crab holes is compared to visiting friends, using “like”: tender, familiar."},
  {l:9,ph:"Then the water turns.",t:"short",why:"Four words on one line. The shortest sentence marks the poem’s turn."},
  {l:10,ph:"slides back silver, soft, certain",t:"sib",why:"Soft “s” sounds repeat, like water hissing gently back over sand."},
  {l:11,ph:"filling every footprint we leave behind",t:"sym",why:"Footprints stand for the marks people leave. The tide quietly erases them, like time."}];
const EF=[
  {id:"grip",p:3,words:["holding on","stubborn","tight fists","afraid to let go","never resting"],feel:"anxious",idea:"We hold on hardest to what we’re afraid to lose."},
  {id:"foot",p:9,words:["erasing","gentle","washed clean","forgetting","starting over"],feel:"calm acceptance",idea:"Time moves on and quietly covers the marks we make."},
  {id:"sigh",p:1,words:["tired","letting go","dull grey","emptying","breathing out"],feel:"weary",idea:"The day begins with something draining away."},
  {id:"gull",p:4,words:["petty","noisy","squabbling","greedy","restless"],feel:"irritated",idea:"The harsh world makes the grandfather’s gentleness stand out."},
  {id:"friend",p:6,words:["care","routine","loyal","familiar","warmth"],feel:"tender",idea:"He belongs to this place; his love for it has grown over a lifetime."}];
const TEN=[3,3,4,6,7,8,9,5,4,6,2,1];
const MOOD=["still","weary","bright","clinging","fearful","noisy","harsh","gentle","tender","turning","soothing","peaceful"];
const SUBJ=[["","Pick a subject"],["time","Time"],["change","Change"],["family","Family"],["nature","Nature"]];
const MSG=[["","Pick a message"],["hold","…can’t be held back, however tightly we grip."],["calm","…can be met calmly, even when it takes things from us."],["link","…links the generations, even as each one fades."],["pretty","…is beautiful."]];
const FIT={time:["hold","calm"],change:["hold","calm"],family:["link"],nature:[]};
const EVID={hold:"“the mangroves grip and grip and grip, / as if the tide might never come home”",calm:"“It slides back silver, soft, certain,”",link:"“My grandfather walks the edge … / filling every footprint we leave behind”"};
const ASP=[["","Pick an aspect"],["character","Character"],["setting","Setting"],["symbol","Symbol"],["theme","Theme"],["structure","Structure"],["language","Language"]];
const ASPW={character:"a character who changes",setting:"the setting",symbol:"a recurring symbol",theme:"the central idea",structure:"the way the text is structured",language:"the writer’s language"};
const ASPC={character:"#FF6B4A",setting:"#2E9E57",symbol:"#12A386",theme:"#7B61FF",structure:"#2F8FD8",language:"#E89B00"};
const PURP=[["warn","warn us about"],["show","show us"],["question","make us question"],["celebrate","celebrate"]];
const PURPW=Object.fromEntries(PURP);

const s={on:{},fresh:"",peek:-1,ni:0,ans:{},ef:"grip",grow:1,line:1,subj:"",msg:"",a1:"character",a2:"",purp:"warn"};
TECH.forEach(t=>s.on[t.k]=false);s.on.pers=true;
const calm=()=>{try{return matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){return false}};
let mq=null;try{mq=matchMedia("(max-width:620px)")}catch(e){}
let P=!!(mq&&mq.matches);
const W=()=>P?400:640, H=()=>P?680:440;

// ---------- small drawing helpers
const T=(x,y,str,o={})=>`<text class="${o.d?"td":"tt"}" x="${x}" y="${y}" font-size="${o.size||12}" font-weight="${o.w||600}" fill="${o.fill||"var(--ink)"}"${o.anchor?` text-anchor="${o.anchor}"`:""}${o.ls?` letter-spacing="${o.ls}"`:""}${o.op!=null?` opacity="${o.op}"`:""}>${o.raw?str:esc(str)}</text>`;
const LAB=(x,y,str,o={})=>T(x,y,String(str).toUpperCase(),{size:11,w:600,fill:o.fill||"var(--rose)",ls:"1",anchor:o.anchor,op:o.op});
const FO=(x,y,w,h,html,cls)=>`<foreignObject x="${x}" y="${y}" width="${w}" height="${h}"><div xmlns="http://www.w3.org/1999/xhtml" class="${cls||""}">${html}</div></foreignObject>`;
const card=(x,y,w,h,o={})=>`${o.shadow===false?"":`<rect x="${x+2}" y="${y+5}" width="${w}" height="${h}" rx="${o.r||22}" fill="#2E2A47" opacity=".07"/>`}<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.r||22}" fill="${o.fill||"var(--paper)"}" stroke="${o.stroke||"var(--line)"}" stroke-width="${o.sw||1.5}"${o.extra||""}/>`;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const hlVars=t=>`--hl:${TK[t].hl};--hd:${TK[t].hd}`;
function lineHTML(i,markFn){const L=LINES[i];const p=PH.findIndex(x=>x.l===i);if(p<0)return esc(L);
  const a=L.indexOf(PH[p].ph),b=a+PH[p].ph.length;const m=markFn(p);
  return esc(L.slice(0,a))+(m?`<mark data-p="${p}" class="${m.cls||""}" style="${hlVars(PH[p].t)}">${esc(L.slice(a,b))}</mark>`:esc(L.slice(a,b)))+esc(L.slice(b))}
function poemHTML(markFn,dimFn){
  return `<h4>Low Tide</h4><p class="by">An original poem</p><ol>${LINES.map((L,i)=>`<li class="${GAP.has(i)?"gap":""}${dimFn&&dimFn(i)?" dim":""}">${lineHTML(i,markFn)}</li>`).join("")}</ol>`}
const score=()=>PH.reduce((n,p,i)=>n+(s.ans[i]===p.t?1:0),0);
const answered=()=>Object.keys(s.ans).length;
const litCount=()=>TECH.filter(t=>s.on[t.k]).length;
const strength=()=>(s.subj?1:0)+(s.msg&&s.msg!=="pretty"?1:0)+(s.subj&&FIT[s.subj].includes(s.msg)?1:0);
const twoAspects=()=>!!(s.a1&&s.a2&&s.a1!==s.a2);

// ---------- 1 lightbox
function drawSpot(){let o="";const cw=P?376:452,cx=P?12:16,cy=P?12:14,ch=P?462:412;
  o+=card(cx,cy,cw,ch,{r:24});
  o+=`<rect x="${cx+cw-60}" y="${cy-6}" width="44" height="16" rx="3" fill="#FFE08A" opacity=".85" transform="rotate(8 ${cx+cw-38} ${cy+2})"/>`;
  const mark=p=>s.on[PH[p].t]?{cls:"on"+(s.fresh===PH[p].t?" fresh":"")+(s.peek===p?" pick":"")}:null;
  o+=FO(cx+18,cy+16,cw-30,ch-24,`<div style="font-size:${P?15.5:15}px;line-height:${P?1.55:1.5}">${poemHTML(mark)}</div>`,"ts-poem");
  s.fresh="";   // only the switch just pressed gets the light-up flash
  // switches
  if(!P){const x=484,w=140;o+=LAB(x,32,"Switch on");
    TECH.forEach((t,i)=>{const y=46+i*44,on=s.on[t.k];
      o+=`<g data-tog="${t.k}"><rect x="${x}" y="${y}" width="${w}" height="36" rx="18" fill="${on?t.hl:"var(--paper)"}" stroke="${t.hd}" stroke-width="${on?2:1.5}" stroke-opacity="${on?1:.55}"/>
      <circle cx="${x+18}" cy="${y+18}" r="7" fill="${on?t.hd:"none"}" stroke="${t.hd}" stroke-width="2"/>${T(x+32,y+22.5,t.l,{size:12.5,w:600})}</g>`});
    if(s.peek>=0&&s.on[PH[s.peek].t]){const p=PH[s.peek],t=TK[p.t];
      o+=card(470,362,154,64,{r:16,fill:t.hl,stroke:t.hd,shadow:false});
      o+=FO(480,368,138,56,`<div style="font:600 11px/1.3 'Instrument Sans',sans-serif;letter-spacing:.06em;text-transform:uppercase;color:${t.hd}">${esc(t.l)}</div><div style="font:500 13px/1.3 'Instrument Sans',sans-serif;color:var(--ink)">“${esc(p.ph)}”</div>`)}
    else o+=FO(476,370,150,56,`<div style="font:500 12.5px/1.35 'Instrument Sans',sans-serif;color:var(--rose)">Tap a glowing phrase to see its name.</div>`)}
  else{const y0=cy+ch+16;
    TECH.forEach((t,i)=>{const x=12+(i%2)*192,y=y0+Math.floor(i/2)*42,on=s.on[t.k];
      o+=`<g data-tog="${t.k}"><rect x="${x}" y="${y}" width="184" height="34" rx="17" fill="${on?t.hl:"var(--paper)"}" stroke="${t.hd}" stroke-width="${on?2:1.5}" stroke-opacity="${on?1:.55}"/><circle cx="${x+18}" cy="${y+17}" r="6.5" fill="${on?t.hd:"none"}" stroke="${t.hd}" stroke-width="2"/>${T(x+32,y+21.5,t.l,{size:13,w:600})}</g>`});
    const py=y0+3*42+34+8;
    if(s.peek>=0&&s.on[PH[s.peek].t]){const p=PH[s.peek],t=TK[p.t];o+=`<rect x="204" y="${y0+126}" width="184" height="34" rx="17" fill="${t.hd}"/>`+T(296,y0+147,"“"+(p.ph.length>20?p.ph.slice(0,19)+"…":p.ph)+"”",{size:12,fill:"#fff",anchor:"middle"})}
    else o+=T(296,y0+147,"Tap a glowing phrase",{size:12,w:500,fill:"var(--rose)",anchor:"middle"})}
  return o}

// ---------- 2 name it
function drawName(){let o="";const p=PH[s.ni],a=s.ans[s.ni],ok=a===p.t,t=TK[p.t];
  const qx=P?12:16,qw=P?376:608,qh=P?178:122;
  o+=card(qx,12,qw,qh,{r:24});
  const ctx=i=>i>=0&&i<LINES.length?`<span class="ctx">${esc(LINES[i])}</span>`:"";
  o+=FO(qx+20,22,qw-40,qh-16,`<span class="ln">Line ${p.l+1} of 12</span>${ctx(p.l-1)}<span class="cur">${lineHTML(p.l,i=>i===s.ni?{cls:ok?"done":""}:null)}</span>${ctx(p.l+1)}`,"ts-quote");
  // choices
  const cols=P?2:4,cw=P?182:141,chh=P?46:44,gap=P?12:11,y0=P?206:150;
  TECH.forEach((tt,i)=>{const r=Math.floor(i/cols),c=i%cols,inRow=Math.min(cols,TECH.length-r*cols);
    const rowW=inRow*cw+(inRow-1)*gap,x0=(W()-rowW)/2,x=x0+c*(cw+gap),y=y0+r*(chh+gap);
    const picked=a===tt.k,right=picked&&ok,wrong=picked&&!ok;
    o+=`<g data-ans="${tt.k}"><rect x="${x}" y="${y}" width="${cw}" height="${chh}" rx="14" fill="${right?tt.hl:wrong?"#FFF0EC":"var(--paper)"}" stroke="${right?tt.hd:wrong?"#F3A08C":"var(--line)"}" stroke-width="${picked?2.2:1.5}"/>
      <circle cx="${x+18}" cy="${y+chh/2}" r="6" fill="${tt.hd}" opacity="${picked?1:.85}"/>${T(x+32,y+chh/2+4.5,tt.l,{size:13,w:600,fill:wrong?"#B2412A":"var(--ink)"})}
      ${right?`<path d="M${x+cw-26},${y+chh/2} l5,5 l9,-10" stroke="${tt.hd}" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`:""}</g>`});
  // feedback
  const fy=P?436:266,fh=P?126:76,fx=P?12:16,fw=P?376:608;
  o+=card(fx,fy,fw,fh,{r:20,fill:ok?t.hl:a?"#FFF3EE":"var(--chalk)",stroke:ok?t.hd:a?"#F3B2A2":"var(--line)",shadow:false});
  const ic=ok?`<circle cx="${fx+30}" cy="${fy+30}" r="16" fill="${t.hd}"/><path d="M${fx+22},${fy+30} l6,6 l10,-12" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
    :a?`<circle cx="${fx+30}" cy="${fy+30}" r="16" fill="#FF6B4A"/><path d="M${fx+24},${fy+24} l12,12 M${fx+36},${fy+24} l-12,12" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`
    :`<circle cx="${fx+30}" cy="${fy+30}" r="16" fill="var(--paper)" stroke="var(--line)" stroke-width="1.5"/>${T(fx+30,fy+36,"?",{size:17,d:1,anchor:"middle",fill:"var(--rose)"})}`;
  o+=ic;
  const msg=ok?`<b style="color:${t.hd}">${esc(t.l)}.</b> ${esc(p.why)}`:a?`<b style="color:#B2412A">Not ${esc(TK[a].l.toLowerCase())}.</b> ${esc(t.hint)}`:`Which technique is the glowing phrase? Pick one.`;
  o+=FO(fx+58,fy+12,fw-70,fh-16,`<p class="ts-sent" style="font-size:${P?15:14.5}px">${msg}</p>`);
  // progress dots
  const dy=P?606:376,step=P?36:40,dx0=W()/2-(PH.length-1)*step/2;
  PH.forEach((q,i)=>{const aa=s.ans[i],good=aa===q.t,bad=aa&&!good,cx=dx0+i*step;
    o+=`<g data-dot="${i}"><circle cx="${cx}" cy="${dy}" r="16" fill="transparent"/>${i===s.ni?`<circle cx="${cx}" cy="${dy}" r="14" fill="none" stroke="var(--ink)" stroke-width="2"/>`:""}<circle cx="${cx}" cy="${dy}" r="9.5" fill="${good?TK[q.t].hd:bad?"#FFD9CF":"var(--paper)"}" stroke="${good?TK[q.t].hd:bad?"#FF6B4A":"var(--line)"}" stroke-width="1.6"/>${T(cx,dy+4,String(i+1),{size:10,w:700,anchor:"middle",fill:good?"#fff":"var(--rose)"})}</g>`});
  o+=T(W()/2,dy+(P?44:42),`${score()} of ${PH.length} right`,{size:13,w:600,anchor:"middle",fill:"var(--body)"});
  return o}

// ---------- 3 zoom: effect
function drawEffect(){let o="";const e=EF.find(x=>x.id===s.ef)||EF[0],p=PH[e.p],t=TK[p.t],g=s.grow;
  const ap=t0=>clamp((g-t0)/0.14);
  const link=(d,pp,col)=>`<path d="${d}" pathLength="1" stroke="${col}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-dasharray="1" stroke-dashoffset="${(1-pp).toFixed(3)}" opacity=".7"/>`;
  const pill=(x,y,w,h,txt,pp,col)=>pp<=0?"":`<g opacity="${pp.toFixed(2)}" transform="translate(${(x+w/2).toFixed(1)} ${(y+h/2).toFixed(1)}) scale(${(0.7+0.3*pp).toFixed(3)}) translate(${(-x-w/2).toFixed(1)} ${(-y-h/2).toFixed(1)})"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h/2}" fill="${col}" stroke="${t.hd}" stroke-width="1.5"/>${T(x+w/2,y+h/2+4.5,txt,{size:13.5,w:600,anchor:"middle"})}</g>`;
  if(!P){
    o+=card(16,160,206,120,{r:22,stroke:t.hd,sw:2});
    o+=FO(32,172,178,104,`<div style="font:600 11px/1.2 'Instrument Sans',sans-serif;letter-spacing:.08em;text-transform:uppercase;color:${t.hd};margin-bottom:8px">${esc(t.l)} · line ${p.l+1}</div><div style="font:600 19px/1.25 'Fredoka','Instrument Sans',sans-serif;color:var(--ink)">“${esc(p.ph)}”</div>`);
    e.words.forEach((w,i)=>{const y=34+i*76,cy=y+20,pp=ap(0.05+i*0.09);
      o+=link(`M222,220 C252,220 250,${cy} 282,${cy}`,pp,t.hd);o+=pill(282,y,150,40,w,pp,t.hl);
      const pf=ap(0.62);o+=link(`M432,${cy} C452,${cy} 444,128 462,128`,pf*(pp>0.99?1:0),"var(--rose)")});
    const pf=ap(0.62),pi=ap(0.8);
    if(pf>0)o+=`<g opacity="${pf.toFixed(2)}"><circle cx="530" cy="128" r="${(40+24*pf).toFixed(1)}" fill="#FFF4C7" stroke="#FFB020" stroke-width="2"/>${LAB(530,112,"Feeling",{anchor:"middle",fill:"#9A6B00"})}${T(530,138,e.feel,{size:e.feel.length>10?15:18,d:1,anchor:"middle"})}</g>`;
    if(pi>0){o+=link(`M530,192 C530,214 536,214 536,236`,pi,"#FFB020");
      o+=`<g opacity="${pi.toFixed(2)}">${card(448,236,176,170,{r:20,fill:"var(--paper)",stroke:"var(--ink)",sw:1.6})}</g>`;
      o+=`<g opacity="${pi.toFixed(2)}">${FO(462,248,150,150,`<div style="font:600 11px/1.2 'Instrument Sans',sans-serif;letter-spacing:.08em;text-transform:uppercase;color:var(--rose);margin-bottom:6px">Big idea</div><div style="font:500 14.5px/1.38 'Instrument Sans',sans-serif;color:var(--ink)">${esc(e.idea)}</div>`)}</g>`}
    o+=T(16,30,"words → a feeling → an idea",{size:12,w:600,fill:"var(--rose)"});
  }else{
    o+=card(30,14,340,104,{r:22,stroke:t.hd,sw:2});
    o+=FO(46,24,308,90,`<div style="font:600 11px/1.2 'Instrument Sans',sans-serif;letter-spacing:.08em;text-transform:uppercase;color:${t.hd};margin-bottom:6px">${esc(t.l)} · line ${p.l+1}</div><div style="font:600 19px/1.25 'Fredoka','Instrument Sans',sans-serif;color:var(--ink)">“${esc(p.ph)}”</div>`);
    const pc=ap(0.02);
    o+=link(`M200,118 L200,146`,pc,t.hd);
    if(pc>0)o+=`<rect x="12" y="146" width="376" height="196" rx="26" fill="${t.hl}" opacity="${(0.35*pc).toFixed(2)}"/>`+LAB(200,170,"It suggests…",{anchor:"middle",fill:t.hd,op:pc.toFixed(2)});
    e.words.forEach((w,i)=>{const r=Math.floor(i/2),c=i%2,last=i===4,x=last?110:28+c*184,y=184+r*50,pp=ap(0.08+i*0.09);
      o+=pill(x,y,last?180:160,38,w,pp,"var(--paper)")});
    const pf=ap(0.62),pi=ap(0.8);
    o+=link(`M200,342 L200,362`,pf,"#FFB020");
    if(pf>0)o+=`<g opacity="${pf.toFixed(2)}"><circle cx="200" cy="414" r="${(34+18*pf).toFixed(1)}" fill="#FFF4C7" stroke="#FFB020" stroke-width="2"/>${LAB(200,400,"Feeling",{anchor:"middle",fill:"#9A6B00"})}${T(200,424,e.feel,{size:e.feel.length>10?15:18,d:1,anchor:"middle"})}</g>`;
    o+=link(`M200,466 L200,492`,pi,"#FFB020");
    if(pi>0)o+=`<g opacity="${pi.toFixed(2)}">${card(30,492,340,150,{r:20,stroke:"var(--ink)",sw:1.6})}${FO(48,506,304,130,`<div style="font:600 11px/1.2 'Instrument Sans',sans-serif;letter-spacing:.08em;text-transform:uppercase;color:var(--rose);margin-bottom:6px">Big idea</div><div style="font:500 16px/1.38 'Instrument Sans',sans-serif;color:var(--ink)">${esc(e.idea)}</div>`)}</g>`;
  }
  return o}

// ---------- 4 shape
function drawShape(){let o="";const gx0=P?44:56,gx1=P?380:612,gy0=P?72:58,gy1=P?320:270,gw=gx1-gx0,gh=gy1-gy0;
  const X=i=>gx0+i*gw/11,Y=v=>gy1-v/10*gh,li=s.line-1;
  o+=`<defs><linearGradient id="ts-g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#FF6B4A" stop-opacity=".55"/><stop offset=".55" stop-color="#FFB020" stop-opacity=".28"/><stop offset="1" stop-color="#2F8FD8" stop-opacity=".18"/></linearGradient></defs>`;
  o+=T(P?12:16,P?28:26,"How tense each line feels",{size:13,w:600,fill:"var(--body)"});
  o+=T(gx0-10,gy0+4,"tense",{size:11,w:600,fill:"#FF6B4A",anchor:"end"})+T(gx0-10,gy1,"calm",{size:11,w:600,fill:"#2F8FD8",anchor:"end"});
  for(let v=0;v<=10;v+=5)o+=`<line x1="${gx0}" x2="${gx1}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)" stroke-dasharray="${v?"3 5":""}"/>`;
  // turning point band
  const tb=X(9),hw=gw/22;
  o+=`<rect x="${tb-hw}" y="${gy0-14}" width="${hw*2}" height="${gh+14}" rx="10" fill="#FFB020" opacity="${li===9?.32:.16}"/>`+T(tb,gy0-20,"TURN",{size:11,w:700,fill:"#9A6B00",anchor:"middle",ls:"1"});
  // smooth curve
  const pts=TEN.map((v,i)=>[X(i),Y(v)]);let d=`M${pts[0][0]},${pts[0][1]}`;
  for(let i=0;i<pts.length-1;i++){const p0=pts[Math.max(0,i-1)],p1=pts[i],p2=pts[i+1],p3=pts[Math.min(pts.length-1,i+2)];
    const c1=[p1[0]+(p2[0]-p0[0])/6,p1[1]+(p2[1]-p0[1])/6],c2=[p2[0]-(p3[0]-p1[0])/6,p2[1]-(p3[1]-p1[1])/6];
    d+=` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`}
  o+=`<path d="${d} L${gx1},${gy1} L${gx0},${gy1}Z" fill="url(#ts-g)"/><path d="${d}" fill="none" stroke="var(--ink)" stroke-width="2.6" stroke-linejoin="round"/>`;
  // marker
  o+=`<line x1="${X(li)}" x2="${X(li)}" y1="${gy0-4}" y2="${gy1}" stroke="var(--ink)" stroke-width="1.5" stroke-dasharray="4 4"/>`;
  pts.forEach(([x,y],i)=>{const cur=i===li;o+=`<g data-line="${i+1}"><rect x="${x-gw/22}" y="${gy0-14}" width="${gw/11}" height="${gh+50}" fill="transparent"/><circle cx="${x}" cy="${y}" r="${cur?10:6}" fill="${cur?"#fff":"var(--paper)"}" stroke="${cur?"var(--ink)":"var(--rose)"}" stroke-width="${cur?3:1.6}"/></g>`;
    o+=T(x,gy1+18,String(i+1),{size:11,w:cur?700:600,anchor:"middle",fill:cur?"var(--ink)":"var(--rose)"})});
  // mood bubble
  const bx=clamp(X(li),gx0+44,gx1-44),by=Y(TEN[li])-26;
  o+=`<rect x="${bx-44}" y="${by-26}" width="88" height="28" rx="14" fill="var(--ink)"/>`+T(bx,by-7.5,MOOD[li],{size:13,anchor:"middle",fill:"#fff"});
  // sections
  const segs=[[0,6,"Tension builds","#FF6B4A"],[7,8,"Warmth","#E89B00"],[9,9,"Turn","#2E2A47"],[10,11,"Release","#2F8FD8"]],ry=gy1+30;
  segs.forEach(([a,b,l,c])=>{const x0=X(a)-gw/22+3,x1=X(b)+gw/22-3;o+=`<rect x="${x0}" y="${ry}" width="${x1-x0}" height="22" rx="11" fill="${c}" opacity="${li>=a&&li<=b?1:.22}"/>`;
    if(x1-x0>40)o+=T((x0+x1)/2,ry+15,l,{size:11,w:700,anchor:"middle",fill:li>=a&&li<=b?"#fff":c})});
  // the line itself
  const cy=P?400:352,ch=P?118:76,cx=P?12:16,cw=P?376:608;
  o+=card(cx,cy,cw,ch,{r:20,shadow:false,fill:li===9?"#FFF4C7":"var(--paper)",stroke:li===9?"#FFB020":"var(--line)"});
  o+=FO(cx+18,cy+12,cw-36,ch-18,`<p class="ts-quote" style="font-size:${P?19:18}px"><span class="ln">Line ${li+1} · ${esc(MOOD[li])}</span>${lineHTML(li,p=>({cls:"done"}))}</p>`);
  return o}

// ---------- 5 theme
function drawTheme(){let o="";const n=strength(),sub=SUBJ.find(x=>x[0]===s.subj),msg=MSG.find(x=>x[0]===s.msg);
  const subW=s.subj?sub[1]:"",msgW=s.msg?msg[1].replace(/^…/,""):"";
  const slot=(x,y,w,h,lab,val,col,ph)=>card(x,y,w,h,{r:18,fill:val?col:"var(--chalk)",stroke:val?"var(--ink)":"var(--line)",sw:val?1.8:1.5,shadow:!!val,extra:val?"":` stroke-dasharray="6 6"`})+LAB(x+16,y+22,lab,{fill:val?"var(--ink)":"var(--rose)"});
  let L;
  if(!P)L={s:[16,16,180,104],m:[212,16,412,104],st:[16,140,608,170],me:[16,330]};
  else L={s:[12,12,376,82],m:[12,106,376,112],st:[12,238,376,232],me:[12,494]};
  o+=`<g data-cyc="subj">`+slot(...L.s,"Subject",subW,"#DDD2FF")+`</g>`;o+=`<g data-cyc="subj">${T(L.s[0]+16,L.s[1]+(P?62:74),subW||"tap",{size:subW?28:20,d:1,fill:subW?"var(--ink)":"var(--rose)"})}</g>`;
  o+=`<g data-cyc="msg">`+slot(...L.m,"What the poem says about it",msgW,"#FFE08A")+`</g>`;
  o+=FO(L.m[0]+16,L.m[1]+30,L.m[2]-30,L.m[3]-34,`<p class="ts-sent" style="font-size:${P?16:17}px;font-weight:600;color:${msgW?"var(--ink)":"#B3B0C4"}">${msgW?esc("…"+msgW):"… tap to try a message"}</p>`);
  // statement
  const [sx,sy,sw,sh]=L.st;o+=card(sx,sy,sw,sh,{r:22,stroke:n===3?"var(--good)":"var(--line)",sw:n===3?2.4:1.5});
  const statement=subW&&msgW?`${subW} ${msgW}`:subW?`${subW} …`:msgW?`… ${msgW}`:"";
  o+=FO(sx+18,sy+14,sw-36,sh-20,`<p class="ts-sent"><span style="font:600 11px/1 'Instrument Sans',sans-serif;letter-spacing:.08em;text-transform:uppercase;color:var(--rose)">Weak</span> <span class="ghost">It’s about ${esc((subW||"time").toLowerCase())}.</span></p>
    <p class="ts-sent" style="margin-top:10px"><span style="font:600 11px/1 'Instrument Sans',sans-serif;letter-spacing:.08em;text-transform:uppercase;color:${n===3?"var(--good)":"var(--rose)"}">Your theme</span><br><span style="font:600 ${P?19:21}px/1.3 'Fredoka','Instrument Sans',sans-serif">${statement?esc(statement):`<span class="hole">Pick a subject and a message</span>`}</span>
    ${n===3?`<span class="ev">Evidence: ${esc(EVID[s.msg])}</span>`:""}</p>`);
  // strength meter
  const [mx,my]=L.me,bw=P?118:194,gap=P?11:13,bh=P?60:76;
  [["Subject",!!s.subj,"#7B61FF"],["Message",!!(s.msg&&s.msg!=="pretty"),"#E89B00"],["Fits the poem",!!(s.subj&&FIT[s.subj].includes(s.msg)),"#2E9E57"]].forEach(([l,on,c],i)=>{const x=mx+i*(bw+gap);
    o+=`<rect x="${x}" y="${my}" width="${bw}" height="${bh}" rx="16" fill="${on?c:"var(--chalk)"}" stroke="${on?c:"var(--line)"}" stroke-width="1.5"/>`;
    o+=on?`<path d="M${x+bw/2-10},${my+bh/2-6} l7,7 l13,-14" stroke="#fff" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`:`<circle cx="${x+bw/2}" cy="${my+bh/2-6}" r="8" fill="none" stroke="var(--line)" stroke-width="2"/>`;
    o+=T(x+bw/2,my+bh-12,l,{size:12,w:700,anchor:"middle",fill:on?"#fff":"var(--rose)"})});
  if(s.msg==="pretty")o+=T(P?200:320,my+bh+(P?28:26),"“Is beautiful” is too vague to be a message.",{size:12.5,w:600,anchor:"middle",fill:"#B2412A"});
  else if(s.subj==="nature")o+=T(P?200:320,my+bh+(P?28:26),"Nature is the setting here. What is it about?",{size:12.5,w:600,anchor:"middle",fill:"#B2412A"});
  return o}

// ---------- 6 two aspects (studied text)
function drawAspects(){let o="";const ok=twoAspects(),same=s.a1&&s.a1===s.a2;
  const node=(x,y,w,h,lab,val,col)=>card(x,y,w,h,{r:20,fill:val?col:"var(--chalk)",stroke:val?col:"var(--line)",sw:1.6,extra:val?"":` stroke-dasharray="6 6"`})
    +LAB(x+w/2,y+24,lab,{anchor:"middle",fill:val?"rgba(255,255,255,.85)":"var(--rose)"})+T(x+w/2,y+h/2+16,val||"?",{size:20,d:1,anchor:"middle",fill:val?"#fff":"var(--line)"});
  const A1=s.a1?ASP.find(a=>a[0]===s.a1)[1]:"",A2=s.a2?ASP.find(a=>a[0]===s.a2)[1]:"";
  const arrow=(d,on)=>`<path d="${d}" fill="none" stroke="${on?"var(--ink)":"var(--line)"}" stroke-width="2.4" stroke-linecap="round" marker-end="url(#ts-ar${on?1:0})"/>`;
  o+=`<defs>${[0,1].map(k=>`<marker id="ts-ar${k}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10z" fill="${k?"var(--ink)":"var(--line)"}"/></marker>`).join("")}</defs>`;
  let th;
  if(!P){
    o+=node(16,24,190,92,"Aspect 1",A1,ASPC[s.a1]);o+=node(16,140,190,92,"Aspect 2",A2,ASPC[s.a2]);
    o+=arrow("M206,70 C240,70 236,118 264,118",!!s.a1);o+=arrow("M206,186 C240,186 236,146 264,146",!!s.a2);
    o+=card(266,84,170,96,{r:48,fill:"#2E2A47",stroke:"#2E2A47"})+LAB(351,118,"Writer’s purpose",{anchor:"middle",fill:"rgba(255,255,255,.75)"})+T(351,148,PURPW[s.purp].replace(/ (about|us)$/,""),{size:16,d:1,anchor:"middle",fill:"#fff"});
    o+=arrow("M436,132 L474,132",ok);
    o+=card(480,84,144,96,{r:20,fill:ok?"#DFF5EC":"var(--chalk)",stroke:ok?"var(--good)":"var(--line)"})+LAB(552,118,"Our world",{anchor:"middle",fill:ok?"var(--good)":"var(--rose)"})+T(552,148,"today",{size:17,d:1,anchor:"middle",fill:ok?"var(--ink)":"var(--line)"});
    if(same)o+=`<rect x="226" y="198" width="210" height="30" rx="15" fill="#FFF0EC" stroke="#F3A08C"/>`+T(331,218,"Same aspect twice. Pick another.",{size:12.5,w:700,anchor:"middle",fill:"#B2412A"});
    th=[16,256,608,170];
  }else{
    o+=node(12,12,182,96,"Aspect 1",A1,ASPC[s.a1]);o+=node(206,12,182,96,"Aspect 2",A2,ASPC[s.a2]);
    o+=arrow("M103,108 C103,140 180,140 192,160",!!s.a1);o+=arrow("M297,108 C297,140 220,140 208,160",!!s.a2);
    o+=card(100,166,200,84,{r:42,fill:"#2E2A47",stroke:"#2E2A47"})+LAB(200,196,"Writer’s purpose",{anchor:"middle",fill:"rgba(255,255,255,.75)"})+T(200,224,PURPW[s.purp].replace(/ (about|us)$/,""),{size:16,d:1,anchor:"middle",fill:"#fff"});
    o+=arrow("M200,250 L200,280",ok);
    o+=card(110,286,180,64,{r:20,fill:ok?"#DFF5EC":"var(--chalk)",stroke:ok?"var(--good)":"var(--line)"})+LAB(200,312,"Our world",{anchor:"middle",fill:ok?"var(--good)":"var(--rose)"})+T(200,336,"today",{size:16,d:1,anchor:"middle",fill:ok?"var(--ink)":"var(--line)"});
    if(same)o+=`<rect x="70" y="362" width="260" height="30" rx="15" fill="#FFF0EC" stroke="#F3A08C"/>`+T(200,382,"Same aspect twice. Pick another.",{size:12.5,w:700,anchor:"middle",fill:"#B2412A"});
    th=[12,404,376,236];
  }
  const sl=(k,txt)=>k?`<span class="slot" style="background:${ASPC[k]}26;box-shadow:inset 0 -2px 0 ${ASPC[k]}">${esc(txt)}</span>`:`<span class="hole">[aspect]</span>`;
  o+=card(...th,{r:22,stroke:ok?"var(--good)":"var(--line)",sw:ok?2.2:1.5});
  o+=FO(th[0]+18,th[1]+14,th[2]-36,th[3]-20,`<p class="ts-sent"><span style="font:600 11px/1 'Instrument Sans',sans-serif;letter-spacing:.08em;text-transform:uppercase;color:${ok?"var(--good)":"var(--rose)"}">Thesis skeleton · fill the brackets</span></p>
    <p class="ts-sent" style="margin-top:8px;font-size:${P?16:17}px;line-height:1.5">In <span class="hole">[your text]</span>, <span class="hole">[the writer]</span> uses ${sl(s.a1,s.a1?ASPW[s.a1]:"")} and ${sl(s.a2,s.a2?ASPW[s.a2]:"")} to <b>${esc(PURPW[s.purp])}</b> <span class="hole">[the big idea]</span>, which still matters today because <span class="hole">[a link to our world]</span>.</p>`);
  return o}

// ---------- 7 test board
function drawTest(){let o="";const C=CH();
  const cols=P?1:2,tw=P?376:296,th=P?150:190,gap=P?12:16,x0=P?12:16,y0=P?12:16;
  C.forEach((c,i)=>{const x=x0+(i%cols)*(tw+gap),y=y0+Math.floor(i/cols)*(th+gap),done=c.done,fr=clamp(c.frac);
    o+=`<g data-go="${c.step}">${card(x,y,tw,th,{r:22,fill:done?"#DFF5EC":"var(--paper)",stroke:done?"var(--good)":"var(--line)",sw:done?2:1.5})}`;
    const rx=x+(P?52:56),ry=y+(P?th/2:66),R=P?32:34,circ=2*Math.PI*R;
    o+=`<circle cx="${rx}" cy="${ry}" r="${R}" fill="none" stroke="${done?"#B9E6D2":"var(--fill)"}" stroke-width="8"/><circle cx="${rx}" cy="${ry}" r="${R}" fill="none" stroke="${done?"var(--good)":c.col}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${(circ*fr).toFixed(1)} ${circ.toFixed(1)}" transform="rotate(-90 ${rx} ${ry})"/>`;
    o+=done?`<path d="M${rx-11},${ry} l8,8 l15,-17" stroke="var(--good)" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`:T(rx,ry+7,String(i+1),{size:22,d:1,anchor:"middle"});
    const tx=P?x+104:x+22,ty=P?y+50:y+130;
    o+=T(tx,ty,c.title,{size:18,d:1})+T(tx,ty+24,c.status,{size:13,w:600,fill:done?"var(--good)":"var(--body)"});
    o+=T(tx,ty+(P?52:46),done?"Done":"Go to "+c.lab+" →",{size:12,w:700,fill:done?"var(--good)":"var(--rose)"})+`</g>`});
  return o}

const STEPI=k=>steps.findIndex(x=>x.k===k);
function CH(){const n=litCount(),sc=score(),st=strength();return [
  {title:"Light the lightbox",status:`${n} of 7 techniques on`,frac:n/7,done:n===7,step:STEPI("spot"),lab:"Lightbox",col:"#FF6B4A"},
  {title:"Name 5 phrases",status:`${sc} named correctly`,frac:sc/5,done:sc>=5,step:STEPI("name"),lab:"Name it",col:"#2F8FD8"},
  {title:"Find the turn",status:`Marker on line ${s.line}`,frac:1-Math.abs(s.line-10)/9,done:s.line===10,step:STEPI("shape"),lab:"Shape",col:"#FFB020"},
  {title:"A strong theme",status:`Strength ${st} of 3`,frac:st/3,done:st===3,step:STEPI("theme"),lab:"Theme",col:"#7B61FF"}]}

// on phones each step's drawing is only as tall as it needs to be
const PH_H={spot:680,name:680,effect:656,shape:534,theme:596,aspects:652,test:660};
function fitBox(k){const el=document.getElementById("k-main");if(!el)return;const vb=`0 0 ${W()} ${P?(PH_H[k]||H()):H()}`;if(el.getAttribute("viewBox")!==vb)el.setAttribute("viewBox",vb)}
function drawMain(x,st){fitBox(st.k);
  switch(st.k){case "spot":return drawSpot();case "name":return drawName();case "effect":return drawEffect();case "shape":return drawShape();
    case "theme":return drawTheme();case "aspects":return drawAspects();default:return drawTest()}}

const steps=[
  {k:"spot",lab:"Lightbox",cap:"Switch on a technique and watch it glow in the poem. Tap a glowing phrase to see its name.",
    controls:[...TECH.map(t=>"t_"+t.k),"allon","clear"],chips:["lit","phr","lines"],
    exam:"The poet personifies the estuary, which “breathes out at dawn”, so the place feels alive but tired before the day has even begun.",
    trap:"Naming a technique earns little on its own: quote the exact words and say what they do.",
    big:"Techniques are the writer’s tools; marks come from explaining what each one does to us."},
  {k:"name",lab:"Name it",cap:"One glowing phrase at a time. Pick the technique that fits.",
    controls:["prev","next",...TECH.map(t=>"a_"+t.k)],chips:["ph","right","done"],
    exam:"The simile “like a sheet of tinfoil” makes the mud look bright, flat and artificial, so the morning feels harsh rather than beautiful.",
    trap:"Similes and metaphors both compare; only a simile uses “like” or “as”.",
    big:"Naming is step one; the effect on the reader is what the exam rewards."},
  {k:"effect",lab:"Zoom in",cap:"Pick a phrase and watch its meanings grow: words, then a feeling, then a big idea.",speed:1,
    controls:["ef","grow"],chips:["tech","feel","words"],
    onStep:()=>{s.grow=calm()?1:0;s.playing=!calm()},
    exam:"The repetition in “grip and grip and grip” suggests desperate holding on, as if the mangroves are afraid to let go. It builds an anxious mood that hints at the grandfather holding on to time.",
    trap:"Skip “it makes the reader want to read on”: say what the words make us feel and think.",
    big:"Connotations are the feelings a word carries beyond its dictionary meaning."},
  {k:"shape",lab:"Shape",cap:"Slide through the poem. Tension builds as the tide goes out, then one short line turns it.",
    controls:["line"],chips:["line","mood","ten"],
    exam:"The poem turns at the short sentence “Then the water turns.” After it, the harsh, tense images give way to soft, calm ones, showing acceptance.",
    trap:"Structure isn’t “it has twelve lines”: explain where the mood shifts and why.",
    big:"A turning point is where a poem changes direction, mood or idea."},
  {k:"theme",lab:"Theme",cap:"A theme is a subject plus what the text says about it. Build one strong enough for the exam.",
    controls:["subj","msg"],chips:["str","subj"],
    exam:"The poem suggests that time can’t be held back, however tightly we grip, but that it can be met calmly, like the tide that returns “soft, certain”.",
    trap:"One word, like “time”, is a topic, not a theme: add what the text says about it.",
    big:"Theme = subject + message + evidence."},
  {k:"aspects",lab:"Two aspects",cap:"For your studied text: pick two different aspects and link them to the writer’s purpose and our world.",
    controls:["a1","a2","purp"],chips:["two","purp"],
    exam:"In my studied text, the writer uses the setting and a recurring symbol to warn us about [the big idea], a warning that still matters today because [a link to our world].",
    trap:"“Character” and “characters” are one aspect twice: pick two different, specific aspects.",
    big:"Strong 91925 answers link both aspects to why the text was written and why it still matters."},
  {k:"test",lab:"Test yourself",cap:"Four quick wins. Tap a tile to jump back to its step.",controls:[],chips:["met"]}];

const tog=k=>({type:"toggle",id:"t_"+k,label:TK[k].l,get:()=>s.on[k],set:(x,v)=>{s.on[k]=v;s.fresh=v?k:"";if(!v&&s.peek>=0&&PH[s.peek].t===k)s.peek=-1}});
const ans=k=>({type:"toggle",id:"a_"+k,label:TK[k].l,get:()=>s.ans[s.ni]===k,set:()=>{s.ans[s.ni]=k;K.sfx(PH[s.ni].t===k?"ding":"buzz")}});
const api=K.mount({
  eyebrow:"English · Unfamiliar and studied texts",title:"The text studio",crumb:"NCEA Level 1 English · unfamiliar texts (91927) and studied text (91925)",homeHash:"l1",
  fig:"FIG. 01 · A POEM ON THE LIGHTBOX",railTitle:"Read a text like an examiner",
  badge:{label:"NCEA L1 English 91927",exam:"2026-11-17T09:30:00+13:00",examText:"Tue 17 Nov, 9:30am"},
  mainBox:`0 0 ${W()} ${H()}`,mainLabel:"The poem Low Tide on a lightbox, with techniques highlighted",
  state:s,steps,
  controls:[...TECH.map(t=>tog(t.k)),
    {type:"button",id:"allon",label:"All on",onClick:()=>{TECH.forEach(t=>s.on[t.k]=true);s.fresh=""}},
    {type:"button",id:"clear",label:"Clear",onClick:()=>{TECH.forEach(t=>s.on[t.k]=false);s.peek=-1;s.fresh=""}},
    {type:"button",id:"prev",label:"← Back",onClick:()=>{s.ni=(s.ni+PH.length-1)%PH.length}},
    {type:"button",id:"next",label:"Next phrase →",onClick:()=>{s.ni=(s.ni+1)%PH.length}},
    ...TECH.map(t=>ans(t.k)),
    {type:"select",id:"ef",label:"Phrase",options:EF.map(e=>[e.id,"“"+PH[e.p].ph+"”"]),get:()=>s.ef,set:(x,v)=>{s.ef=v;s.grow=calm()?1:0;s.playing=!calm()}},
    {type:"button",id:"grow",label:"Grow it again",onClick:()=>{s.grow=calm()?1:0;s.playing=!calm()}},
    {type:"range",id:"line",label:"Line",min:1,max:12,step:1,get:()=>s.line,set:(x,v)=>{s.line=v},fmt:()=>`${s.line} · ${MOOD[s.line-1]}`},
    {type:"select",id:"subj",label:"Subject",options:SUBJ,get:()=>s.subj,set:(x,v)=>{s.subj=v}},
    {type:"select",id:"msg",label:"Message",options:MSG,get:()=>s.msg,set:(x,v)=>{s.msg=v}},
    {type:"select",id:"a1",label:"Aspect 1",options:ASP,get:()=>s.a1,set:(x,v)=>{s.a1=v}},
    {type:"select",id:"a2",label:"Aspect 2",options:ASP,get:()=>s.a2,set:(x,v)=>{s.a2=v}},
    {type:"select",id:"purp",label:"Purpose",options:PURP.map(p=>[p[0],p[1].replace(/^./,c=>c.toUpperCase())]),get:()=>s.purp,set:(x,v)=>{s.purp=v}}],
  tick:(x,dt)=>{s.grow=Math.min(1,s.grow+dt/1.8);if(s.grow>=1)s.playing=false},
  drawMain,
  chips:()=>{const e=EF.find(x=>x.id===s.ef)||EF[0],n=litCount(),sc=score(),st=strength(),met=CH().filter(c=>c.done).length;
    const litLines=new Set(PH.filter(p=>s.on[p.t]).map(p=>p.l)).size;return{
    lit:["Techniques on",`${n} of 7`,n===7],phr:["Phrases glowing",String(PH.filter(p=>s.on[p.t]).length)],lines:["Lines lit",`${litLines} of 12`],
    ph:["Phrase",`${s.ni+1} of ${PH.length}`],right:["Correct",`${sc} of ${PH.length}`,sc>=5],done:["Answered",`${answered()} of ${PH.length}`],
    tech:["Technique",TK[PH[e.p].t].l],feel:["Feeling",e.feel,s.grow>=0.62],words:["Connotations","5"],
    line:["Line",`${s.line} of 12`],mood:["Mood",MOOD[s.line-1],s.line===10],ten:["Tension",`${TEN[s.line-1]} / 10`],
    str:["Strength",`${st} of 3`,st===3],subj:["Subject",s.subj?SUBJ.find(x=>x[0]===s.subj)[1]:"none yet"],
    two:["Two aspects",twoAspects()?"different ✓":s.a1&&s.a1===s.a2?"same twice":"pick both",twoAspects()],purp:["Purpose",PURPW[s.purp].replace(/ (about|us)$/,"")],
    met:["Challenges met",`${met} of 4`,met===4]}},
  challenges:[
    {q:"Light up all seven techniques on the lightbox at once.",check:()=>litCount()===7,ok:"All seven glowing: that’s a full set of evidence.",no:()=>`${litCount()} of 7 on. Go to Lightbox and switch on the rest.`},
    {q:"Name at least 5 phrases correctly in Name it.",check:()=>score()>=5,ok:"Five or more named. Now say what each one does.",no:()=>`${score()} right so far. Use the hints in Name it.`},
    {q:"Put the Shape marker on the poem’s turning point.",check:()=>s.line===10,ok:"Line 10: “Then the water turns.” The shortest sentence is the turn.",no:()=>`Line ${s.line} isn’t it. Look for the shortest sentence, where the mood flips.`},
    {q:"Build a theme statement with strength 3 of 3.",check:()=>strength()===3,ok:"Subject, message and evidence: that’s a theme.",no:()=>strength()===0?"Pick a subject and a message in Theme.":`Strength ${strength()} of 3. Make the message specific and true to the poem.`}],
  papers:[{label:"NZQA: English",url:"https://www2.nzqa.govt.nz/ncea/subjects/past-exams-and-exemplars/english/"}],
  truth:"“Low Tide” is an original poem written for assembly. The techniques, moods and themes shown are one valid reading; other well-argued readings can earn the same credit.",
  footer:"Covers AS 91927 (language features, structure, purpose and ideas in unfamiliar texts, with evidence) and AS 91925 (two specific aspects of a studied text, linked to purpose and the wider world)."
});

// colour the technique switches with their highlighter
document.querySelectorAll("#k-ctl .btn.tog").forEach(b=>{const t=TECH.find(x=>x.l===b.textContent.trim());if(t){b.classList.add("hc");b.style.setProperty("--hl",t.hl);b.style.setProperty("--hd",t.hd)}});
// tap the drawing too (every choice is also in the controls above)
const main=document.getElementById("k-main");
main.addEventListener("click",e=>{const g=e.target.closest("[data-tog],[data-p],[data-ans],[data-dot],[data-line],[data-go],[data-cyc]");if(!g)return;const d=g.dataset,k=api.step.k;
  if(d.tog){s.on[d.tog]=!s.on[d.tog];s.fresh=s.on[d.tog]?d.tog:"";if(!s.on[d.tog]&&s.peek>=0&&PH[s.peek].t===d.tog)s.peek=-1;K.sfx("pop")}
  else if(d.ans){s.ans[s.ni]=d.ans;K.sfx(PH[s.ni].t===d.ans?"ding":"buzz")}
  else if(d.dot){s.ni=+d.dot;K.sfx("tick")}
  else if(d.line){s.line=+d.line;K.sfx("tick")}
  else if(d.cyc){const L=d.cyc==="subj"?SUBJ:MSG,i=L.findIndex(x=>x[0]===s[d.cyc]);s[d.cyc]=L[1+(Math.max(0,i))%(L.length-1)][0];K.sfx("pop")}
  else if(d.go){K.sfx("whoosh");api.setStep(+d.go);return}
  else if(d.p!=null&&k==="spot"){s.peek=+d.p;K.sfx("pop")}
  else return;
  api.redraw()});
// phones get a tall layout of the same drawings
try{mq&&mq.addEventListener("change",()=>{P=mq.matches;api.redraw()})}catch(e){}
try{document.fonts&&document.fonts.ready.then(()=>api.redraw())}catch(e){}
})();
