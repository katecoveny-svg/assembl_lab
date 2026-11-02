(()=>{
// The quote-to-point machine (NCEA Level 2 English 91098): three short original texts, a question about a specified aspect,
// and four slots: claim → evidence → explanation → so what. Drag a quote into the evidence slot, pick the lines that fit,
// and the paragraph assembles live. A self-check rubric (Achieved / Merit / Excellence, paraphrased) rates what you built.
// Every passage here is original, written for this machine; nothing is quoted from a published text.
const esc=StudyKit.esc,sfx=n=>{try{StudyKit.sfx(n)}catch(e){}};
const F=StudyKit.fig,PAL=F.palette,TINT=PAL.case.blush,PR=PAL.product;
const lite=(h,k)=>{const n=parseInt(h.slice(1),16),f=v=>Math.round(v+(255-v)*k).toString(16).padStart(2,"0");return "#"+f(n>>16&255)+f(n>>8&255)+f(n&255)};
const INK="#262E5C",ROSE="#6E6A86",PAPER="#FFFDF8";
const SLOTC={claim:lite(PR.blueberry,.55),ev:lite(PR.butter,.5),ex:lite(PR.lime,.5),so:lite(PR.strawberry,.55)};
const TECHC=[lite(PR.strawberry,.5),lite(PR.blueberry,.5),lite(PR.butter,.45),lite(PR.lime,.5),PAL.case.lavender,lite(PR.peach,.45)];
const mq=matchMedia("(max-width:820px)");const PH=()=>mq.matches;
const Z=()=>PH()?{h2:28,body:23,read:22,small:19,tiny:16}:{h2:22,body:17,read:17.5,small:14,tiny:12};
let _mc=null;function tw(t,size,wt=400,mono=false){try{_mc=_mc||document.createElement("canvas").getContext("2d");_mc.font=`${wt} ${size}px ${mono?'"IBM Plex Mono",ui-monospace,monospace':'"Instrument Sans",system-ui,sans-serif'}`;return _mc.measureText(t).width}catch(e){return String(t).length*size*(mono?0.6:0.52)}}
const DISP="var(--display)",MONO="var(--mono)";
const T=(x,y,t,size,o={})=>`<text x="${x}" y="${y}"${o.a?` text-anchor="${o.a}"`:""} style="font:${o.wt||400} ${size}px ${o.mono?MONO:DISP};fill:${o.fill||INK}${o.ls?`;letter-spacing:${o.ls}px`:""}${o.op!=null?`;opacity:${o.op}`:""}">${esc(t)}</text>`;
// word-wrapped text with per-segment styling (background, weight, tap target); returns markup and height
function flow(segs,o){const size=o.size,lh=o.lh||size*1.35,sty=o.sty||(()=>({})),P=[];let pend=true;
  segs.forEach(sg=>String(sg.t).split(/(\n+|[ \t]+)/).forEach(pt=>{if(!pt)return;if(/^\n+$/.test(pt)){P.push({br:pt.length});pend=true;return}if(/^[ \t]+$/.test(pt)){pend=true;return}P.push({t:pt,k:sg.k,glue:!pend&&P.length>0&&!P[P.length-1].br});pend=false}));
  const sp=tw(" ",size,o.wt||400);const lines=[[]];let cx=0;const U=[];
  P.forEach(p=>{if(p.br){U.push({br:p.br});return}if(p.glue&&U.length&&!U[U.length-1].br)U[U.length-1].ps.push(p);else U.push({ps:[p]})});
  U.forEach(u=>{if(u.br){lines.push([]);if(u.br>1)lines[lines.length-1].gap=true;cx=0;return}u.ps.forEach(p=>{const st=sty(p.k)||{};p.st=st;p.w=tw(p.t,size,st.wt||o.wt||400)});const uw=u.ps.reduce((a,p)=>a+p.w,0);
    if(cx>0&&cx+sp+uw>o.w){lines.push([]);cx=0}let x=cx>0?cx+sp:0;u.ps.forEach(p=>{p.x=x;x+=p.w;lines[lines.length-1].push(p)});cx=x});
  let yy=o.y;const bgs=[],txt=[],hit=[];
  lines.forEach(L=>{if(L.gap)yy+=lh*0.45;const base=yy+lh/2+size*0.34,top=yy+(lh-size*1.32)/2;
    L.forEach((p,j)=>{const st=p.st,pv=L[j-1],x0=o.x+p.x,first=!pv||pv.k!==p.k||p.k==null;
      if(first&&(st.bg||st.data)){let e=j;while(L[e+1]&&L[e+1].k===p.k&&p.k!=null)e++;const xe=o.x+L[e].x+L[e].w;
        if(st.bg)bgs.push(`<rect x="${x0-3.5}" y="${top}" width="${xe-x0+7}" height="${size*1.32}" rx="5" fill="${st.bg}"/>`);
        if(st.data)hit.push(`<rect x="${x0-3}" y="${yy}" width="${xe-x0+6}" height="${lh}" fill="transparent" data-a="${st.data}" style="cursor:pointer"/>`)}
      txt.push(`<text x="${x0}" y="${base}" style="font:${st.wt||o.wt||400} ${size}px ${DISP};fill:${st.fill||o.fill||INK}${st.op!=null?`;opacity:${st.op}`:""}">${esc(p.t)}</text>`)});
    yy+=lh});
  return{o:bgs.join("")+txt.join("")+hit.join(""),h:yy-o.y,n:lines.length}}
function fitFlow(segs,o,maxH,minSize){let sz=o.size,r;for(let i=0;i<9;i++){r=flow(segs,{...o,size:sz,lh:sz*(o.lhf||1.3)});if(r.h<=maxH||sz<=minSize)break;sz*=0.94}return r}
const key=(x,y,w,h,col,o={})=>F.box(x,y,w,h,{colour:col,kind:"plastic",d:o.d||5,r:o.r!=null?o.r:Math.min(h/2,10),shadow:false,sw:o.sw,stroke:o.stroke});
function board(ax,ay,aw,ah,px,py,pw,ph){let o=F.acrylic(ax,ay,aw,ah,{tint:TINT,d:10,r:14,shadow:false,balls:true,opacity:.5});
  o+=`<rect x="${px+5}" y="${py+6}" width="${pw}" height="${ph}" rx="5" fill="${PAL.shadow}" opacity=".14"/><rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="5" fill="${PAPER}" stroke="#E4DCCF" stroke-width="1.2"/>`;return o}

// ---------- three original texts. Each quote carries a technique and how well it serves the arguable claim (s: 2 strong, 1 fair, 0 weak).
const TEXTS={
 ferry:{title:"The Last Ferry",form:"SHORT STORY (EXTRACT)",by:"original, written for this machine",aspect:"setting",
  q:"Analyse how the writer uses setting to show a character changing.",
  s:["The ferry pushed off at 8:40 and [[the island folded itself into the dark behind us|q1]].","I had made this trip a hundred times, but tonight [[the water looked like something I was leaving rather than something I was crossing|q2]].",
     "The lights of the city came up ahead, hard and certain, [[every window a question I couldn't answer yet|q3]].","In my pocket the key to the flat was warm from my hand.","[[Mum had said the island would still be there.|q6]]","The ferry didn't slow.","By the time we passed the harbour bridge, [[I had stopped looking back|q5]]."],
  quotes:{q1:{t:"the island folded itself into the dark behind us",tech:"Personification",s:2},q2:{t:"the water looked like something I was leaving rather than something I was crossing",tech:"Contrast",s:2},q3:{t:"every window a question I couldn't answer yet",tech:"Metaphor",s:2},q4:{t:"The ferry pushed off at 8:40",tech:"Plain detail",s:0},q5:{t:"I had stopped looking back",tech:"Short sentence",s:2},q6:{t:"Mum had said the island would still be there",tech:"Reported speech",s:1}},
  claims:[{id:"c1",t:"The writer uses the harbour crossing to show Tane turning from the island he knows toward an unknown future.",kind:"arguable",s:2},{id:"c2",t:"Tane catches the last ferry to the city at 8:40 and arrives after passing the bridge.",kind:"retells",s:0},{id:"c3",t:"The writer uses lots of setting to make the story interesting.",kind:"vague",s:1}],
  explains:[{id:"e1",q:"q1",s:2,t:"Personifying the island as 'folding' itself away makes home seem to withdraw on its own, so leaving feels like something done to Tane as much as by him."},{id:"e2",q:"q2",s:2,t:"The contrast between 'leaving' and 'crossing' turns a familiar trip into a one-way journey: the same water now means change."},{id:"e3",q:"q3",s:2,t:"The city's windows as 'questions' make the new setting feel demanding and uncertain, the opposite of the island behind him."},{id:"e5",q:"q5",s:2,t:"The blunt final sentence shows the change is complete: the setting behind him no longer holds his attention."},{id:"e6",q:"q6",s:1,t:"Mum's reassurance sets the island up as a constant, which makes Tane's decision to stop looking back more deliberate."},{id:"e4",q:"q4",s:0,t:"This tells us the time the ferry left."},{id:"e0",q:"*",s:0,t:"This shows the setting is important to the story."}],
  sowhats:[{id:"s1",s:2,t:"The writer suggests that growing up means letting a place become memory, a shift many readers in Aotearoa, where leaving a small place for a city is common, will recognise."},{id:"s2",s:1,t:"This makes the reader feel sad for Tane as he leaves."},{id:"s3",s:0,t:"This is an effective technique used by the writer."}]},
 salt:{title:"Salt Lines",form:"POEM",by:"original, written for this machine",aspect:"language features",
  q:"Analyse how the writer uses language features to develop an idea about memory.",
  s:["[[My nan's hands are maps of the harbour,|q1]]\n[[each knuckle a reef, each scar a channel|q2]]\nwhere the tide once caught her.\n[[She shells pipi at the sink|q6]]\nand [[the kitchen smells of low water.|q3]]\n[[When she forgets my name|q4]]\nI hold the hand that taught mine\nand [[read it back to her, line by line.|q5]]"],
  quotes:{q1:{t:"My nan's hands are maps of the harbour",tech:"Metaphor",s:2},q2:{t:"each knuckle a reef, each scar a channel",tech:"Extended metaphor, repetition",s:2},q3:{t:"the kitchen smells of low water",tech:"Sensory imagery",s:1},q4:{t:"When she forgets my name",tech:"Plain statement",s:1},q5:{t:"read it back to her, line by line",tech:"Metaphor",s:2},q6:{t:"She shells pipi at the sink",tech:"Plain detail",s:0}},
  claims:[{id:"c1",t:"The poet suggests memory lives in the body and in shared work, so it can be read back even when words fail.",kind:"arguable",s:2},{id:"c2",t:"The poem describes a nan who shells pipi and has scarred hands.",kind:"retells",s:0},{id:"c3",t:"The poet uses metaphors to show that the nan is old.",kind:"vague",s:1}],
  explains:[{id:"e1",q:"q1",s:2,t:"Making the hands a 'map' turns a lifetime of harbour work into something that can be read, so her history is written on her body."},{id:"e2",q:"q2",s:2,t:"The repeated 'each… each…' builds the map detail by detail, making every mark a record of a moment the sea left on her."},{id:"e5",q:"q5",s:2,t:"Reversing the roles, the grandchild now 'reads' the hand, which suggests memory can be handed back by touch when names are lost."},{id:"e3",q:"q3",s:1,t:"The smell of 'low water' makes the memory sensory and specific, tying the kitchen to the tide."},{id:"e4",q:"q4",s:1,t:"The plain line about forgetting a name breaks the metaphor for a moment, so the loss lands as fact."},{id:"e6",q:"q6",s:0,t:"This shows she likes shellfish."},{id:"e0",q:"*",s:0,t:"This shows the poet uses language features well."}],
  sowhats:[{id:"s1",s:2,t:"The poet's purpose is to reframe forgetting: what is lost in words survives in hands and habits, a comfort for any whānau facing dementia."},{id:"s2",s:1,t:"This makes readers feel the love between the nan and the grandchild."},{id:"s3",s:0,t:"This is a good use of metaphor."}]},
 steps:{title:"Nine Hundred Steps",form:"PERSONAL ESSAY (EXTRACT)",by:"original, written for this machine",aspect:"structure",
  q:"Analyse how the writer uses structure to show a relationship.",
  s:["[[Dad counted the steps out loud, the way he used to count my push-ups.|q1]]","At three hundred he stopped counting and started breathing.","[[The track up Rangitoto is black scoria|q5]], loose as marbles, and [[every third step slides back half of what it gains|q2]].",
     "[[I walked behind him so he wouldn't see me watching.|q3]]","[[Six months earlier a surgeon had held his heart in her hands. Now he held the rail.|q4]]","At the summit he didn't say anything about the view.","He said, 'Nine hundred and twelve,' and sat down, and [[I pretended the wind was why my eyes stung|q6]]."],
  quotes:{q1:{t:"Dad counted the steps out loud, the way he used to count my push-ups",tech:"Flashback, comparison",s:2},q2:{t:"every third step slides back half of what it gains",tech:"Imagery",s:1},q3:{t:"I walked behind him so he wouldn't see me watching",tech:"Narrative position",s:2},q4:{t:"Six months earlier a surgeon had held his heart in her hands. Now he held the rail.",tech:"Juxtaposition, short sentences",s:2},q5:{t:"The track up Rangitoto is black scoria",tech:"Plain detail",s:0},q6:{t:"I pretended the wind was why my eyes stung",tech:"Understatement",s:2}},
  claims:[{id:"c1",t:"By moving between past and present, the writer shows the child becoming the one who watches over the parent.",kind:"arguable",s:2},{id:"c2",t:"The writer and their dad climb Rangitoto and count nine hundred and twelve steps.",kind:"retells",s:0},{id:"c3",t:"The writer uses structure to make the essay emotional.",kind:"vague",s:1}],
  explains:[{id:"e1",q:"q1",s:2,t:"Opening with Dad counting, as he once counted push-ups, sets up the old roles so the reversal later lands harder."},{id:"e4",q:"q4",s:2,t:"Placing 'held his heart' beside 'held the rail' in two short sentences compresses six months into one contrast: strength has become fragility."},{id:"e3",q:"q3",s:2,t:"Putting the narrator behind, 'watching', swaps the roles inside the structure: the child is now the guardian."},{id:"e6",q:"q6",s:2,t:"Ending on understatement, the writer leaves the emotion for the reader to supply, which makes the final reversal quiet and complete."},{id:"e2",q:"q2",s:1,t:"The sliding steps mirror recovery: progress, then slipping back, so the climb stands in for the months before it."},{id:"e5",q:"q5",s:0,t:"This describes what the track is made of."},{id:"e0",q:"*",s:0,t:"This shows the structure is effective."}],
  sowhats:[{id:"s1",s:2,t:"The writer's purpose is to show that caring for a parent arrives quietly, in small reversals, an experience many readers will meet as their own parents age."},{id:"s2",s:1,t:"This makes the reader feel the love between father and child."},{id:"s3",s:0,t:"This shows the writer is good at describing things."}]}};
const ORDER=["ferry","salt","steps"];
const s={text:"ferry",seen:{},claim:null,ev:null,ex:null,so:null,active:"ev",drag:null,dragPos:null,ticks:{}};
const TX=()=>TEXTS[s.text];
const find=(list,id)=>list.find(x=>x.id===id);
// ---- scoring: each slot 0–2, eight in all. The machine's estimate, never an NZQA grade.
function score(){const t=TX(),c=s.claim?find(t.claims,s.claim).s:0,ev=s.ev?t.quotes[s.ev].s:0;let ex=0;if(s.ex){const e=find(t.explains,s.ex);ex=e.q==="*"?0:e.q===s.ev?e.s:0}const so=s.so?find(t.sowhats,s.so).s:0;
  const n=c+ev+ex+so;return{c,ev,ex,so,n,level:n>=7?"Excellence-like":n>=5?"Merit-like":n>=3?"Achieved-like":"Not yet",short:n>=7?"like E":n>=5?"like M":n>=3?"like A":"not yet",full:!!(s.claim&&s.ev&&s.ex&&s.so)}}
function paragraph(){const t=TX();const bits=[];if(s.claim)bits.push({t:find(t.claims,s.claim).t,k:"claim"});if(s.ev)bits.push({t:`The writer writes, "${t.quotes[s.ev].t}."`,k:"ev"});if(s.ex)bits.push({t:find(t.explains,s.ex).t,k:"ex"});if(s.so)bits.push({t:find(t.sowhats,s.so).t,k:"so"});return bits}
function segsOf(doc){const out=[];doc.s.forEach((sen,i)=>{let t=sen;if(i&&!t.startsWith("\n"))out.push({t:" "});t.replace(/\[\[([^|\]]+)\|([^\]]+)\]\]|([^\[]+)/g,(m,a,b,c)=>{out.push(a?{t:a,k:b}:{t:c,k:""});return""})});return out}
const techIndex=id=>Object.keys(TX().quotes).indexOf(id);

// ---------- step 1: the text on the desk, quotes you can tap to see their technique
function paper(doc,z,sty,extra){let o=board(2,2,796,456,18,10,764,440);
  const tb=14+z.h2*1.05;o+=T(32,tb,doc.title,z.h2,{wt:600})+T(772,tb,doc.form,z.tiny,{a:"end",mono:true,fill:ROSE,ls:1.2});
  const qf=fitFlow([{t:doc.q}],{x:32,y:tb+10,w:736,size:z.small,lhf:1.25,wt:600,fill:"#B5466F"},60,z.tiny);o+=qf.o;const y0=tb+10+qf.h+8;
  const f=fitFlow(segsOf(doc),{x:32,y:y0,w:736,size:z.read,lhf:1.3,sty},440-(y0-10)-z.small*1.4,z.read*0.7);o+=f.o;
  o+=T(772,Math.min(442,y0+f.h+z.small*1.2),"— "+doc.by,z.small*0.9,{a:"end",fill:ROSE});return o+(extra||"")}
function textScene(){const z=Z(),t=TX();return F.floor(800,460)+paper(t,z,k=>{if(!k)return{};const i=techIndex(k),on=s.seen[k];return{bg:on?TECHC[i%6]:lite(TECHC[i%6],.55),wt:on?600:500,data:"see:"+k}},
  s.seen[Object.keys(s.seen).find(k=>s.seen[k])||""]?"":T(400,448,"TAP A HIGHLIGHT TO NAME ITS TECHNIQUE",z.tiny,{a:"middle",mono:true,fill:ROSE,ls:1}))}
// ---------- step 2: choose the claim
function claimScene(){const z=Z(),t=TX();let o=F.floor(800,460);o+=T(16,30,"TAP THE CLAIM THAT ANSWERS THE QUESTION",z.small,{mono:true,wt:600});
  o+=fitFlow([{t:t.q}],{x:16,y:40,w:768,size:z.small,lhf:1.25,wt:600,fill:"#B5466F"},50,z.tiny).o;
  let y=96;t.claims.forEach(c=>{const on=s.claim===c.id,f=flow([{t:c.t}],{x:0,y:0,w:700,size:z.body,lh:z.body*1.25}),h=f.h+26;
    o+=`<g data-a="claim:${c.id}" role="button" tabindex="0" aria-label="${esc(c.t)}" style="cursor:pointer">`+key(16,y,768,h,on?SLOTC.claim:"#FFFDFB",{d:8,r:12,sw:on?1.8:1.2,stroke:on?INK:undefined})+flow([{t:c.t}],{x:40,y:y+13,w:700,size:z.body,lh:z.body*1.25}).o;
    if(on){const lab=c.kind.toUpperCase(),lw=tw(lab,z.tiny,600,true)+14;o+=`<rect x="${768-lw}" y="${y+h-z.tiny*1.5-4}" width="${lw}" height="${z.tiny*1.5}" rx="${z.tiny*0.75}" fill="#fff" stroke="${PAL.pill.line}"/>`+T(768-lw/2,y+h-4-z.tiny*0.42,lab,z.tiny,{a:"middle",mono:true,wt:600,fill:c.s===2?"#2A7D63":"#A5552F"})}
    o+=`</g>`;y+=h+10});
  return o}
// ---------- step 3: the slots and the trays
const SLOTS=[["claim","CLAIM","your point about the aspect"],["ev","EVIDENCE","drag a quote here"],["ex","EXPLAIN","how the technique makes the effect"],["so","SO WHAT","the writer's purpose, the bigger idea"]];
const SLOT_X=16,SLOT_W=360,TRAY_X=392,TRAY_W=392;
function slotBoxes(z){const out={};let y=18;SLOTS.forEach(([k])=>{const h=k==="claim"?82:k==="ev"?74:92;out[k]={x:SLOT_X,y,w:SLOT_W,h};y+=h+8});return out}
function buildScene(){const z=Z(),t=TX(),sc=score();let o=F.floor(800,460);const B=slotBoxes(z);
  SLOTS.forEach(([k,lab,hint])=>{const b=B[k],filled=s[k],act=s.active===k;
    o+=`<g data-a="act:${k}" role="button" tabindex="0" aria-label="${lab} slot" style="cursor:pointer">`+key(b.x,b.y,b.w,b.h,filled?SLOTC[k]:"#FFFDFB",{d:6,r:12,sw:act?2:1.2,stroke:act?INK:undefined});
    if(!filled&&act)o+=`<rect x="${b.x+4}" y="${b.y+4}" width="${b.w-8}" height="${b.h-8}" rx="9" fill="none" stroke="${INK}" stroke-dasharray="4 4" opacity=".5"/>`;
    o+=T(b.x+12,b.y+z.tiny*1.2,lab,z.tiny,{mono:true,wt:600,fill:filled?INK:ROSE,ls:1});
    const body=filled?(k==="claim"?find(t.claims,s.claim).t:k==="ev"?`"${t.quotes[s.ev].t}"`:k==="ex"?find(t.explains,s.ex).t:find(t.sowhats,s.so).t):hint;
    o+=fitFlow([{t:body}],{x:b.x+12,y:b.y+z.tiny*1.5,w:b.w-24,size:z.small,lhf:1.2,fill:filled?INK:ROSE,wt:filled?500:400},b.h-z.tiny*1.6-6,z.tiny*0.8).o+`</g>`});
  // the tray for the active slot
  o+=T(TRAY_X,30,s.active==="ev"?"QUOTES · DRAG OR TAP ONE INTO EVIDENCE":s.active==="claim"?"CLAIMS":s.active==="ex"?"EXPLANATIONS · PICK THE ONE FOR YOUR QUOTE":"SO WHAT · PICK ONE",z.tiny,{mono:true,wt:600,fill:ROSE,ls:1});
  let y=42;
  if(s.active==="ev"){Object.entries(t.quotes).forEach(([id,q])=>{if(s.drag===id)return;const f=flow([{t:q.t}],{x:0,y:0,w:TRAY_W-70,size:z.small,lh:z.small*1.2}),h=f.h+18;
      o+=`<g data-drag="${id}" role="button" tabindex="0" aria-label="${esc(q.t)}" style="cursor:grab">`+key(TRAY_X,y,TRAY_W,h,s.ev===id?SLOTC.ev:TECHC[techIndex(id)%6],{d:5,r:10})+`<path d="M${TRAY_X+12},${y+h/2-6} h8 M${TRAY_X+12},${y+h/2} h8 M${TRAY_X+12},${y+h/2+6} h8" stroke="${INK}" stroke-opacity=".45" stroke-width="2" stroke-linecap="round"/>`+flow([{t:q.t}],{x:TRAY_X+30,y:y+9,w:TRAY_W-70,size:z.small,lh:z.small*1.2}).o+`</g>`;y+=h+6})}
  else{const list=s.active==="claim"?t.claims:s.active==="ex"?t.explains:t.sowhats,cur=s[s.active];
    list.forEach(it=>{const f=flow([{t:it.t}],{x:0,y:0,w:TRAY_W-30,size:z.small,lh:z.small*1.2}),h=f.h+18;if(y+h>458)return;
      o+=`<g data-a="pick:${it.id}" role="button" tabindex="0" aria-label="${esc(it.t)}" style="cursor:pointer">`+key(TRAY_X,y,TRAY_W,h,cur===it.id?SLOTC[s.active]:"#FFFDFB",{d:5,r:10,sw:cur===it.id?1.8:1.2,stroke:cur===it.id?INK:undefined})+flow([{t:it.t}],{x:TRAY_X+14,y:y+9,w:TRAY_W-30,size:z.small,lh:z.small*1.2}).o+`</g>`;y+=h+6})}
  // the dragged quote follows the pointer
  if(s.drag&&s.dragPos){const q=t.quotes[s.drag],f=flow([{t:q.t}],{x:0,y:0,w:240,size:z.small,lh:z.small*1.2}),h=f.h+18;o+=`<g opacity=".92" pointer-events="none">`+key(s.dragPos.x-130,s.dragPos.y-h/2,270,h,SLOTC.ev,{d:6,r:10,sw:1.8,stroke:INK})+flow([{t:q.t}],{x:s.dragPos.x-116,y:s.dragPos.y-h/2+9,w:240,size:z.small,lh:z.small*1.2}).o+`</g>`}
  // the live meter
  const bb=B.so;o+=T(SLOT_X,bb.y+bb.h+24,`${sc.n} / 8 · ${sc.level.toUpperCase()}`,z.small,{mono:true,wt:600,fill:sc.n>=7?"#2A7D63":sc.n>=5?"#8A6510":ROSE});
  o+=T(SLOT_X+SLOT_W,bb.y+bb.h+24,"machine's estimate",z.tiny*0.9,{a:"end",mono:true,fill:ROSE});
  return o}
// ---------- step 4: the paragraph and the self-check
const CHECKS=[["point","Makes a clear point about the aspect in the question",()=>score().c===2],["quote","Quotes short, exact evidence that fits the point",()=>score().ev===2],["how","Explains how the technique creates the effect",()=>score().ex===2],["why","Says why the writer did it (purpose)",()=>score().so>=1],["wider","Links to a bigger idea or the reader's world",()=>score().so===2]];
function checkScene(){const z=Z(),sc=score(),bits=paragraph();let o=F.floor(800,460);
  o+=board(2,2,796,236,18,10,764,220);
  o+=T(32,36,"YOUR PARAGRAPH",z.tiny,{mono:true,fill:ROSE,ls:1});
  o+=bits.length?fitFlow(bits.map((b,i)=>({t:b.t+(i<bits.length-1?" ":""),k:b.k})),{x:32,y:46,w:736,size:z.read*0.95,lhf:1.38,sty:k=>({bg:SLOTC[k]})},176,z.tiny).o:T(32,80,"Nothing built yet. Go back to Build and fill the four slots.",z.small,{fill:ROSE});
  o+=T(16,268,"SELF-CHECK · TAP WHAT YOU THINK YOU DID, THEN COMPARE",z.tiny,{mono:true,wt:600,fill:ROSE,ls:1});
  let y=280;CHECKS.forEach(([id,lab,fn])=>{const me=!!s.ticks[id],mach=fn();const h=z.small*1.5+8;
    o+=`<g data-a="tick:${id}" role="checkbox" aria-checked="${me}" tabindex="0" aria-label="${esc(lab)}" style="cursor:pointer">`+key(16,y,768,h,me?(mach?lite(PR.lime,.5):lite(PR.peach,.5)):"#FFFDFB",{d:4,r:9});
    o+=`<rect x="28" y="${y+h/2-9}" width="18" height="18" rx="5" fill="${me?INK:"#fff"}" stroke="${INK}"/>`+(me?`<path d="M32,${y+h/2} l4,4 l8,-9" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>`:"");
    o+=T(58,y+h/2+z.small*0.36,lab,z.small,{wt:500});
    const v=mach?"✓ MACHINE AGREES":me?"✗ NOT YET":"";if(v)o+=T(772,y+h/2+z.tiny*0.36,v,z.tiny*0.9,{a:"end",mono:true,wt:600,fill:mach?"#2A7D63":"#A5552F"});
    o+=`</g>`;y+=h+5});
  return o}
// ---------- close-ups
const row=(y,col,head,body)=>{const f=flow([{t:body}],{x:20,y:y+22,w:380,size:12,lh:15,fill:INK});const h=f.h+30;return{o:`<rect x="10" y="${y}" width="400" height="${h}" rx="8" fill="${col}"/><text x="20" y="${y+16}" style="font:500 10px ${MONO};fill:${INK};letter-spacing:.06em">${esc(head)}</text>`+f.o,h}};
function textClose(){const t=TX();let o=`<text class="t-lab" x="14" y="20">TECHNIQUES IN THIS TEXT · TAP TO REVEAL</text>`,y=30;
  Object.entries(t.quotes).forEach(([id,q],i)=>{const on=s.seen[id];const f=flow([{t:on?q.tech+": ":"?  ",k:"b"},{t:on?`"${q.t}"`:"tap a highlight on the text"}],{x:44,y:y+3,w:362,size:11.5,lh:14,fill:INK,sty:k=>k?{wt:600}:{op:on?1:.5}});const h=Math.max(24,f.h+6);
    o+=`<rect x="10" y="${y}" width="400" height="${h}" rx="7" fill="${TECHC[i%6]}" opacity="${on?.8:.35}"/><text x="22" y="${y+h/2+4}" style="font:600 11px ${MONO};fill:${INK}">${i+1}</text>`+f.o;y+=h+4});return o}
function claimClose(){const t=TX(),c=s.claim?find(t.claims,s.claim):null;let o=`<text class="t-lab" x="14" y="20">THREE KINDS OF CLAIM</text>`,y=30;
  [["#C7EBDD","ARGUABLE","Takes a position on the aspect that evidence can prove. Someone could disagree with it."],["#FFE0D0","RETELLS","Says what happens. True, but it answers no question."],["#FFE9A8","VAGUE","Mentions the aspect but says nothing you could prove or disprove."]].forEach(([col,h,b])=>{const r=row(y,col,h,b);o+=r.o;y+=r.h+6});
  o+=`<text x="14" y="${y+14}" style="font:500 12px ${DISP};fill:var(--ink)">${esc(c?(c.s===2?"Yours is arguable. The paragraph can prove it.":c.s===1?"Yours is vague: what, exactly, does the setting do?":"Yours retells. The marker already knows the plot."):"Pick a claim to see what kind it is.")}</text>`;return o}
function buildClose(){const t=TX(),sc=score();let o=`<text class="t-lab" x="14" y="20">WHAT EACH SLOT IS WORTH · ${sc.n} OF 8</text>`,y=30;
  const notes={claim:s.claim?(sc.c===2?"arguable: 2":sc.c===1?"vague: 1":"retells: 0"):"empty",ev:s.ev?(sc.ev===2?"fits the claim: 2":sc.ev===1?"partly fits: 1":"plain detail, not evidence: 0"):"empty",
    ex:s.ex?(find(t.explains,s.ex).q==="*"?"could be said of anything: 0":find(t.explains,s.ex).q!==s.ev?"explains a different quote: 0":sc.ex===2?"technique → effect: 2":"true but thin: 1"):"empty",so:s.so?(sc.so===2?"purpose and a wider idea: 2":sc.so===1?"reader's feeling only: 1":"says nothing: 0"):"empty"};
  SLOTS.forEach(([k,lab])=>{const r=row(y,SLOTC[k],lab,notes[k]);o+=r.o;y+=r.h+5});
  o+=`<text x="14" y="${y+14}" style="font:500 12px ${DISP};fill:var(--ink)">${esc(sc.full?`${sc.level}. ${sc.n>=7?"Every slot pulls its weight.":"Find the slot scoring under 2 and swap it."}`:"Fill all four slots to get an estimate.")}</text>`;return o}
function checkClose(){let o=`<text class="t-lab" x="14" y="20">WHAT THE GRADES ASK FOR (IN PLAIN WORDS)</text>`,y=30;
  [["#FFE9A8","ACHIEVED","Analyse the aspect: make points about how it works and back them with evidence from the text."],["#CFE3F8","MERIT","Analyse convincingly: explain how the writer's choices create their effects, with well-chosen evidence."],["#E3D7FA","EXCELLENCE","Analyse perceptively: show insight into the writer's purpose and connect it to ideas beyond the text."]].forEach(([c,h,b])=>{const r=row(y,c,h,b);o+=r.o;y+=r.h+6});
  o+=`<text x="14" y="${y+14}" style="font:500 11.5px ${DISP};fill:var(--rose)">Paraphrased for study. The official criteria are on NZQA's site.</text>`;return o}
function testClose(){let o=`<text class="t-lab" x="14" y="20">BEFORE YOU WRITE, ASK…</text>`,y=30;
  [["#CFE3F8","CLAIM","Does my topic sentence answer the question, not retell?"],["#FFE9A8","EVIDENCE","Is the quote short, exact, and does it fit the claim?"],["#C7EBDD","EXPLAIN","Did I name the technique and say what it does to the reader?"],["#F7D3DD","SO WHAT","Why did the writer do this? What does it say about people or the world?"]].forEach(([c,h,b])=>{const r=row(y,c,h,b);o+=r.o;y+=r.h+5});return o}

// ---------- steps
const steps=[
 {k:"text",lab:"Read the text",cap:"A short original text and the kind of question the exam asks about a <b>specified aspect</b>. Tap each highlighted phrase to name its technique. Switch texts to practise on all three.",controls:["text"],
  big:"<b>The big idea:</b> the question names an aspect (setting, language, structure, character, theme). Every quote you choose must serve <i>that</i> aspect, not just be a nice line.",
  exam:()=>{const t=TX();return `In "${t.title}", the writer uses ${t.aspect} to ${t.aspect==="setting"?"show a character changing":t.aspect==="structure"?"show a relationship shifting":"develop an idea about memory"}.`},
  trap:"Collecting quotes you like instead of quotes that answer the question. Read the question first, then hunt.",chips:["text","aspect","named"]},
 {k:"claim",lab:"Pick the claim",cap:"Three topic sentences. One is <b>arguable</b> (you can prove it), one <b>retells</b> the plot, one is <b>vague</b>. Tap the one that answers the question.",controls:["text"],
  big:"<b>The big idea:</b> a claim is a position on the aspect. If a marker could not disagree with it, it isn't a claim; if it only says what happens, it's a summary.",
  exam:()=>{const t=TX();return find(t.claims,"c1").t},
  trap:"Starting with 'This essay will discuss…'. Start with the point itself.",chips:["text","claimkind"]},
 {k:"build",lab:"Build it",cap:"Four slots. <b>Drag a quote</b> into EVIDENCE (or tap it), then tap EXPLAIN and SO WHAT to pick lines. The meter rates the paragraph as you build.",controls:["text","reset","showme"],
  big:"<b>The big idea:</b> claim → evidence → explanation → so what. The explanation must be about <i>your</i> quote; the 'so what' says why the writer did it and what it means beyond the text.",
  exam:()=>{const b=paragraph();return b.length?b.map(x=>x.t).join(" "):"Fill the four slots and your paragraph appears here."},
  trap:"An explanation that would be true of any quote ('this shows the setting is important'). If you could swap the quote and keep the sentence, it isn't explaining.",chips:["score","level","filled"]},
 {k:"check",lab:"Self-check",cap:"Read your paragraph, tick what you think it does, then see whether the machine agrees. The grade words are paraphrased in the close-up.",controls:["text"],
  big:"<b>The big idea:</b> Achieved analyses with evidence; Merit explains convincingly how the writer's choices work; Excellence is perceptive: it shows insight into purpose and reaches beyond the text.",
  exam:()=>{const sc=score();return sc.full?`${sc.level}: ${sc.n}/8. ${sc.n>=7?"The 'so what' connects the writer's purpose to a wider idea, which is what perceptive analysis does.":"Strengthen the weakest slot: a precise explanation of your quote, then a 'so what' about purpose."}`:"Build a full paragraph first."},
  trap:"Ticking 'explains the effect' when the sentence only names the technique. Naming is not explaining.",chips:["score","level","ticks"]},
 {k:"test",lab:"Test yourself",cap:"Switch to a text you haven't built on, make a paragraph, then press Check. Finish with the one-question check from memory.",controls:["text","reset"],
  big:"<b>Exam tip:</b> one text, one question, about 750–800 words, three or four paragraphs like this one. Plan the claims first; the quotes come after.",chips:["score","level"]}];
const KUPU=[{mi:"tuhinga",en:"text, writing",ta:8648},{mi:"kaituhi",en:"writer, author",ta:2031},{mi:"taunakitanga",en:"evidence",ta:14911},{mi:"whakamārama",en:"explanation",ta:9594},{mi:"kōwae",en:"paragraph",ta:3169},{mi:"kaupapa",en:"topic, theme, purpose",ta:2439}];
Object.entries({text:["tuhinga","kaituhi"],claim:["kaupapa"],build:["taunakitanga","whakamārama","kōwae"],check:["kōwae"]}).forEach(([k,a])=>{const st=steps.find(x=>x.k===k);if(st)st.kupu=a});
function clear(){s.claim=null;s.ev=null;s.ex=null;s.so=null;s.active="ev";s.ticks={}}
const api=StudyKit.mount({kupu:KUPU,
  eyebrow:"English · Studied written texts",title:"The quote-to-point machine",homeHash:"l2",
  fig:"FIG. 43 · A READING DESK WITH FOUR SLOTS",railTitle:"Claim, evidence, explain, so what",
  badge:{label:"NCEA L2 English 91098",exam:"2026-11-12T09:30:00+13:00",examText:"Thu 12 Nov, 9:30am"},
  mainBox:"0 0 800 460",mainPhoneBig:true,mainLabel:"An original text with tappable quotes, three claim cards, four paragraph slots with a tray of draggable quotes, and a self-check list",closeBox:"0 0 420 260",
  state:s,steps,
  controls:[{type:"select",id:"text",label:"Text",options:ORDER.map(k=>[k,TEXTS[k].title]),get:()=>s.text,set:(x,v)=>{s.text=v;clear();s.seen={};sfx("whoosh")}},
    {type:"button",id:"reset",label:"↺ Empty the slots",onClick:()=>{clear()}},
    {type:"button",id:"showme",label:"Show me one",onClick:()=>{const t=TX();s.claim="c1";s.ev=Object.keys(t.quotes).find(q=>t.quotes[q].s===2);s.ex=t.explains.find(e=>e.q===s.ev).id;s.so="s1";s.active="so";sfx("win")}}],
  drawMain:(x,st)=>{const k=st.k;return k==="text"?textScene():k==="claim"?claimScene():k==="build"||k==="test"?buildScene():checkScene()},
  drawClose:(x,st)=>{const k=st.k;return k==="text"?textClose():k==="claim"?claimClose():k==="build"?buildClose():k==="check"?checkClose():testClose()},
  chips:()=>{const t=TX(),sc=score(),c=s.claim?find(t.claims,s.claim):null;return{text:["TEXT",t.title,true],aspect:["ASPECT",t.aspect],named:["NAMED",`${Object.values(s.seen).filter(Boolean).length} of ${Object.keys(t.quotes).length}`],
    claimkind:["CLAIM",c?c.kind:"none yet",true],score:["SCORE",`${sc.n} / 8`,true],level:["ESTIMATE",sc.full?sc.short:"not yet"],filled:["SLOTS",`${["claim","ev","ex","so"].filter(k=>s[k]).length} of 4`],ticks:["TICKED",`${Object.values(s.ticks).filter(Boolean).length} of 5`]}},
  challenges:[
    {q:"On any text, fill EVIDENCE with a quote that fully serves the arguable claim.",check:()=>s.claim&&find(TX().claims,s.claim).s===2&&s.ev&&TX().quotes[s.ev].s===2,ok:"Yes: an arguable claim with a quote that fits it. That is the spine of the paragraph.",no:()=>!s.claim?"Not yet: pick a claim first. Hint: the one someone could disagree with.":find(TX().claims,s.claim).s!==2?"Not yet: that claim retells or stays vague. Hint: which one takes a position on the aspect?":!s.ev?"Not yet: drag a quote into EVIDENCE.":"Not yet: that quote is a plain detail or only partly fits. Hint: pick one with a technique that does the claim's job."},
    {q:"On <b>Nine Hundred Steps</b>, build a full paragraph the machine rates Excellence-like (7 or 8).",check:()=>s.text==="steps"&&score().full&&score().n>=7,ok:()=>`Yes: ${score().n}/8. Claim, fitting evidence, an explanation about that exact quote, and a 'so what' with a wider idea.`,no:()=>s.text!=="steps"?"Not yet: switch the text to Nine Hundred Steps.":!score().full?"Not yet: fill all four slots.":`Not yet: ${score().n}/8. Hint: the close-up on the Build step shows which slot is scoring low.`},
    {q:"On <b>Salt Lines</b>, make the explanation match the quote you chose, at full strength.",check:()=>s.text==="salt"&&s.ev&&s.ex&&find(TX().explains,s.ex).q===s.ev&&find(TX().explains,s.ex).s===2,ok:"Yes: the explanation is about your quote and says what the technique does.",no:()=>s.text!=="salt"?"Not yet: switch the text to Salt Lines.":!s.ev||!s.ex?"Not yet: fill EVIDENCE and EXPLAIN.":"Not yet: that explanation belongs to a different quote, or it's thin. Hint: it should mention the technique in your quote."},
  ],
  retrieval:{q:"What does the 'so what' sentence in an analysis paragraph do?",options:["Says why the writer made the choice and what it means beyond the text","Repeats the claim in different words","Adds a second quote to be safe","Describes what happens next in the text"],answer:0,why:"Purpose and a wider idea: that is what perceptive analysis reaches for, and it is the slot most students leave empty."},
  papers:[{label:"NZQA: English past exams",url:"https://www2.nzqa.govt.nz/ncea/subjects/past-exams-and-exemplars/english/"}],
  truth:"All three texts are original, written for this machine, and short so the skills stand out. The 0–8 meter and the Achieved / Merit / Excellence words are the machine's estimate, paraphrased from the standard, not NZQA marking. In the exam you write about texts you studied in class.",
  footer:"Covers NCEA Level 2 English 91098 (Analyse specified aspect(s) of studied written text(s), supported by evidence): claims about a specified aspect, selecting evidence, explaining technique and effect, and the writer's purpose, in an essay of around 750–800 words."});
// ---- taps and drags on the canvas
const svg=document.getElementById("k-main");
function act(a){const[k,v]=a.split(":");const t=TX();
  if(k==="see"){s.seen[v]=!s.seen[v];sfx(s.seen[v]?"pop":"tick")}
  else if(k==="claim"){s.claim=s.claim===v?null:v;sfx(find(t.claims,v).s===2?"ding":"buzz")}
  else if(k==="act"){s.active=v;sfx("tick")}
  else if(k==="pick"){const sl=s.active;if(sl==="claim"){s.claim=s.claim===v?null:v}else if(sl==="ex"){s.ex=s.ex===v?null:v}else if(sl==="so"){s.so=s.so===v?null:v}
    const sc=score();sfx(sc.full&&sc.n>=7?"win":"pop");const nxt=sl==="claim"?"ev":sl==="ex"?"so":null;if(nxt&&s[sl]&&!s[nxt])s.active=nxt}
  else if(k==="tick"){s.ticks[v]=!s.ticks[v];sfx("tick")}
  api.redraw()}
function place(id){s.ev=id;sfx(TX().quotes[id].s===2?"ding":"pop");if(!s.ex)s.active="ex";api.redraw()}
svg.addEventListener("click",e=>{const g=e.target.closest&&e.target.closest("[data-a]");if(g)act(g.getAttribute("data-a"))});
svg.addEventListener("keydown",e=>{if(e.key!=="Enter"&&e.key!==" ")return;const g=e.target.closest&&e.target.closest("[data-a],[data-drag]");if(!g)return;e.preventDefault();if(g.hasAttribute("data-drag"))place(g.getAttribute("data-drag"));else act(g.getAttribute("data-a"))});
let down=null;const toSvg=e=>{const r=svg.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width*800,y:(e.clientY-r.top)/r.height*460}};
svg.addEventListener("pointerdown",e=>{const g=e.target.closest&&e.target.closest("[data-drag]");if(!g)return;down={id:g.getAttribute("data-drag"),p:toSvg(e),moved:false};svg.setPointerCapture(e.pointerId);e.preventDefault()});
svg.addEventListener("pointermove",e=>{if(!down)return;const p=toSvg(e);if(!down.moved&&Math.hypot(p.x-down.p.x,p.y-down.p.y)<6)return;down.moved=true;s.drag=down.id;s.dragPos=p;s.active="ev";api.redraw()});
const up=e=>{if(!down)return;const p=toSvg(e);const b=slotBoxes(Z()).ev;const inside=p.x>=b.x-10&&p.x<=b.x+b.w+10&&p.y>=b.y-10&&p.y<=b.y+b.h+10;
  const id=down.id,moved=down.moved;down=null;s.drag=null;s.dragPos=null;if(!moved||inside)place(id);else{sfx("tick");api.redraw()}};
svg.addEventListener("pointerup",up);svg.addEventListener("pointercancel",()=>{down=null;s.drag=null;s.dragPos=null;api.redraw()});
const css=document.createElement("style");css.textContent=`#k-main [data-drag]{touch-action:none}.qx-opts{display:grid;gap:6px;margin-top:8px}.qx-opt{display:flex;gap:8px;align-items:flex-start;font-size:13.5px;line-height:1.4;color:var(--body);border:1px solid var(--line);border-radius:10px;padding:7px 10px;cursor:pointer;background:var(--paper)}
.qx-opt:has(input:checked){border-color:var(--ink);background:var(--chalk)}.qx-opt input{accent-color:var(--sun);margin-top:3px;flex:none}#k-main [data-a]:focus,#k-main [data-drag]:focus{outline:none}#k-main [data-a]:focus-visible>rect:first-of-type,#k-main [data-drag]:focus-visible>rect:first-of-type{stroke:var(--sun);stroke-width:4}`;document.head.appendChild(css);
try{mq.addEventListener("change",()=>api.redraw())}catch(e){}
try{document.fonts&&document.fonts.ready.then(()=>api.redraw())}catch(e){}
})();
