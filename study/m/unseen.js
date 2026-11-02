(()=>{
// The unfamiliar text machine (NCEA Level 2 English 91100; ?level=3 switches to Level 3 English 91474): an original unseen
// passage with language features you can tap, each tagged in three moves (technique → effect → link to the idea), a timer for
// exam pace, and a panel that shows how one tag grows into an analysis paragraph. The passages are original, written here.
const esc=StudyKit.esc,sfx=n=>{try{StudyKit.sfx(n)}catch(e){}};
const LEVEL=(()=>{try{return new URLSearchParams(location.search).get("level")==="3"?3:2}catch(e){return 2}})();
const F=StudyKit.fig,PAL=F.palette,TINT=PAL.case.blush,PR=PAL.product;
const lite=(h,k)=>{const n=parseInt(h.slice(1),16),f=v=>Math.round(v+(255-v)*k).toString(16).padStart(2,"0");return "#"+f(n>>16&255)+f(n>>8&255)+f(n&255)};
const INK="#262E5C",ROSE="#6E6A86",PAPER="#FFFDF8";
const STC={tech:lite(PR.blueberry,.55),eff:lite(PR.butter,.5),link:lite(PR.lime,.5),so:lite(PR.strawberry,.55)};
const TECHC=[lite(PR.strawberry,.5),lite(PR.blueberry,.5),lite(PR.butter,.45),lite(PR.lime,.5),PAL.case.lavender,lite(PR.peach,.45)];
const mq=matchMedia("(max-width:820px)");const PH=()=>mq.matches;
const Z=()=>PH()?{h2:28,body:23,read:22,small:19,tiny:16}:{h2:22,body:17,read:17.5,small:14,tiny:12};
let _mc=null;function tw(t,size,wt=400,mono=false){try{_mc=_mc||document.createElement("canvas").getContext("2d");_mc.font=`${wt} ${size}px ${mono?'"IBM Plex Mono",ui-monospace,monospace':'"Instrument Sans",system-ui,sans-serif'}`;return _mc.measureText(t).width}catch(e){return String(t).length*size*(mono?0.6:0.52)}}
const DISP="var(--display)",MONO="var(--mono)";
const T=(x,y,t,size,o={})=>`<text x="${x}" y="${y}"${o.a?` text-anchor="${o.a}"`:""} style="font:${o.wt||400} ${size}px ${o.mono?MONO:DISP};fill:${o.fill||INK}${o.ls?`;letter-spacing:${o.ls}px`:""}${o.op!=null?`;opacity:${o.op}`:""}">${esc(t)}</text>`;
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

// ---------- the passages (original). Features: technique, its effect, and the link to the main idea; d-phrases are plain.
const GENERIC_EFF=["makes the writing more interesting for the reader","shows that the writer is skilful","tells the reader what happened next"];
const TEXTS={
 2:{title:"Southerly",form:"NARRATIVE PROSE",by:"original, written for this machine",minutes:20,
  idea:{q:"What is the main idea?",opts:[["a","Waiting for a bus in bad weather is boring."],["b","Small, ordinary comforts matter most when you are exposed and alone."],["c","Buses in Ōtepoti are unreliable."]],ans:"b",why:"The storm strips everything back; the warm cars, the dairy's lights and the bus 'lit like a kitchen' are what Mia wants."},
  s:["The southerly arrived the way it always does in Ōtepoti: [[first as a rumour in the harbour|f1]], [[a grey line drawn under the hills|f2]], then all at once.","[[The bus shelter shuddered.|f3]]","Rain came sideways, [[needling through the gap|f4]] where the glass had been smashed last winter and never replaced.",
     "[[Mia pulled her hood tight|d1]] and counted the cars, [[each one a small warm room sliding past with somewhere to be|f5]].","Eleven minutes, the sign promised.","[[The sign had promised eleven minutes for the last twenty.|f6]]",
     "[[Across the road the dairy's lights|d2]] [[flickered, steadied, held|f7]], and she thought of her nana saying that [[weather was just the sky having an opinion|f8]].","The bus, when it came, was [[lit like a kitchen|f9]].","She stepped up [[out of the storm and into the ordinary|f10]]."],
  feats:{f1:{t:"first as a rumour in the harbour",tech:"Metaphor",eff:"makes the storm feel like gossip that spreads before it arrives",link:"the weather is something Mia hears about before it reaches her, alone and exposed"},
    f2:{t:"a grey line drawn under the hills",tech:"Visual imagery",eff:"lets the reader see the storm front as a single pencil stroke",link:"the land is marked and threatened before Mia is"},
    f3:{t:"The bus shelter shuddered.",tech:"Short sentence",eff:"lands the storm's first hit in one sharp beat",link:"even the shelter, her one comfort, is shaken"},
    f4:{t:"needling through the gap",tech:"Verb choice (metaphor)",eff:"makes the rain feel sharp and personal, like something aimed at her",link:"what should protect her lets the storm in"},
    f5:{t:"each one a small warm room sliding past with somewhere to be",tech:"Metaphor",eff:"turns every car into a cosy room Mia is shut out of",link:"ordinary warmth and purpose are exactly what she lacks"},
    f6:{t:"The sign had promised eleven minutes for the last twenty.",tech:"Irony (repetition)",eff:"makes the sign's promise feel hollow, almost funny",link:"the systems meant to help her are failing, so small comforts matter more"},
    f7:{t:"flickered, steadied, held",tech:"List of three (tricolon)",eff:"gives the lights a rhythm of nearly failing and then holding on",link:"the ordinary world is fragile but it endures, which is the comfort she needs"},
    f8:{t:"weather was just the sky having an opinion",tech:"Personification (humour)",eff:"shrinks the storm to a mood, with her nana's voice in it",link:"family wisdom is another small comfort against the weather"},
    f9:{t:"lit like a kitchen",tech:"Simile",eff:"makes the bus feel like the heart of a home",link:"the ordinary bus becomes the warmth she has been counting past"},
    f10:{t:"out of the storm and into the ordinary",tech:"Contrast",eff:"sets the wild storm against the plain word 'ordinary' so the ordinary wins",link:"the ending says it outright: the ordinary is the comfort"}},
  distract:{d1:"Mia pulled her hood tight",d2:"Across the road the dairy's lights"},
  techPool:["Metaphor","Simile","Personification (humour)","Short sentence","Visual imagery","Verb choice (metaphor)","Irony (repetition)","List of three (tricolon)","Contrast"],
  weak:["this links to the main idea","this shows Mia likes buses","this makes the reader want to keep reading"]},
 3:{title:"On Not Owning a Car",form:"NON-FICTION (REFLECTIVE)",by:"original, written for this machine",minutes:20,
  idea:{q:"What is the writer's central position?",opts:[["a","Cars are bad for the environment."],["b","Giving up convenience opens you to the place and the people around you."],["c","Walking is slower than driving."]],ans:"b",why:"Every detail noticed on foot (the pōhutukawa, Sunil, his daughter) is set against the 'windscreen' view, and the last line reverses what 'recovering' means."},
  s:["[[I sold the car in March and kept the key.|f8]]","It sits in a bowl by the door [[like a tooth I can't throw away|f1]].","Friends ask how I manage, [[in the tone you use for someone recovering from something|f2]].",
     "I manage by walking, which turns out to be a way of seeing: [[the pōhutukawa on Grey Street|d1]] has a split trunk and a family of waxeyes; [[the man at the dairy is called Sunil and his daughter is sitting Level 2|f3]].","[[In a car the city is a windscreen.|f4]]","On foot it is [[a conversation that keeps interrupting itself|f5]].",
     "I am not pretending it is easy.","[[The supermarket is a long way|d2]], and [[the rain here has a personal interest in me|f6]].","But I have started to suspect that [[convenience was the thing I was recovering from|f7]]."],
  feats:{f1:{t:"like a tooth I can't throw away",tech:"Simile",eff:"makes the key a lost part of the body, painful and personal",link:"giving up the car is a real loss before it becomes a gain"},
    f2:{t:"in the tone you use for someone recovering from something",tech:"Irony (tone)",eff:"shows friends treating a car-free life as an illness",link:"the writer sets up the word 'recovering' to flip it at the end"},
    f3:{t:"the man at the dairy is called Sunil and his daughter is sitting Level 2",tech:"Specific detail",eff:"proves the point with names and facts rather than claims",link:"walking turns strangers into people, which is what convenience hid"},
    f4:{t:"In a car the city is a windscreen.",tech:"Metaphor (short sentence)",eff:"flattens the whole city to a sheet of glass in five words",link:"the car is the thing that kept the place at a distance"},
    f5:{t:"a conversation that keeps interrupting itself",tech:"Personification",eff:"makes the city alive, messy and talkative",link:"on foot the place answers back, which is the opening-up the writer values"},
    f6:{t:"the rain here has a personal interest in me",tech:"Personification (humour)",eff:"admits the cost with a joke, so the writer sounds honest, not preachy",link:"the writer concedes the difficulty, which makes the final claim more trustworthy"},
    f7:{t:"convenience was the thing I was recovering from",tech:"Reversal (structure)",eff:"turns the friends' word 'recovering' back on them in the last line",link:"the whole piece lands here: the loss was the cure"},
    f8:{t:"I sold the car in March and kept the key.",tech:"Contradiction (opening)",eff:"starts with a small puzzle that pulls the reader in",link:"keeping the key shows the writer has not fully let go, which keeps the voice honest"}},
  distract:{d1:"the pōhutukawa on Grey Street",d2:"The supermarket is a long way"},
  techPool:["Simile","Metaphor (short sentence)","Personification","Personification (humour)","Irony (tone)","Specific detail","Reversal (structure)","Contradiction (opening)","Contrast"],
  weak:["this links to the writer's position","this shows the writer dislikes cars","this makes the reader want to keep reading"]}};
const TX=TEXTS[LEVEL];
const s={idea:null,cur:null,tags:{},miss:null,stage:3,timer:0,timerOn:false,timeLeft:TX.minutes*60,timerDone:false,timerTags:0,playing:false};
const featIds=Object.keys(TX.feats);
const tagOf=id=>s.tags[id]||(s.tags[id]={tech:null,eff:null,link:null});
const done=t=>t&&t.tech==="ok"&&t.eff==="ok"&&t.link==="ok";
const nDone=()=>featIds.filter(id=>done(s.tags[id])).length;
const nStarted=()=>featIds.filter(id=>s.tags[id]&&(s.tags[id].tech||s.tags[id].eff||s.tags[id].link)).length;
// options for the current feature, in a fixed shuffle so the right answer is not always first
const shuf=(arr,seed)=>{const a=arr.slice();let x=seed*9301+49297;for(let i=a.length-1;i>0;i--){x=(x*9301+49297)%233280;const j=x%(i+1);[a[i],a[j]]=[a[j],a[i]]}return a};
function options(id,stage){const f=TX.feats[id],n=featIds.indexOf(id);
  if(stage==="tech"){const pool=TX.techPool.filter(t=>t!==f.tech);return shuf([[f.tech,"ok"],[pool[(n*2)%pool.length],"no"],[pool[(n*2+3)%pool.length],"no"]],n+1)}
  if(stage==="eff")return shuf([[f.eff,"ok"],[GENERIC_EFF[n%3],"no"],[GENERIC_EFF[(n+1)%3],"no"]],n+7);
  return shuf([[f.link,"ok"],[TX.weak[n%3],"no"],[TX.weak[(n+1)%3],"no"]],n+13)}
function segsOf(doc){const out=[];doc.s.forEach((sen,i)=>{if(i)out.push({t:" "});sen.replace(/\[\[([^|\]]+)\|([^\]]+)\]\]|([^\[]+)/g,(m,a,b,c)=>{out.push(a?{t:a,k:b}:{t:c,k:""});return""})});return out}
const featCol=id=>TECHC[featIds.indexOf(id)%6];
const fmtT=sec=>`${Math.floor(sec/60)}:${String(sec%60).padStart(2,"0")}`;

// ---------- the passage on paper. hints: show which phrases are features (off in timer mode)
function paper(top,height,sty,z,opt={}){let o=board(2,top,796,height,18,top+8,764,height-16);
  const tb=top+16+z.h2*0.9;o+=T(32,tb,TX.title,z.h2*0.9,{wt:600})+T(772,tb,TX.form,z.tiny,{a:"end",mono:true,fill:ROSE,ls:1.2});
  const y0=tb+10;const f=fitFlow(segsOf(TX),{x:32,y:y0,w:736,size:opt.size||z.read,lhf:1.28,sty},height-(y0-top)-z.small*1.1,z.read*0.6);o+=f.o;
  o+=T(772,Math.min(top+height-10,y0+f.h+z.small*1.1),"— "+TX.by,z.small*0.85,{a:"end",fill:ROSE});return o}
function readScene(){const z=Z();let o=F.floor(800,460);
  o+=paper(2,300,k=>k&&TX.feats[k]?{bg:lite(featCol(k),.55)}:{},z);
  o+=T(16,328,TX.idea.q.toUpperCase()+" · TAP ONE",z.tiny,{mono:true,wt:600,fill:ROSE,ls:1});
  let y=338;TX.idea.opts.forEach(([v,t])=>{const on=s.idea===v,ok=v===TX.idea.ans;const h=z.small*1.5+8;
    o+=`<g data-a="idea:${v}" role="button" tabindex="0" aria-label="${esc(t)}" style="cursor:pointer">`+key(16,y,768,h,on?(ok?lite(PR.lime,.45):lite(PR.peach,.5)):"#FFFDFB",{d:4,r:9,sw:on?1.8:1.2,stroke:on?INK:undefined})+fitFlow([{t}],{x:30,y:y+5,w:740,size:z.small,lhf:1.2},h-6,z.tiny*0.8).o+`</g>`;y+=h+6});
  return o}
// ---------- tagging: the passage above, the tag card below
function tagScene(st){const z=Z(),exam=st.k==="timer";let o=F.floor(800,460);
  const sty=k=>{if(!k)return{};const f=TX.feats[k],t=s.tags[k];if(f){const bg=done(t)?featCol(k):s.cur===k?lite(featCol(k),.3):exam?undefined:lite(featCol(k),.62);return{bg,wt:s.cur===k||done(t)?600:400,data:"tap:"+k}}return{data:"tap:"+k,bg:s.miss===k?lite(PR.peach,.5):undefined}};
  o+=paper(2,236,sty,z,{size:z.read*0.92});
  // the tag card
  const cy=246;o+=`<rect x="2" y="${cy}" width="796" height="212" rx="14" fill="${TINT}" fill-opacity=".28" stroke="${F.deep(TINT)}" stroke-width="1.2"/>`;
  if(exam){o+=T(16,cy+22,s.timerDone?"TIME":s.timerOn?"EXAM CLOCK":"EXAM CLOCK · PRESS START",z.tiny,{mono:true,wt:600,fill:ROSE,ls:1})+T(784,cy+26,fmtT(s.timeLeft),z.h2,{a:"end",mono:true,wt:600,fill:s.timeLeft<120?"#B5466F":INK})}
  if(s.miss){o+=T(16,cy+22,"PLAIN STATEMENT",z.tiny,{mono:true,wt:600,fill:"#A5552F",ls:1});o+=fitFlow([{t:`"${TX.distract[s.miss]}" says what happens. No technique to tag here. Hunt for a phrase that does something extra: compares, exaggerates, repeats, surprises.`}],{x:16,y:cy+32,w:768,size:z.small,lhf:1.3},150,z.tiny).o;return o}
  if(!s.cur){o+=T(16,cy+(exam?48:22),exam?"TAP A PHRASE. THE HIGHLIGHTS ARE OFF, AS IN THE EXAM.":"TAP A HIGHLIGHTED PHRASE TO START A TAG",z.tiny,{mono:true,wt:600,fill:ROSE,ls:1});
    o+=T(16,cy+(exam?76:50),`${nDone()} of ${featIds.length} tagged`,z.small,{wt:600});return o}
  const f=TX.feats[s.cur],t=tagOf(s.cur),stage=t.tech!=="ok"?"tech":t.eff!=="ok"?"eff":t.link!=="ok"?"link":"done";
  const yq=cy+(exam?36:14);o+=`<rect x="12" y="${yq}" width="776" height="${z.small*1.6}" rx="8" fill="${featCol(s.cur)}"/>`+fitFlow([{t:`"${f.t}"`}],{x:22,y:yq+3,w:756,size:z.small,lhf:1.2,wt:600},z.small*1.6,z.tiny*0.8).o;
  const LAB={tech:"1 · TECHNIQUE",eff:"2 · EFFECT ON THE READER",link:LEVEL===3?"3 · LINK TO THE WRITER'S POSITION":"3 · LINK TO THE MAIN IDEA"};
  let y=yq+z.small*1.6+8;
  if(stage==="done"){o+=T(16,y+14,"TAGGED ✓",z.tiny,{mono:true,wt:600,fill:"#2A7D63",ls:1});o+=fitFlow([{t:f.tech+": ",k:"b"},{t:f.eff+", which suggests "+f.link+"."}],{x:16,y:y+22,w:768,size:z.small,lhf:1.3,sty:k=>k?{wt:600}:{}},120,z.tiny).o;return o}
  o+=T(16,y+12,LAB[stage],z.tiny,{mono:true,wt:600,fill:ROSE,ls:1});y+=18;
  options(s.cur,stage).forEach(([txt,v],i)=>{const picked=t[stage]===v&&t[stage]==="no"&&t.pick===i;const h=Math.min(z.small*1.5+6,(cy+212-y-6)/3-4);
    o+=`<g data-a="opt:${stage}:${v}:${i}" role="button" tabindex="0" aria-label="${esc(txt)}" style="cursor:pointer">`+key(16,y,768,h,picked?lite(PR.peach,.5):"#FFFDFB",{d:3,r:8})+fitFlow([{t:txt}],{x:28,y:y+4,w:748,size:z.small,lhf:1.15},h-4,z.tiny*0.75).o+`</g>`;y+=h+5});
  return o}
// ---------- how a paragraph grows from one tag
const GROW=["Name the technique and quote it","Say what it does to the reader","Link it to the main idea","Say why the writer wanted that","Judge how well it works"];
function growScene(){const z=Z();let o=F.floor(800,460);const id=featIds.find(k=>done(s.tags[k]))||"f1",f=TX.feats[id],n=s.stage;
  o+=board(2,2,796,456,18,10,764,440);o+=T(32,36,`ONE TAG → ONE PARAGRAPH · ${n} OF 5 MOVES`,z.tiny,{mono:true,wt:600,fill:ROSE,ls:1});
  const segs=[];if(n>=1)segs.push({t:`The writer uses ${f.tech.toLowerCase().replace(/ \(.*\)/,"")} in "${f.t}". `,k:"tech"});
  if(n>=2)segs.push({t:`This ${f.eff}. `,k:"eff"});if(n>=3)segs.push({t:`It suggests ${f.link}. `,k:"link"});
  if(n>=4)segs.push({t:LEVEL===3?`The writer wants the reader to question what convenience has cost them, not just to admire the walking. `:`The writer wants us to feel how much a small comfort is worth when everything else is stripped away. `,k:"so"});
  if(n>=5)segs.push({t:LEVEL===3?`It works because the joke and the honesty arrive together: the writer admits the rain and the long walk, so the final reversal feels earned rather than preached.`:`It works because the ordinary is never named as special; the storm does that job, so the reader arrives at the comfort the way Mia does.`,k:"so"});
  o+=fitFlow(segs,{x:32,y:48,w:736,size:z.read,lhf:1.42,sty:k=>({bg:STC[k]})},250,z.tiny).o;
  let y=316;GROW.forEach((g,i)=>{const on=i<n;o+=`<rect x="32" y="${y}" width="736" height="${z.small*1.45}" rx="7" fill="${on?[STC.tech,STC.eff,STC.link,STC.so,STC.so][i]:"#F1ECEF"}"/>`+T(44,y+z.small*1.05,`${i+1}  ${g}${i>=3?(LEVEL===3?"  (critical response)":"  (Merit and Excellence)"):""}`,z.small*0.9,{wt:on?600:400,fill:on?INK:ROSE});y+=z.small*1.45+6});
  return o}
// ---------- close-ups
const row=(y,col,head,body)=>{const f=flow([{t:body}],{x:20,y:y+22,w:380,size:12,lh:15,fill:INK});const h=f.h+30;return{o:`<rect x="10" y="${y}" width="400" height="${h}" rx="8" fill="${col}"/><text x="20" y="${y+16}" style="font:500 10px ${MONO};fill:${INK};letter-spacing:.06em">${esc(head)}</text>`+f.o,h}};
function readClose(){let o=`<text class="t-lab" x="14" y="20">FIRST READ · THREE QUESTIONS</text>`,y=30;
  [["#FFE9A8","WHAT IS IT?",`${TX.form.toLowerCase()}: ${LEVEL===3?"a writer arguing from their own life":"a story told from close to one character"}`],["#CFE3F8","WHAT HAPPENS, IN ONE LINE?",LEVEL===3?"Someone sells their car and finds walking changes how they see the city.":"Mia waits for a late bus in a southerly and finally climbs aboard."],["#C7EBDD","WHAT IS IT REALLY ABOUT?",s.idea?(s.idea===TX.idea.ans?TX.idea.why:"Not that one. Ask what the details keep pointing to, not what the plot is."):"Pick a main idea above. Every tag you make later has to connect to it."]].forEach(([c,h,b])=>{const r=row(y,c,h,b);o+=r.o;y+=r.h+6});return o}
function tagClose(){let o=`<text class="t-lab" x="14" y="20">YOUR TAGS · ${nDone()} OF ${featIds.length}</text>`,y=30;
  featIds.forEach((id,i)=>{const f=TX.feats[id],t=s.tags[id],d=done(t);if(y>240)return;const lab=d?f.tech:t&&t.tech==="ok"?f.tech+" · effect?":"?";
    o+=`<rect x="10" y="${y}" width="400" height="22" rx="7" fill="${featCol(id)}" opacity="${d?.8:.3}"/><text x="22" y="${y+15}" style="font:600 11px ${MONO};fill:${INK}">${i+1}</text><text x="44" y="${y+15}" style="font:${d?600:400} 11.5px ${DISP};fill:${INK}${d?"":";opacity:.6"}">${esc(lab)}${d?` · "${esc(f.t.length>30?f.t.slice(0,28)+"…":f.t)}"`:""}</text>`;y+=25});
  return o}
function growClose(){let o=`<text class="t-lab" x="14" y="20">THE SAME MOVES IN THE GRADE WORDS</text>`,y=30;
  (LEVEL===3?[["#FFE9A8","ACHIEVED","Respond critically: identify features and say how they work, with evidence."],["#CFE3F8","MERIT","Respond critically and convincingly: explain the effects in a reasoned way and link them to the writer's purpose."],["#E3D7FA","EXCELLENCE","Respond critically and perceptively: insight into how and why the text works, judged against its wider significance."]]:[["#FFE9A8","ACHIEVED","Analyse significant aspects: name features and say what they do, with evidence."],["#CFE3F8","MERIT","Analyse convincingly: explain how the features create their effects and connect to the ideas."],["#E3D7FA","EXCELLENCE","Analyse perceptively: show insight into the writer's purpose and why the choices matter."]]).forEach(([c,h,b])=>{const r=row(y,c,h,b);o+=r.o;y+=r.h+6});
  o+=`<text x="14" y="${y+14}" style="font:500 11.5px ${DISP};fill:var(--rose)">Paraphrased for study. The official criteria are on NZQA's site.</text>`;return o}
function timerClose(){let o=`<text class="t-lab" x="14" y="20">PACE · ${TX.minutes} MINUTES A TEXT</text>`,y=30;
  [["#FFE9A8","FIRST 3 MINUTES","Read it twice. Decide the main idea before you tag anything."],["#CFE3F8","MIDDLE","Three or four strong tags beat eight weak ones. Quote short."],["#C7EBDD","LAST 5 MINUTES","Write. Each tag is one paragraph: technique, quote, effect, link, so what."],["#F7D3DD","THIS RUN",s.timerDone?`${s.timerTags} tag${s.timerTags===1?"":"s"} finished in ${TX.minutes} minutes.`:s.timerOn?`${s.timerTags} finished so far.`:"Press Start to run the clock."]].forEach(([c,h,b])=>{const r=row(y,c,h,b);o+=r.o;y+=r.h+5});return o}
function testClose(){let o=`<text class="t-lab" x="14" y="20">BEFORE YOU ANSWER, ASK…</text>`,y=30;
  [["#FFE9A8","TECHNIQUE","Is it really that technique? A simile needs 'like' or 'as'."],["#CFE3F8","EFFECT","What does it do to the reader, specifically? Not 'makes it interesting'."],["#C7EBDD","LINK","How does it serve the main idea you chose?"],["#F7D3DD","SO WHAT",LEVEL===3?"Why did the writer want that, and how well does it work?":"Why did the writer want that?"]].forEach(([c,h,b])=>{const r=row(y,c,h,b);o+=r.o;y+=r.h+5});return o}

// ---------- steps
const steps=[
 {k:"read",lab:"First read",cap:`An unfamiliar ${LEVEL===3?"non-fiction":"prose"} text, original to this machine. Read it twice. The highlights mark phrases doing something extra. Then tap the <b>main idea</b>: everything you tag later must link to it.`,controls:[],
  big:"<b>The big idea:</b> decide what the text is <i>about</i> before you hunt for techniques. A feature with no link to an idea is just a label.",
  exam:()=>s.idea===TX.idea.ans?`The text's main idea is that ${TX.idea.opts.find(o=>o[0]===TX.idea.ans)[1].replace(/\.$/,"").replace(/^./,c=>c.toLowerCase())}. ${TX.idea.why}`:"Pick the main idea to see it written as an exam sentence.",
  trap:"Mistaking the plot for the idea. 'A girl waits for a bus' is what happens; the idea is what the details keep pointing to.",chips:["idea","feats"]},
 {k:"tag",lab:"Tag features",cap:"Tap a highlighted phrase, then make three moves: name the <b>technique</b>, its <b>effect</b>, and the <b>link</b> to the main idea. A wrong pick turns peach; try again. Plain phrases tell you they're plain.",controls:["reset"],
  big:"<b>The big idea:</b> technique → effect → idea. Naming is Achieved; explaining the effect is Merit; linking it to the idea and the writer's purpose is where Excellence starts.",
  exam:()=>{const id=featIds.find(k=>done(s.tags[k]));if(!id)return "Finish one tag and it appears here as a sentence.";const f=TX.feats[id];return `The ${f.tech.toLowerCase().replace(/ \(.*\)/,"")} "${f.t}" ${f.eff}, which suggests ${f.link}.`},
  trap:"Tagging the technique and stopping. 'The writer uses a simile' earns nothing on its own; the effect and the link are the marks.",chips:["tagged","started","idea"]},
 {k:"grow",lab:"Grow a paragraph",cap:"One finished tag becomes one paragraph in five moves. Slide the stage to watch it grow, and see which moves carry the higher grades.",controls:["stage"],
  big:"<b>The big idea:</b> a paragraph is a tag written out: technique and quote, effect, link to idea, why the writer wanted it, and how well it works. The last two are the ones most students skip.",
  exam:()=>{const id=featIds.find(k=>done(s.tags[k]))||"f1",f=TX.feats[id];return `The writer uses ${f.tech.toLowerCase().replace(/ \(.*\)/,"")} in "${f.t}". This ${f.eff}. It suggests ${f.link}.`},
  trap:"Writing 'this makes the reader want to read on'. Say what the reader sees, feels or understands, and tie it to the idea.",chips:["moves"]},
 {k:"timer",lab:"Exam clock",cap:`The exam gives you about ${TX.minutes} minutes a text. The highlights are off, as on the day. Press <b>Start</b>, find the features yourself, and tag as many as you can before the clock runs out.`,controls:["start","reset"],speed:1,
  big:"<b>The big idea:</b> under time, pick three or four features you can explain well rather than listing eight you can't. Short quotes, full explanations.",
  exam:()=>s.timerDone?`In ${TX.minutes} minutes you finished ${s.timerTags} tag${s.timerTags===1?"":"s"}. Three strong ones are enough for a full answer.`:"Run the clock. Your result appears here when it stops.",
  trap:"Spending the first ten minutes on a perfect first paragraph. Tag three features in your head before you write any.",chips:["clock","run"],onStep:()=>{s.timerOn=false;s.playing=false}},
 {k:"test",lab:"Test yourself",cap:"Answer each challenge, then press Check. Finish with the one-question check from memory.",controls:["reset"],
  big:LEVEL===3?"<b>Exam tip:</b> three texts, three hours. 'Critically' means you judge the writer's choices and say what they add up to, not just that they exist.":"<b>Exam tip:</b> three texts (prose, non-fiction, poetry). For each, find the idea first, then tag three features you can explain all the way to the idea.",chips:["tagged","idea"]}];
const KUPU=[{mi:"tuhinga",en:"text, writing",ta:8648},{mi:"kaituhi",en:"writer, author",ta:2031},{mi:"kaupapa",en:"topic, theme, purpose",ta:2439},{mi:"kupu whakarite",en:"metaphor, figurative language",ta:45734},{mi:"taunakitanga",en:"evidence",ta:14911},{mi:"kōwae",en:"paragraph",ta:3169}];
Object.entries({read:["tuhinga","kaupapa"],tag:["kupu whakarite","taunakitanga"],grow:["kōwae","kaituhi"]}).forEach(([k,a])=>{const st=steps.find(x=>x.k===k);if(st)st.kupu=a});
const simile=LEVEL===3?"f1":"f9";
// ================= the 3D desk (kit3d.js via l2-3d.js): the unseen page under a desk lamp, a tag card you work through in three
// moves (a finished tag drops a coloured sticky onto its phrase), a stack that grows into a paragraph, and a real exam clock.
// On a phone the camera moves between the page and the card; on a wide screen both sit side by side. Taps call the same act().
function unseen3d(S){const {THREE,mat}=S;const L=window.L2,K=L.C;const V3=(x,y,z)=>new THREE.Vector3(x,y,z);const FR=L.frames(S),hud=L.hud(S);
  const glossy=c=>mat("plastic",c,{rough:.36}),lab=o=>S.label(o);let fontsV=0;L.fontsReady(()=>{fontsV++});
  const TILT=.32,stand=(x)=>{const g=new THREE.Group();g.position.set(x,.3,0);g.rotation.x=-TILT;S.scene.add(g);return g};
  const desk=(x,w,d)=>S.scene.add(S.rbox(w,.3,d,.12,mat("plastic","#EFE4D8",{rough:.85,coat:.05}),{at:[x,.15,0]}));
  const PINK="#B5466F",MUTED=K.muted,PAPER="#FFFDF8";
  const H2=(g,t,x,y,size,o={})=>{g.font=`${o.wt||600} ${size}px ${o.mono?L.MONO:L.SANS}`;g.fillStyle=o.fill||K.ink;g.textAlign=o.a||"left";g.fillText(t,x,y)};
  const card=(g,w,h,bg,border)=>{g.fillStyle=bg;L.rr(g,4,4,w-8,h-8,26);g.fill();if(border){g.strokeStyle=border.c;g.lineWidth=border.w;L.rr(g,border.w/2+4,border.w/2+4,w-border.w-8,h-border.w-8,24);g.stroke()}};
  // a round key with a word on it (buttons that move the camera, not the model)
  const keyBtn=(parent,text,w,fn,col=K.peach)=>{const g=new THREE.Group();parent.add(g);const sh=L.sheet(S,{w,h:.62,parent:g,t:.12,edge:col,r:.06});
    sh.draw((c,W,H)=>{c.fillStyle=col;L.rr(c,0,0,W,H,H/2);c.fill();H2(c,text,W/2,H*.66,H*.46,{a:"center"})});L.fontsReady(()=>sh.draw((c,W,H)=>{c.fillStyle=col;L.rr(c,0,0,W,H,H/2);c.fill();H2(c,text,W/2,H*.66,H*.46,{a:"center"})}));
    S.pick(sh.pan,()=>{fn();sfx("tick")});return g};
  // the desk lamp: a warm pool of light on the page
  const lamp=new THREE.SpotLight(0xfff1dc,0,30,.55,.6,1.2);lamp.castShadow=false;S.scene.add(lamp,lamp.target);
  function lampModel(x){const g=new THREE.Group();g.position.set(x,.3,-1.4);g.rotation.y=-.7;S.scene.add(g);const arm=glossy(K.plum);
    g.add(S.cyl(.5,.55,.12,arm,{at:[0,.06,0],seg:32}),S.cyl(.05,.05,3.4,mat("metal"),{at:[0,1.7,0],rot:[.25,0,0],seg:10}),S.cyl(.05,.05,2.2,mat("metal"),{at:[0,3.6,.95],rot:[-1.05,0,0],seg:10}));
    const shade=S.cyl(.18,.55,.6,glossy(K.butter),{at:[0,3.9,2.0],rot:[-.6,0,0],seg:28,open:true});shade.material=mat("plastic",K.butter,{rough:.4,extra:{side:THREE.DoubleSide}});g.add(shade);
    g.add(S.sphere(.16,mat("glow","#FFF4D6",2),{at:[0,3.75,2.1]}));return g}
  // ================= READ zone
  const RX=0;desk(RX,17,6);lampModel(RX-8);const rStand=stand(RX);rStand.add(S.rbox(7.1,.16,.5,.06,glossy(K.pink),{at:[-3.6,.1,.35]}));
  const rPage=L.sheet(S,{w:6.6,h:7.6,parent:rStand,t:.06});
  const ideaHead=L.sheet(S,{w:6.6,h:.8,parent:rStand,t:.03,edge:"#FFF3F6"});
  const ideas=TX.idea.opts.map(([v],i)=>{const c=L.sheet(S,{w:6.6,h:1.2,parent:rStand,t:.08});c.onTap(()=>act("idea:"+v));c.z=0;return c});
  let rFocus="page";const toIdeas=keyBtn(rStand,"Pick the main idea →",3.4,()=>{rFocus="ideas";FR.go(zn("read"))}),toText=keyBtn(rStand,"‹ Back to the text",3.2,()=>{rFocus="page";FR.go(zn("read"))},K.lav);
  let rKey="",iKey="";
  // ================= TAG zone (tag, timer, test)
  const TGX=18;desk(TGX,17,6);lampModel(TGX-8);const tStand=stand(TGX);tStand.add(S.rbox(7.1,.16,.5,.06,glossy(K.pink),{at:[-3.6,.1,.35]}));
  const tPage=L.sheet(S,{w:6.6,h:7.6,parent:tStand,t:.06});tPage.onTap(r=>{if(r){act(r);focus="card";FR.go(zn("tag"))}});
  const tCard=L.sheet(S,{w:6.4,h:5.2,parent:tStand,t:.09,edge:"#FFF3F6",px:820});tCard.onTap(r=>{if(r)act(r)});
  let focus="page";const back=keyBtn(tStand,"‹ Back to the page",3.3,()=>{focus="page";FR.go(zn("tag"))},K.lav);
  const stickies=featIds.map((id,i)=>{const m=S.rbox(.42,.42,.04,.05,glossy(featCol(id)));const d=new THREE.Mesh(new THREE.PlaneGeometry(.34,.34),new THREE.MeshBasicMaterial({map:L.glyphTex(S,"✓",{size:170,alpha:.85}),transparent:true,depthWrite:false}));d.position.z=.03;m.add(d);m.visible=false;tPage.g.add(m);m.userData.a=0;return m});
  // the exam clock: a dial, a sweep of time left, two hands
  const clock=new THREE.Group();tStand.add(clock);const dial=S.panel(512,512,2.2);clock.add(dial);clock.add(S.cyl(1.18,1.18,.16,glossy(K.plum),{rot:[Math.PI/2,0,0],at:[0,0,-.1],seg:48}));
  dial.redraw((g,w,h)=>{g.fillStyle="#FFFDF8";g.beginPath();g.arc(w/2,h/2,w/2-6,0,Math.PI*2);g.fill();g.strokeStyle=K.ink;for(let i=0;i<60;i++){const a=i/60*Math.PI*2,r0=i%5?212:196;g.lineWidth=i%5?3:7;g.beginPath();g.moveTo(w/2+Math.sin(a)*r0,h/2-Math.cos(a)*r0);g.lineTo(w/2+Math.sin(a)*230,h/2-Math.cos(a)*230);g.stroke()}});
  const sweep=new THREE.Mesh(new THREE.CircleGeometry(.95,64,Math.PI/2,0),mat("flat",K.peach,{opacity:.55,depthWrite:false}));sweep.position.z=.01;sweep.renderOrder=2;clock.add(sweep);let sweepF=-1;
  const hand=(len,w,c)=>{const g=new THREE.Group();g.position.z=.05;g.add(S.rbox(w,len,.04,.015,glossy(c),{at:[0,len/2-.08,0]}));clock.add(g);return g};
  const minH=hand(.78,.08,K.ink),secH=hand(.95,.035,PINK);clock.add(S.cyl(.07,.07,.08,glossy(K.plum),{rot:[Math.PI/2,0,0],at:[0,0,.08]}));
  let tKey="",cKey="";const lTag=lab({cls:"ok",off:[16,-30]}),lMiss=lab({cls:"warn",off:[16,-30]});let prevDone={},lastDone=null;
  // ================= GROW zone
  const GX=36;desk(GX,16,6);const gStand=stand(GX);
  const gSheet=L.sheet(S,{w:6.6,h:4.6,parent:gStand,t:.04});
  const slabs=GROW.map((m,i)=>{const sh=L.sheet(S,{w:6.2,h:.62,parent:gStand,t:.42,edge:[STC.tech,STC.eff,STC.link,STC.so,STC.so][i],r:.1});sh.a=0;return sh});
  let gKey="";
  // ================= layout and framing
  // page left, card right on every screen: a phone frames one at a time and pans between them, a wide screen shows both
  rPage.g.position.set(-3.6,4.6,.08);ideaHead.g.position.set(3.7,7.0,.06);ideas.forEach((c,i)=>c.g.position.set(3.7,5.75-i*1.42,.1));toIdeas.position.set(-3.6,.42,.25);toText.position.set(3.7,1.25,.25);
  tPage.g.position.set(-3.6,4.6,.08);tCard.g.position.set(3.7,5.0,.1);back.position.set(2.2,1.75,.25);
  let wide=false;function layout(){wide=S.camera.aspect>1.15;toIdeas.visible=toText.visible=back.visible=!wide;
    if(wide){clock.position.set(3.7,1.25,.2);clock.scale.setScalar(.9);gSheet.g.position.set(-3.5,4.1,.06);slabs.forEach((sl,i)=>{sl.g.userData.y=1.0+i*.66;sl.g.position.x=3.6})}
    else{clock.position.set(5.75,1.45,.2);clock.scale.setScalar(.62);gSheet.g.position.set(0,6.3,.06);slabs.forEach((sl,i)=>{sl.g.userData.y=.75+i*.66;sl.g.position.x=0})}}
  const dir=[0,Math.sin(TILT)+.05,Math.cos(TILT)],W=(g,x,y)=>{g.updateMatrixWorld(true);return g.localToWorld(V3(x,y,.1)).toArray()};
  FR.add("readPage",{c:W(rStand,-3.6,4.45),w:7,h:8.5,dir,pad:1.01,shadow:6}).add("readIdeas",{c:W(rStand,3.7,4.3),w:7,h:7.2,dir,pad:1.02,shadow:6}).add("readW",{c:W(rStand,0,4.5),w:15,h:8.4,dir,pad:1.02,shadow:9})
    .add("tagPage",{c:W(tStand,-3.6,4.45),w:7,h:8.5,dir,pad:1.01,shadow:6}).add("tagCard",{c:W(tStand,3.7,4.3),w:7,h:7.2,dir,pad:1.02,shadow:6}).add("tagW",{c:W(tStand,0,4.5),w:15,h:8.4,dir,pad:1.02,shadow:9})
    .add("grow",{c:W(gStand,0,4.6),w:7,h:9,dir,pad:1.01,shadow:7}).add("growW",{c:W(gStand,0,3.9),w:15,h:7,dir,pad:1.02,shadow:9});
  const zoneOf={read:"read",tag:"tag",timer:"tag",test:"tag",grow:"grow"};let zone="read",first=true;
  const zn=z=>wide?z+"W":z==="read"?(rFocus==="ideas"?"readIdeas":"readPage"):z==="tag"?(focus==="card"?"tagCard":"tagPage"):z;
  const all=[lTag,lMiss];let prevCur=null,prevMiss=null,doneAt=0;
  // the page painter, shared by the read and tag zones
  function paint(sh,sty,opt){sh.draw((g,w,h,R)=>{g.fillStyle=PAPER;L.rr(g,0,0,w,h,18);g.fill();const M=60;H2(g,TX.title,M,96,52);H2(g,TX.form,w-M,92,22,{mono:true,fill:MUTED,a:"right",wt:500});
    g.fillStyle="#EFE6EC";g.fillRect(M,120,w-2*M,3);const y0=140,f=L.fitFlow(g,segsOf(TX),{x:M,y:y0,w:w-2*M,size:44,lhf:1.34,sty},h-y0-80,26);
    if(opt.tap)for(const k in f.rects)f.rects[k].forEach(r=>R.push([r[0]-8,r[1]-4,r[2]+16,r[3]+8,"tap:"+k]));sh.rects=f.rects;
    H2(g,"— "+TX.by,w-M,Math.min(h-30,y0+f.h+44),24,{fill:MUTED,a:"right",wt:500});if(opt.note)H2(g,opt.note,w/2,h-26,22,{mono:true,fill:MUTED,a:"center"})})}
  S.l2={rPage,tPage,tCard,ideas,toIdeas,back};// handles for automated checks
  return{
    resize(){layout();FR.go(zn(zone),true)},
    step(stp){zone=zoneOf[stp.k]||"tag";if(stp.k!=="read")rFocus="page";focus=s.cur||s.miss?"card":"page";layout();FR.go(zn(zone),first);first=false},
    update(st0,stp,dt,t){const k=stp.k,exam=k==="timer";all.forEach(l=>l.hide());hud.clear();
      // lamp follows the zone
      const lx=zone==="read"?RX:zone==="tag"?TGX:GX;lamp.intensity=zone==="grow"?0:18;lamp.position.set(lx-6.5,6.2,1.6);lamp.target.position.set(lx-3.6,4,-1);
      // ---- read: page + ideas
      const rk=fontsV+"";if(rk!==rKey){rKey=rk;paint(rPage,kk=>kk&&TX.feats[kk]?{bg:lite(featCol(kk),.55)}:{},{})}
      const ik=s.idea+"|"+fontsV;if(ik!==iKey){iKey=ik;ideaHead.draw((g,w,h)=>{card(g,w,h,"#FFF3F6");H2(g,(TX.idea.q+" · tap one").toUpperCase(),44,h*.62,30,{mono:true,fill:PINK,wt:600})});
        ideas.forEach((c,i)=>{const [v,txt]=TX.idea.opts[i],on=s.idea===v,ok=v===TX.idea.ans;c.draw((g,w,h)=>{card(g,w,h,on?(ok?lite(PR.lime,.5):lite(PR.peach,.5)):PAPER,on?{c:K.plum,w:8}:{c:"#E4DAE2",w:4});L.fitFlow(g,[{t:txt}],{x:44,y:26,w:w-88,size:38,wt:on?600:500,lhf:1.22},h-44,24)})})}
      ideas.forEach((c,i)=>{const on=s.idea===TX.idea.opts[i][0];c.z=L.approach(S,c.z,on?.3:0,dt,9);c.g.position.z=.1+c.z});
      if(zone==="read")hud.set(s.idea?`<b class="${s.idea===TX.idea.ans?"ok":"warn"}">${s.idea===TX.idea.ans?"main idea found":"not that one"}</b>`:`<b>${featIds.length} features to find</b><i>read it twice, then pick the main idea</i>`);
      // ---- tag: the page with live highlights and stickies
      const tagsK=JSON.stringify(s.tags)+"|"+s.cur+"|"+s.miss+"|"+exam+"|"+fontsV;
      if(tagsK!==tKey){tKey=tagsK;paint(tPage,kk=>{if(!kk)return{};const f=TX.feats[kk],tg=s.tags[kk];if(f){const bg=done(tg)?featCol(kk):s.cur===kk?lite(featCol(kk),.3):exam?undefined:lite(featCol(kk),.62);return{bg,wt:s.cur===kk||done(tg)?600:400,ul:exam&&!done(tg)&&s.cur!==kk?false:false}}return{bg:s.miss===kk?lite(PR.peach,.5):undefined}},{tap:true,note:exam?"THE HIGHLIGHTS ARE OFF, AS IN THE EXAM":""})}
      featIds.forEach((id,i)=>{const m=stickies[i],d=done(s.tags[id]),r=tPage.rects&&tPage.rects[id]&&tPage.rects[id][0];m.userData.a=L.approach(S,m.userData.a,d?1:0,dt,7);m.visible=!!r&&m.userData.a>.02;
        if(m.visible){const p=tPage.g.worldToLocal(tPage.at(r[0],r[1]));m.position.set(p.x-.14,p.y+.06,.09+(1-m.userData.a)*1.4);m.rotation.set(-.3,0,-.25)}});
      featIds.forEach(id=>{if(done(s.tags[id])&&!prevDone[id]){lastDone=id;doneAt=t}});prevDone=Object.fromEntries(featIds.map(id=>[id,done(s.tags[id])]));
      // phone: a new phrase sends the camera to the card; a finished tag brings it back to the page
      if(s.cur!==prevCur||s.miss!==prevMiss){if(s.cur||s.miss){if(focus!=="card"){focus="card";if(zone==="tag")FR.go(zn("tag"))}}prevCur=s.cur;prevMiss=s.miss}
      if(!wide&&focus==="card"&&s.cur&&done(s.tags[s.cur])&&lastDone===s.cur&&t-doneAt>1.4&&zone==="tag"){focus="page";doneAt=1e9;FR.go(zn("tag"))}
      // the tag card
      const cur=s.cur,tg=cur?tagOf(cur):null,stage=!tg?null:tg.tech!=="ok"?"tech":tg.eff!=="ok"?"eff":tg.link!=="ok"?"link":"done";
      const ck=[cur,s.miss,JSON.stringify(tg),fontsV,nDone()].join("|");
      if(ck!==cKey){cKey=ck;tCard.draw((g,w,h,R)=>{card(g,w,h,"#FFF7F9",{c:"#EBC9D4",w:6});const M=44;
        if(s.miss){H2(g,"PLAIN STATEMENT",M,70,28,{mono:true,fill:K.deepPeach});L.fitFlow(g,[{t:`"${TX.distract[s.miss]}" says what happens. No technique to tag here. Hunt for a phrase that does something extra: compares, exaggerates, repeats, surprises.`}],{x:M,y:96,w:w-2*M,size:38,lhf:1.32},h-140,22);return}
        if(!cur){H2(g,exam?"TAP A PHRASE. THE HIGHLIGHTS ARE OFF.":"TAP A HIGHLIGHTED PHRASE TO START A TAG",M,70,26,{mono:true,fill:MUTED});H2(g,`${nDone()} of ${featIds.length} tagged`,M,130,44);return}
        const f=TX.feats[cur];g.fillStyle=featCol(cur);L.rr(g,24,24,w-48,140,22);g.fill();L.fitFlow(g,[{t:`"${f.t}"`}],{x:M,y:34,w:w-2*M,size:36,wt:600,lhf:1.18},118,22);
        const LAB={tech:"1 · TECHNIQUE",eff:"2 · EFFECT ON THE READER",link:LEVEL===3?"3 · LINK TO THE WRITER'S POSITION":"3 · LINK TO THE MAIN IDEA"};
        if(stage==="done"){H2(g,"TAGGED ✓",M,212,28,{mono:true,fill:K.deepMint});L.fitFlow(g,[{t:f.tech+": ",k:"b"},{t:f.eff+", which suggests "+f.link+"."}],{x:M,y:228,w:w-2*M,size:34,lhf:1.3,sty:q=>q?{wt:700}:{}},h-250,18);return}
        H2(g,LAB[stage],M,208,26,{mono:true,fill:MUTED});const opts=options(cur,stage),oy=222,oh=(h-oy-24)/3;
        opts.forEach(([txt,v],i)=>{const picked=tg[stage]==="no"&&tg.pick===i&&v==="no";const y=oy+i*oh;g.fillStyle=picked?lite(PR.peach,.45):"#FFFFFF";L.rr(g,24,y+6,w-48,oh-12,20);g.fill();g.strokeStyle="#E4DAE2";g.lineWidth=3;L.rr(g,24,y+6,w-48,oh-12,20);g.stroke();
          L.fitFlow(g,[{t:txt}],{x:M+6,y:y+16,w:w-2*M-12,size:33,lhf:1.16},oh-30,18);R.push([24,y+6,w-48,oh-12,`opt:${stage}:${v}:${i}`])})})}
      // the clock (timer step only)
      clock.visible=exam;if(exam){const left=s.timeLeft,tot=TX.minutes*60,fr=left/tot;if(Math.abs(fr-sweepF)>.0005){sweepF=fr;sweep.geometry.dispose();sweep.geometry=new THREE.CircleGeometry(.95,64,Math.PI/2-fr*Math.PI*2,fr*Math.PI*2)}
        minH.rotation.z=-(1-fr)*Math.PI*2;secH.rotation.z=-((tot-left)%60)/60*Math.PI*2}
      if(zone==="tag"){hud.set(exam?`<b class="${s.timeLeft<120?"warn":""}">${fmtT(s.timeLeft)}${s.timerDone?" · time":s.timerOn?"":" · press Start"}</b><i>${s.timerTags} tagged this run</i>`:`<b>${nDone()} of ${featIds.length} tagged</b>${stage&&stage!=="done"?`<i>move ${stage==="tech"?1:stage==="eff"?2:3} of 3</i>`:""}`);
        if(lastDone&&done(s.tags[lastDone])&&tPage.rects&&tPage.rects[lastDone]&&(wide||focus==="page")){const r=tPage.rects[lastDone][0];lTag.show().at(tPage.at(r[0],r[1])).set(`<b>${TX.feats[lastDone].tech}</b>`)}
        if(s.miss&&tPage.rects&&tPage.rects[s.miss]&&(wide||focus==="page")){const r=tPage.rects[s.miss][0];lMiss.show().at(tPage.at(r[0],r[1])).set("plain statement")}}
      // ---- grow: the stack and the paragraph
      const id=featIds.find(q=>done(s.tags[q]))||"f1",f=TX.feats[id],n=s.stage,gk=id+n+fontsV;
      if(gk!==gKey){gKey=gk;const segs=[];if(n>=1)segs.push({t:`The writer uses ${f.tech.toLowerCase().replace(/ \(.*\)/,"")} in "${f.t}". `,k:"tech"});if(n>=2)segs.push({t:`This ${f.eff}. `,k:"eff"});if(n>=3)segs.push({t:`It suggests ${f.link}. `,k:"link"});
        if(n>=4)segs.push({t:LEVEL===3?`The writer wants the reader to question what convenience has cost them, not just to admire the walking. `:`The writer wants us to feel how much a small comfort is worth when everything else is stripped away. `,k:"so"});
        if(n>=5)segs.push({t:LEVEL===3?`It works because the joke and the honesty arrive together: the writer admits the rain and the long walk, so the final reversal feels earned rather than preached.`:`It works because the ordinary is never named as special; the storm does that job, so the reader arrives at the comfort the way Mia does.`,k:"so"});
        gSheet.draw((g,w,h)=>{card(g,w,h,PAPER);H2(g,`ONE TAG → ONE PARAGRAPH · ${n} OF 5 MOVES`,44,58,26,{mono:true,fill:MUTED});L.fitFlow(g,segs,{x:44,y:78,w:w-88,size:38,lhf:1.36,sty:q=>({bg:STC[q]})},h-100,18)});
        slabs.forEach((sl,i)=>sl.draw((g,w,h)=>{g.fillStyle=[STC.tech,STC.eff,STC.link,STC.so,STC.so][i];L.rr(g,0,0,w,h,22);g.fill();H2(g,`${i+1}  ${GROW[i]}${i>=3?(LEVEL===3?" (critical response)":" (Merit, Excellence)"):""}`,36,h*.66,h*.42,{wt:600})}))}
      slabs.forEach((sl,i)=>{sl.a=L.approach(S,sl.a,i<n?1:0,dt,8);sl.g.visible=sl.a>.02;sl.g.position.y=sl.g.userData.y+(1-sl.a)*1.2;sl.g.position.z=.2})
      if(zone==="grow")hud.set(`<b>${n} of 5 moves</b><i>${n>=4?"moves 4 and 5 carry the higher grades":"slide Moves to grow it"}</i>`);
      hud.flush()}};
}
const api=StudyKit.mount({kupu:KUPU,scene3d:unseen3d,postprocessing:false,
  eyebrow:LEVEL===3?"English · Unfamiliar texts, critical response":"English · Unfamiliar texts",title:"The unfamiliar text machine",homeHash:LEVEL===3?"l3":"l2",
  fig:"FIG. 44 · AN UNSEEN PAGE, A TAG CARD AND A CLOCK",railTitle:"Technique, effect, idea",
  badge:LEVEL===3?{label:"NCEA L3 English 91474",exam:"2026-11-11T09:30:00+13:00",examText:"Wed 11 Nov, 9:30am"}:{label:"NCEA L2 English 91100",exam:"2026-11-12T09:30:00+13:00",examText:"Thu 12 Nov, 9:30am"},
  mainBox:"0 0 800 460",mainPhoneBig:true,mainLabel:"An original unseen passage with tappable phrases, a tag card with technique, effect and link choices, an exam clock, and a paragraph growing in five moves",closeBox:"0 0 420 260",
  state:s,steps,
  controls:[{type:"button",id:"reset",label:"↺ Clear tags",onClick:()=>{s.tags={};s.cur=null;s.miss=null;s.timerTags=0;sfx("whoosh")}},
    {type:"range",id:"stage",label:"Moves",min:1,max:5,step:1,get:()=>s.stage,set:(x,v)=>{s.stage=v},fmt:()=>s.stage+" of 5"},
    {type:"button",id:"start",label:"▶ Start the clock",onClick:()=>{s.tags={};s.cur=null;s.miss=null;s.timerTags=0;s.timeLeft=TX.minutes*60;s.timerOn=true;s.timerDone=false;s.playing=true;sfx("pop")}}],
  tick:(x,dt,st)=>{if(st.k!=="timer"||!s.timerOn)return;s.timer+=dt;if(s.timer>=1){s.timer=0;s.timeLeft=Math.max(0,s.timeLeft-1);if(s.timeLeft===0){s.timerOn=false;s.timerDone=true;s.playing=false;sfx("buzz")}}},
  drawMain:(x,st)=>{const k=st.k;return k==="read"?readScene():k==="grow"?growScene():k==="tag"||k==="timer"||k==="test"?tagScene(st):tagScene(st)},
  drawClose:(x,st)=>{const k=st.k;return k==="read"?readClose():k==="tag"?tagClose():k==="grow"?growClose():k==="timer"?timerClose():testClose()},
  chips:()=>({idea:["MAIN IDEA",s.idea?(s.idea===TX.idea.ans?"found":"not that one"):"not yet",true],feats:["FEATURES",`${featIds.length} to find`],tagged:["TAGGED",`${nDone()} of ${featIds.length}`,true],started:["STARTED",`${nStarted()}`],moves:["MOVES",`${s.stage} of 5`,true],clock:["CLOCK",fmtT(s.timeLeft),true],run:["THIS RUN",`${s.timerTags} tagged`]}),
  challenges:[
    {q:`Tag the <b>simile</b> correctly, all three moves.`,check:()=>done(s.tags[simile]),ok:()=>`Yes: "${TX.feats[simile].t}" is the simile, and you took it all the way to the idea.`,no:()=>s.tags[simile]&&s.tags[simile].tech==="ok"?"Not yet: the technique is right; finish the effect and the link.":"Not yet. Hint: a simile compares with 'like' or 'as'. Find that phrase and tag it."},
    {q:"Finish <b>three</b> full tags on different features.",check:()=>nDone()>=3,ok:()=>`Yes: ${nDone()} features tagged technique → effect → idea. That is a full answer's worth.`,no:()=>`Not yet: ${nDone()} finished. Hint: a tag counts when all three moves are right.`},
    {q:"Pick the main idea on the First read step.",check:()=>s.idea===TX.idea.ans,ok:"Yes. "+TX.idea.why,no:()=>s.idea?"Not that one. Hint: which option do most of the details keep pointing to?":"Not yet: go to First read and tap an idea."},
  ],
  retrieval:LEVEL===3?{q:"What makes a response 'critical' at Level 3?",options:["It judges how and why the writer's choices work, and what they add up to","It lists every technique in the text","It disagrees with the writer","It retells the text in order"],answer:0,why:"Critical means judging the choices and their significance, not just spotting them."}:{q:"Which move turns a spotted feature into analysis?",options:["Explaining the effect and linking it to the idea","Naming the technique","Quoting the whole sentence","Counting how many techniques there are"],answer:0,why:"Effect plus link. Naming alone is a label; the marks are in what the feature does and why it matters to the idea."},
  papers:[{label:"NZQA: English past exams",url:"https://www2.nzqa.govt.nz/ncea/subjects/past-exams-and-exemplars/english/"}],
  truth:"The passage is original, written for this machine. Technique names follow common classroom usage; your teacher may group them differently. The grade words are paraphrased, not NZQA marking, and the exam gives you three texts, not one.",
  footer:LEVEL===3?"Covers NCEA Level 3 English 91474 (Respond critically to significant aspects of unfamiliar written text(s) through close reading, supported by evidence): identifying language features, explaining effects, linking to the writer's position, and judging how and why the choices work. Add ?level=3 to the address for this mode; without it the machine covers Level 2 91100.":"Covers NCEA Level 2 English 91100 (Analyse significant aspects of unfamiliar written text(s) through close reading, supported by evidence): identifying language features, explaining their effects, linking them to ideas and the writer's purpose, and working at exam pace. Level 3 students can add ?level=3 to the address for 91474."});
// ---- taps
const svg=document.getElementById("k-main");
function act(a){const[k,v,w,i]=a.split(":");
  if(k==="idea"){s.idea=v;sfx(v===TX.idea.ans?"ding":"buzz")}
  else if(k==="tap"){if(TX.feats[v]){s.cur=v;s.miss=null;tagOf(v);sfx("pop")}else{s.miss=v;s.cur=null;sfx("buzz")}}
  else if(k==="opt"){const t=tagOf(s.cur);if(w==="ok"){t[v]="ok";const nowDone=done(t);sfx(nowDone?"ding":"pop");if(nowDone){if(s.timerOn)s.timerTags++;if(nDone()===featIds.length)setTimeout(()=>sfx("win"),300)}}else{t[v]="no";t.pick=+i;sfx("buzz")}}
  api.redraw()}
svg.addEventListener("click",e=>{const g=e.target.closest&&e.target.closest("[data-a]");if(g)act(g.getAttribute("data-a"))});
svg.addEventListener("keydown",e=>{if(e.key!=="Enter"&&e.key!==" ")return;const g=e.target.closest&&e.target.closest("[data-a]");if(g){e.preventDefault();act(g.getAttribute("data-a"))}});
const css=document.createElement("style");css.textContent=`.ux-opts{display:grid;gap:6px;margin-top:8px}.ux-opt{display:flex;gap:8px;align-items:flex-start;font-size:13.5px;line-height:1.4;color:var(--body);border:1px solid var(--line);border-radius:10px;padding:7px 10px;cursor:pointer;background:var(--paper)}
.ux-opt:has(input:checked){border-color:var(--ink);background:var(--chalk)}.ux-opt input{accent-color:var(--sun);margin-top:3px;flex:none}#k-main [data-a]:focus{outline:none}#k-main [data-a]:focus-visible>rect:first-of-type{stroke:var(--sun);stroke-width:4}`;document.head.appendChild(css);
try{mq.addEventListener("change",()=>api.redraw())}catch(e){}
try{document.fonts&&document.fonts.ready.then(()=>api.redraw())}catch(e){}
})();
