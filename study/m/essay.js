(()=>{
// The paragraph machine: read an unfamiliar text like a detective, answer three kinds of question,
// build a TEEL paragraph, sharpen vague words, and plan an essay where every paragraph plugs into the thesis.
// The letter and the story here are original, written for this machine.
const esc=StudyKit.esc;
const sfx=n=>{try{if(window.StudyKit&&StudyKit.sfx)StudyKit.sfx(n)}catch(e){}};
// figure parts: the shared bench look (StudyKit.fig): a blush acrylic clipboard, paper sheets, chunky plastic keys
const F=StudyKit.fig,PAL=F.palette,TINT=PAL.case.blush,PR=PAL.product;
const lite=(h,k)=>{const n=parseInt(h.slice(1),16),f=v=>Math.round(v+(255-v)*k).toString(16).padStart(2,"0");return "#"+f(n>>16&255)+f(n>>8&255)+f(n&255)};
const INK="#262E5C",ROSE="#6E6A86",WHITE="#FFFDFB",PAPER="#FFFDF8";
const TEEL={T:lite(PR.blueberry,.55),E1:lite(PR.butter,.5),E2:lite(PR.lime,.5),L:lite(PR.strawberry,.55)};
const TECH=[lite(PR.strawberry,.5),lite(PR.blueberry,.5),lite(PR.butter,.45),lite(PR.lime,.5),PAL.case.lavender,lite(PR.peach,.45)];
const LENS={p:lite(PR.butter,.45),a:lite(PR.blueberry,.5)};
// a chunky plastic key with a lit top and navy ink on it
const key=(x,y,w,h,col,o={})=>F.box(x,y,w,h,{colour:col,kind:"plastic",d:o.d||5,r:o.r!=null?o.r:Math.min(h/2,10),shadow:false,sw:o.sw,stroke:o.stroke});
const tag=(x,yb,lab,col,z)=>{const h=z.tiny*1.7,w=tw(lab,z.tiny,600,true)+26;return key(x,yb-h,w,h,col,{d:5,r:h/2})+T(x+w/2,yb-z.tiny*0.85+z.tiny*0.35,lab,z.tiny,{a:"middle",mono:true,wt:600})};
// a frosted blush clipboard holding a paper sheet with a navy drop shadow and a steel clip
function board(ax,ay,aw,ah,px,py,pw,ph,clip){let o=F.acrylic(ax,ay,aw,ah,{tint:TINT,d:10,r:14,shadow:false,balls:true,opacity:.5});
  o+=`<rect x="${px+5}" y="${py+6}" width="${pw}" height="${ph}" rx="5" fill="${PAL.shadow}" opacity=".14"/><rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="5" fill="${PAPER}" stroke="#E4DCCF" stroke-width="1.2"/>`;
  if(clip){const cx=px+pw/2;o+=F.box(cx-44,py-10,88,16,{colour:PAL.steel,kind:"metal",d:6,r:5,shadow:false})+`<rect x="${cx-14}" y="${py-4}" width="28" height="4" rx="2" fill="${PAL.steelDark}"/>`}
  return o}
const mq=matchMedia("(max-width:820px)");const PH=()=>mq.matches;
const Z=()=>PH()?{h2:30,body:25,read:23.5,small:20,tiny:17}:{h2:24,body:19,read:19,small:15,tiny:12.5};
let _mc=null;
function tw(t,size,wt=400,mono=false){try{_mc=_mc||document.createElement("canvas").getContext("2d");_mc.font=`${wt} ${size}px ${mono?'"IBM Plex Mono",ui-monospace,monospace':'"Instrument Sans",system-ui,sans-serif'}`;return _mc.measureText(t).width}catch(e){return String(t).length*size*(mono?0.6:0.52)}}
const DISP="var(--display)",MONO="var(--mono)";
const T=(x,y,t,size,o={})=>`<text x="${x}" y="${y}"${o.a?` text-anchor="${o.a}"`:""} style="font:${o.wt||400} ${size}px ${o.mono?MONO:DISP};fill:${o.fill||INK}${o.ls?`;letter-spacing:${o.ls}px`:""}${o.op!=null?`;opacity:${o.op}`:""}">${esc(t)}</text>`;
function flow(segs,o){const size=o.size,lh=o.lh||size*1.35,sty=o.sty||(()=>({})),P=[];let pend=true;
  segs.forEach(sg=>String(sg.t).split(/(\n+|[ \t]+)/).forEach(pt=>{if(!pt)return;if(/^\n+$/.test(pt)){P.push({br:pt.length});pend=true;return}if(/^[ \t]+$/.test(pt)){pend=true;return}
    P.push({t:pt,k:sg.k,glue:!pend&&P.length>0&&!P[P.length-1].br});pend=false}));
  const sp=tw(" ",size,o.wt||400);const lines=[[]];let cx=0;const U=[];
  P.forEach(p=>{if(p.br){U.push({br:p.br});return}if(p.glue&&U.length&&!U[U.length-1].br)U[U.length-1].ps.push(p);else U.push({ps:[p]})});
  U.forEach(u=>{if(u.br){lines.push([]);if(u.br>1)lines[lines.length-1].gap=true;cx=0;return}
    u.ps.forEach(p=>{const st=sty(p.k)||{};p.st=st;p.w=tw(p.t,size,st.wt||o.wt||400)});const uw=u.ps.reduce((a,p)=>a+p.w,0);
    if(cx>0&&cx+sp+uw>o.w){lines.push([]);cx=0}let x=cx>0?cx+sp:0;u.ps.forEach(p=>{p.x=x;x+=p.w;lines[lines.length-1].push(p)});cx=x});
  let yy=o.y;const bgs=[],txt=[],hit=[];
  lines.forEach(L=>{if(L.gap)yy+=lh*0.45;const lw=L.length?L[L.length-1].x+L[L.length-1].w:0,off=o.align==="middle"?(o.w-lw)/2:o.align==="end"?o.w-lw:0,base=yy+lh/2+size*0.34,top=yy+(lh-size*1.32)/2;
    L.forEach((p,j)=>{const st=p.st,pv=L[j-1],x0=o.x+off+p.x,first=!pv||pv.k!==p.k||p.k==null;
      if(first&&(st.bg||st.ul||st.data)){let e=j;while(L[e+1]&&L[e+1].k===p.k&&p.k!=null)e++;const xe=o.x+off+L[e].x+L[e].w;
        if(st.bg)bgs.push(`<rect x="${x0-3.5}" y="${top}" width="${xe-x0+7}" height="${size*1.32}" rx="5" fill="${st.bg}"${st.bgop!=null?` opacity="${st.bgop}"`:""}/>`);
        if(st.ul)bgs.push(`<rect x="${x0}" y="${base+size*0.16}" width="${xe-x0}" height="${Math.max(2,size*0.12)}" rx="1" fill="${st.ul}"/>`);
        if(st.data)hit.push(`<rect x="${x0-3}" y="${yy}" width="${xe-x0+6}" height="${lh}" fill="transparent" data-a="${st.data}" style="cursor:pointer"/>`)}
      txt.push(`<text x="${x0}" y="${base}" style="font:${st.wt||o.wt||400} ${size}px ${DISP};fill:${st.fill||o.fill||INK}${st.op!=null?`;opacity:${st.op}`:""}">${esc(p.t)}</text>`)});
    yy+=lh});
  return{o:bgs.join("")+txt.join("")+hit.join(""),h:yy-o.y,n:lines.length}}
function fitFlow(segs,o,maxH,minSize){let sz=o.size,r;for(let i=0;i<9;i++){r=flow(segs,{...o,size:sz,lh:sz*(o.lhf||1.3)});if(r.h<=maxH||sz<=minSize)break;sz*=0.94}return r}
const ease=x=>x<0?0:x>1?1:1-Math.pow(1-x,3);
let till=0,raf=0;function kick(ms){till=Math.max(till,performance.now()+ms);if(!raf)raf=requestAnimationFrame(pump)}
function pump(){raf=0;api&&api.redraw();if(performance.now()<till)raf=requestAnimationFrame(pump)}
function meter(x,y,w,n,max,label,z){let o=T(x,y-6,label,z.tiny,{mono:true,fill:ROSE,ls:1});const cw=(w-(max-1)*4)/max;
  for(let i=0;i<max;i++){const lit=i<n,c=i<max*0.5?lite(PR.peach,.25):i<max*0.8?PR.butter:PR.lime;o+=key(x+i*(cw+4),y,cw-4,16,lit?(n>=max?PR.lime:c):"#ECE8EF",{d:4,r:4})}return o}

// ---- the reading text: a letter to the editor (original)
const LETTER={title:"Give Us Somewhere to Ride",by:"A Year 10 rider",form:"LETTERS TO THE EDITOR",
 s:["Every afternoon, the car park behind the library fills with kids on bikes.",
  "[[We dodge|t2]] reversing cars, bounce off kerbs and get told to move on.",
  "[[Is that really the best our town can offer?|t1 a]]",
  "\n[[A pump track would change that.|p]]",
  "It is a loop of smooth bumps and berms that you ride without pedalling, and [[it costs far less than a new sports field|t3 a]].",
  "\n[[Picture it: little kids on balance bikes, teenagers learning tricks, parents chatting on the bank.|t4 a]]",
  "[[Nobody is stuck behind a screen, and nobody is dodging a car.|t5]]",
  "\n[[We are not asking for a stadium.|t6 a]]","[[We are asking for somewhere safe to ride.|t6 p]]","[[Please, give us that chance.|p a]]"]};
const TECHN=["Rhetorical question","Inclusive 'we'","Comparison (cost)","Imagery and a list of three","Repetition","Contrast"];
const TECHW=["makes the council question whether the car park is good enough","shows the writer speaks for all young riders, not just themselves","makes the pump track sound cheap and sensible","helps readers picture the whole community enjoying it","hammers home that the track is healthy and safe","makes the request sound modest and reasonable"];
const STORY={title:"The Power Cut",by:"A short story",form:"AN UNSEEN TEXT",
 s:["At 7:14 the house went silent.","The fridge stopped humming, the TV blinked into blackness, and my sister's music died mid-chorus.","For a second nobody moved.",
  "Then Dad found the torch, and the kitchen filled with long, wobbling shadows.","\nOutside, the wind shoved at the windows as if it wanted to come in.","We ate cold pizza by candlelight and played cards until our eyes stung.",
  "Nobody checked a phone, because there was nothing to check.","\nWhen the lights snapped back on at ten, we all groaned.","It had been the best night in months."]};
function segsOf(doc,sty){const out=[];doc.s.forEach((sen,i)=>{let t=sen;if(t.startsWith("\n")){out.push({t:"\n\n"});t=t.slice(1)}else if(i)out.push({t:" "});
  t.replace(/\[\[([^|\]]+)\|([^\]]+)\]\]|([^\[]+)/g,(m,a,b,c)=>{out.push(a?{t:a,k:i+"|"+b}:{t:c,k:i+"|"});return""})});return out}

// ---- questions on the letter
const QS={retrieve:{q:"Where do kids ride their bikes at the moment?",ans:0,tip:"RETRIEVE: the answer is right there in the text. Find it, then copy it or put it in your own words.",
  model:"Kids ride in the car park behind the library.",hint:"Look for where the writer says what happens every afternoon now."},
 infer:{q:"What can you infer about how young riders are treated in the town now?",ans:1,tip:"INFER: read between the lines. Give your idea, then 'because', then a quote that proves it.",
  model:"Young riders are treated as a nuisance, because they 'get told to move on' even though they have nowhere else to go.",hint:"Look for a clue about how adults react to the riders."},
 effect:{q:"Explain the effect of the sentence that begins 'Picture it:'.",ans:5,tip:"EXPLAIN THE EFFECT: name the technique, quote it, then say what it makes the reader think or feel.",
  model:"The writer uses imagery and a list of three ('little kids on balance bikes, teenagers learning tricks, parents chatting on the bank') to help readers picture the whole community using the track, which makes the council feel it would benefit everyone, not just teenagers.",hint:"Find the sentence that asks readers to imagine the track."}};
// ---- TEEL blocks
const BLOCKS={T:"The writer persuades the council by making the problem feel urgent and the solution feel easy.",
 E1:"The letter asks, 'Is that really the best our town can offer?'",
 E2:"This rhetorical question makes adult readers feel a little embarrassed that young people are stuck dodging cars in a car park.",
 L:"Once readers feel responsible for the problem, a simple, affordable pump track seems like the obvious answer.",
 D1:"I like bikes too, so I really enjoyed reading this letter.",
 D2:"The letter has four paragraphs and is signed by a Year 10 rider."};
const CORRECT=["T","E1","E2","L"],SHOW=["E2","D1","T","L","D2","E1"],SLOTN=["T","E","E","L"],SLOTK=["T","E1","E2","L"];
const JOB={T:["TOPIC","Your point, answering the question"],E1:["EVIDENCE","A short, exact quote"],E2:["EXPLAIN","How the quote proves your point"],L:["LINK","Back to the question or the big idea"]};
// ---- dials to sharpen a vague paragraph
const DIALS=[["a technique","a list","a list of three"],["show","tell readers","emphasise"],["good","useful","good for the whole community, not just teenagers"],
 ["makes the reader feel things","makes the reader feel happy","makes parents picture their own children there"],["is very effective","works well","makes the council more likely to say yes"]];
// ---- essay plan
const THESES=[{t:"This essay is about a letter about a pump track.",kind:"Topic only",ideas:[]},
 {t:"The writer uses lots of language features to persuade.",kind:"Vague",ideas:[]},
 {t:"The writer persuades the council by making the problem feel urgent and the solution feel easy and fair.",kind:"Arguable",ideas:[["problem feel urgent",TECH[0]],["solution feel easy",TECH[3]],["fair",TECH[2]]]}];
const BODIES=["Urgent: the rhetorical question and 'dodging cars' make the car park sound unsafe.","Easy: comparing the cost to a sports field makes a pump track sound cheap and simple.","Fair: 'We are not asking for a stadium' makes the request sound modest and reasonable."];

const s={lens:"t",qt:"retrieve",pick:null,order:[],doneT:0,dials:[0,0,0,0,0],dialT:[0,0,0,0,0],thesis:0,bodies:3,solved:{},plugT:0};
const teelScore=()=>{let n=0;s.order.forEach((b,i)=>{if(i<4&&b===CORRECT[i])n++});return Math.max(0,n-s.order.filter(b=>b[0]==="D").length)};
const teelDone=()=>s.order.length===4&&s.order.every((b,i)=>b===CORRECT[i]);
const dialScore=()=>s.dials.reduce((a,b)=>a+b,0);
const sharpLevel=n=>n>=10?"Precise":n>=7?"Strong":n>=4?"Getting there":"Vague";

// ---- step 1 and 2: the letter on the desk
function paper(doc,z,top,sty,extra){let o=board(2,top+2,786,404-top,18,top+8,756,386-top,true);
  const tb=top+10+z.h2*1.05;o+=T(32,tb,doc.title,z.h2,{wt:600})+T(764,tb,doc.form,z.tiny,{a:"end",mono:true,fill:ROSE,ls:1.2});const y0=tb+z.h2*0.4;
  const f=fitFlow(segsOf(doc),{x:32,y:y0,w:736,size:z.read,lhf:1.27,sty},404-y0-z.small*1.3,z.read*0.75);o+=f.o;
  o+=T(764,Math.min(402,y0+f.h+z.small*1.15),"— "+doc.by,z.small,{a:"end",fill:ROSE});return o+(extra||"")}
function parseK(k){if(!k)return{i:-1,tags:[]};const[i,t]=k.split("|");return{i:+i,tags:t?t.split(" "):[]}}
function readScene(){const z=Z();let o=F.floor(800,420);
  o+=paper(LETTER,z,10,k=>{const{tags}=parseK(k);if(s.lens==="t"){const t=tags.find(x=>x[0]==="t");return t?{bg:TECH[+t[1]-1],wt:500}:{}}
    return tags.includes(s.lens)?{bg:LENS[s.lens],wt:600}:{op:0.55}});
  // lens tag
  const lab=s.lens==="p"?"LENS: PURPOSE":s.lens==="a"?"LENS: AUDIENCE":"LENS: TECHNIQUES";
  o+=tag(32,396,lab,s.lens==="t"?PAL.case.lavender:LENS[s.lens],z);
  return o}
function qScene(){const z=Z(),Q=QS[s.qt];let o=F.floor(800,420);
  o+=paper(LETTER,z,10,k=>{const{i}=parseK(k);const st={data:"sent:"+i};if(s.pick===i){st.bg=i===Q.ans?lite(PR.lime,.45):lite(PR.peach,.5);st.wt=600}return st});
  const lab=s.qt==="effect"?"EXPLAIN THE EFFECT":s.qt.toUpperCase();
  o+=tag(32,396,lab,s.qt==="retrieve"?LENS.p:s.qt==="infer"?LENS.a:TECH[0],z);
  return o}
// ---- step 3: TEEL blocks
function teelScene(){const z=Z(),now=performance.now(),done=teelDone();let o=F.floor(800,420);
  o+=T(16,30,done?"PARAGRAPH BUILT":"TAP IN ORDER: T → E → E → L",z.small,{mono:true,wt:600})+meter(600,16,184,teelScore(),4,"",z);
  const p=done?ease((now-s.doneT)/700):0,gap=6,pad=12,TW=696;let size=z.body,B;
  for(let k=0;k<10;k++){B=SHOW.map(id=>({id,h:flow([{t:BLOCKS[id]}],{x:0,y:0,w:TW,size,lh:size*1.24}).h+pad*2}));if(B.reduce((a,b)=>a+b.h+gap,0)<=370||size<12)break;size*=0.95}
  const order=done?[...CORRECT,"D1","D2"]:SHOW,ya={},yb={};let y=46;SHOW.forEach((id,i)=>{ya[id]=y;y+=B[i].h+gap});y=46;order.forEach(id=>{yb[id]=y;y+=B.find(b=>b.id===id).h+gap});
  SHOW.forEach((id,i)=>{const b=B[i],yy=ya[id]+(yb[id]-ya[id])*p,pos=s.order.indexOf(id),isD=id[0]==="D",h=b.h;
    const fill=done?(isD?"#F1ECEF":TEEL[id]):pos>=0&&pos<4?TEEL[SLOTK[pos]]:WHITE;
    o+=`<g data-a="blk:${id}" role="button" tabindex="0" aria-label="${esc(BLOCKS[id])}" style="cursor:pointer" opacity="${done&&isD?1-0.55*p:1}">`+key(16,yy,760,h,fill,{d:8,r:12,sw:pos>=0?1.8:1.2,stroke:pos>=0?INK:undefined});
    const badge=pos>=0?(pos<4?SLOTN[pos]:"?"):"",cx=44,cy=yy+h/2,r=Math.min(size*0.75,h/2-4);
    o+=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${pos>=0?INK:"#fff"}" fill-opacity="${pos>=0?1:.6}" stroke="${INK}" stroke-opacity="${pos>=0?1:.5}" stroke-dasharray="${pos>=0?"":"3 3"}"/>`+(pos>=0?`<path d="M${cx-r*.55},${cy-r*.35} a${r*.7},${r*.7} 0 0 1 ${r*.6},-${r*.4}" stroke="#fff" stroke-opacity=".5" stroke-width="1.6" fill="none" stroke-linecap="round"/>`:"")+(badge?T(cx,cy+size*0.32,badge,size*0.9,{a:"middle",mono:true,wt:600,fill:WHITE}):"");
    o+=flow([{t:BLOCKS[id]}],{x:74,y:yy+pad,w:TW,size,lh:size*1.24}).o;
    if(done){const lab=isD?"✕ NOT ANALYSIS":JOB[id][0],lw=tw(lab,z.tiny,600,true)+14;o+=`<g opacity="${p}"><rect x="${768-lw}" y="${yy+h-z.tiny*1.5-4}" width="${lw}" height="${z.tiny*1.5}" rx="${z.tiny*0.75}" fill="#fff" stroke="${PAL.pill.line}"/>`+T(768-lw/2,yy+h-4-z.tiny*0.42,lab,z.tiny,{a:"middle",mono:true,wt:600,fill:isD?"#A5552F":INK})+`</g>`}
    o+=`</g>`});
  return o}
// ---- step 4: sharpen
function sharpScene(){const z=Z(),now=performance.now(),n=dialScore();let o=F.floor(800,420);
  o+=T(16,30,"TAP A HIGHLIGHTED PHRASE TO SHARPEN IT",z.small,{mono:true,wt:600})+meter(520,18,264,n,10,"",z);
  o+=board(8,50,774,362,20,58,752,344,false);
  const d=i=>({t:DIALS[i][s.dials[i]]+" ▾",k:"d"+i});
  const segs=[{t:"The writer uses "},d(0),{t:" ('little kids on balance bikes, teenagers learning tricks, parents chatting') to "},d(1),{t:" that a pump track is "},d(2),{t:". This "},d(3),{t:" and "},d(4),{t:"."}];
  const col=[lite(PR.peach,.5),lite(PR.butter,.45),lite(PR.lime,.45)];
  const f=fitFlow(segs,{x:44,y:70,w:712,size:z.h2,lhf:1.55,sty:k=>k?{bg:col[s.dials[+k[1]]],wt:600,data:"dial:"+k[1]}:{}},290,z.body*0.8);o+=f.o;
  o+=T(400,392,`${sharpLevel(n).toUpperCase()} · ${n}/10`,z.small,{a:"middle",mono:true,wt:600,fill:n>=10?"#2F6B47":ROSE});
  return o}
// ---- step 5: essay plan with patch cables
function planScene(){const z=Z(),th=THESES[s.thesis],nb=s.bodies,now=performance.now(),p=ease((now-s.plugT)/600);let o=F.floor(800,420);
  // each card is a paper panel standing on the floor, its header a strip of pastel plastic
  const card=(x,y,w,h,head,col)=>{const m=F.mat("plastic",col);return F.box(x,y,w,h,{colour:WHITE,kind:"plastic",d:8,r:14,shadow:y+h>390?undefined:false,shadowLen:26,stroke:"#B9B2C4"})+`<path d="M${x},${y+14} a14,14 0 0 1 14,-14 h${w-28} a14,14 0 0 1 14,14 v${z.tiny*1.6} h-${w}Z" fill="${col}" stroke="${m.stroke}" stroke-width="1.2"/><path d="M${x+12},${y+3.5} h${Math.min(w*.4,90)}" stroke="#fff" stroke-opacity=".7" stroke-width="2" stroke-linecap="round"/>`+T(x+14,y+z.tiny*1.25,head,z.tiny,{mono:true,wt:600,ls:1})};
  const hh=z.tiny*1.6+14;
  // intro
  o+=card(16,16,244,388,"INTRO",TEEL.T);
  const ctxF=fitFlow([{t:"In the letter 'Give Us Somewhere to Ride', a Year 10 rider asks the local paper's readers for a pump track."}],{x:30,y:16+hh,w:216,size:z.small*0.9,lhf:1.22,fill:ROSE},120,z.tiny);o+=ctxF.o;
  const ty=16+hh+ctxF.h+10;o+=T(30,ty+z.tiny,"THESIS",z.tiny,{mono:true,fill:ROSE,ls:1});
  const tsegs=[];if(th.ideas.length){let rest=th.t;th.ideas.forEach(([w,c],i)=>{const j=rest.indexOf(w);tsegs.push({t:rest.slice(0,j)},{t:w,k:"i"+i});rest=rest.slice(j+w.length)});tsegs.push({t:rest})}else tsegs.push({t:th.t});
  const tf=fitFlow(tsegs,{x:30,y:ty+z.tiny+8,w:216,size:z.small,lhf:1.28,wt:600,sty:k=>k?{bg:th.ideas[+k[1]][1]}:{}},404-ty-z.tiny-20,z.tiny);o+=tf.o;
  // bodies
  const bx=316,bw=250,top=16,avail=388,bh=(avail-(nb-1)*10)/nb;const ends=[];
  for(let i=0;i<nb;i++){const y=top+i*(bh+10),idea=th.ideas[i],col=idea?idea[1]:"#ECE8EF";
    o+=card(bx,y,bw,bh,`BODY ${i+1} · TEEL`,col);const f=fitFlow([{t:BODIES[i]}],{x:bx+14,y:y+hh+2,w:bw-28,size:z.small,lhf:1.22},bh-hh-10,z.tiny*0.9);o+=f.o;ends.push([bx,y+bh/2,idea])}
  // cables: intro jacks → bodies
  th.ideas.forEach((idea,i)=>{const jy=60+i*40,jx=260,jm=F.mat("plastic",idea[1]);o+=`<circle cx="${jx}" cy="${jy}" r="8" fill="${PAL.steel}" stroke="${PAL.steelDark}" stroke-width="1.2"/><circle cx="${jx}" cy="${jy}" r="5" fill="${idea[1]}" stroke="${jm.stroke}"/><circle cx="${jx-1.6}" cy="${jy-1.8}" r="1.6" fill="#fff" opacity=".8"/>`;
    if(i<nb){const[ex,ey]=ends[i],mx=jx+(ex-jx)*p,my=jy+(ey-jy)*p;o+=`<path d="M${jx},${jy} C${jx+30},${jy} ${mx-30},${my} ${mx},${my}" fill="none" stroke="${idea[1]}" stroke-width="6" stroke-linecap="round"/><path d="M${jx},${jy} C${jx+30},${jy} ${mx-30},${my} ${mx},${my}" fill="none" stroke="${INK}" stroke-width="1" stroke-opacity=".35"/>`}
    else o+=`<path d="M${jx},${jy} q24,10 22,48" fill="none" stroke="${idea[1]}" stroke-width="6" stroke-linecap="round" stroke-dasharray="2 10"/>`+`<circle cx="${jx+22}" cy="${jy+66}" r="${z.tiny*0.75}" fill="#A5552F"/>`+T(jx+22,jy+66+z.tiny*0.36,"!",z.tiny,{a:"middle",mono:true,wt:600,fill:WHITE})});
  if(!th.ideas.length)ends.forEach(([ex,ey])=>{o+=`<path d="M${ex},${ey} q-20,8 -26,30" fill="none" stroke="#BFB0BA" stroke-width="5" stroke-linecap="round"/>`+T(ex-28,ey+50,"?",z.h2,{a:"middle",wt:600,fill:"#A5552F"})});
  // bodies → conclusion
  const cx=616;o+=card(cx,16,168,388,"CONCLUSION",TEEL.L);
  const cf=fitFlow([{t:th.ideas.length?"Restate the thesis in new words: an urgent problem, an easy and fair fix. End with a bigger idea: young people can change their town by speaking up.":"Restate… what? With no clear argument, there's nothing to sum up."}],{x:cx+12,y:16+hh,w:144,size:z.small*0.9,lhf:1.22},388-hh-12,z.tiny*0.85);o+=cf.o;
  ends.forEach(([ex,ey,idea])=>{const sx=bx+bw;o+=`<path d="M${sx},${ey} C${sx+30},${ey} ${cx-30},210 ${cx},210" fill="none" stroke="${idea?idea[1]:"#D9CED5"}" stroke-width="${idea?4:2}" stroke-dasharray="${idea?"":"4 5"}" opacity="${idea?p:1}"/>`});
  return o}
// ---- test: the unseen story
function testScene(){const z=Z(),sv=s.solved,hl={};if(sv.c0)hl[7]=TECH[2];if(sv.c1)hl[7]=TECH[1];if(sv.c2)hl[4]=TECH[0];if(sv.c5)hl[8]=TECH[3];
  let o=F.floor(800,420);o+=paper(STORY,z,10,k=>{const{i}=parseK(k);return hl[i]?{bg:hl[i],wt:600}:{}});
  const n=Object.values(sv).filter(Boolean).length,lab=`${n} OF 6 SOLVED`;o+=tag(32,396,lab,n===6?lite(PR.lime,.3):"#FFFFFF",z);
  return o}

// ---- close-ups
const row=(y,col,head,body,h0)=>{const f=flow([{t:body}],{x:20,y:y+22,w:380,size:12,lh:15,fill:INK});const h=h0||f.h+30;return{o:`<rect x="10" y="${y}" width="400" height="${h}" rx="8" fill="${col}"/><text x="20" y="${y+16}" style="font:500 10px ${MONO};fill:${INK};letter-spacing:.06em">${esc(head)}</text>`+f.o,h}};
function readClose(){let o=`<text class="t-lab" x="14" y="20">READ LIKE A DETECTIVE · PURPOSE, AUDIENCE, TECHNIQUES</text>`,y=30;
  if(s.lens==="t"){TECHN.forEach((n,i)=>{const f=flow([{t:n+": ",k:"b"},{t:TECHW[i]}],{x:44,y:y+3,w:362,size:11.5,lh:14,fill:INK,sty:k=>k?{wt:600}:{}});const h=Math.max(24,f.h+6);
    o+=`<rect x="10" y="${y}" width="400" height="${h}" rx="7" fill="${TECH[i]}" opacity=".7"/><text x="22" y="${y+h/2+4}" style="font:600 11px ${MONO};fill:${INK}">${i+1}</text>`+f.o;y+=h+4});return o}
  const r1=row(y,"#FFE9A8","PURPOSE · WHY WAS IT WRITTEN?","To persuade the local council to build a pump track. Clue: it asks for something, 'Please, give us that chance.'");o+=r1.o;y+=r1.h+6;
  const r2=row(y,"#CFE3F8","AUDIENCE · WHO IS IT FOR?","The council and adult readers of the local paper, especially parents and ratepayers. Clues: 'our town', the cost of a sports field, 'parents chatting on the bank'.");o+=r2.o;y+=r2.h+6;
  const r3=row(y,"#EDE3EA","FORM · WHAT KIND OF TEXT?","A letter to the editor: short, personal, polite, and signed by the writer.");o+=r3.o;return o}
function qClose(){const Q=QS[s.qt],ok=s.pick===Q.ans;let o=`<text class="t-lab" x="14" y="20">THREE KINDS OF QUESTION</text>`,y=30;
  const r1=row(y,"#EDE3EA","HOW TO ANSWER",(t=>t[0].toUpperCase()+t.slice(1))(Q.tip.replace(/^[A-Z ]+: /,"")));o+=r1.o;y+=r1.h+6;
  const r2=row(y,ok?"#C7EBDD":s.pick!=null?"#FFE0D0":"#F5F1F2",ok?"MODEL ANSWER":s.pick!=null?"NOT THAT SENTENCE":"YOUR MOVE",ok?Q.model:s.pick!=null?Q.hint:"Tap the sentence in the letter that holds the answer.");o+=r2.o;return o}
function teelClose(){let o=`<text class="t-lab" x="14" y="20">${teelDone()?"THE MODEL PARAGRAPH, COLOUR-CODED":"FOUR JOBS IN A TEEL PARAGRAPH"}</text>`;
  if(teelDone()){const segs=CORRECT.map((k,i)=>({t:BLOCKS[k]+(i<3?" ":""),k}));return o+fitFlow(segs,{x:16,y:30,w:390,size:12.5,lhf:1.42,fill:INK,sty:k=>({bg:TEEL[k],fill:INK})},224,10).o}
  let y=30;CORRECT.forEach((k,i)=>{const got=s.order[i];const r=row(y,TEEL[k],`${SLOTN[i]} · ${JOB[k][0]}`,got?(got===k?"✓ ":"✗ ")+BLOCKS[got]:JOB[k][1]);o+=r.o;y+=r.h+5});return o}
function sharpClose(){let o=`<text class="t-lab" x="14" y="20">SWAP VAGUE WORDS FOR PRECISE ONES</text>`;
  const weak=["shows","says","is good","makes it interesting","effective"],strong=[["suggests","hints at an idea"],["emphasises","makes it stand out"],["exaggerates","makes it bigger than life"],["contrasts","sets two things side by side"],["challenges","makes readers question"],["reveals","lets us see something hidden"]];
  o+=`<rect x="10" y="30" width="130" height="220" rx="8" fill="#FFE0D0"/><text x="20" y="48" style="font:500 10px ${MONO};fill:${INK}">VAGUE</text>`;
  weak.forEach((w,i)=>{const y=72+i*34,ww=tw(w,12.5);o+=`<text x="20" y="${y}" style="font:400 12.5px ${DISP};fill:${INK}">${esc(w)}</text><line x1="18" x2="${22+ww}" y1="${y-4}" y2="${y-4}" stroke="#A5552F" stroke-width="1.5"/>`});
  o+=`<rect x="148" y="30" width="262" height="220" rx="8" fill="#C7EBDD"/><text x="158" y="48" style="font:500 10px ${MONO};fill:${INK}">PRECISE · AND WHAT IT MEANS</text>`;
  strong.forEach(([w,m],i)=>{const y=72+i*30;o+=`<text x="158" y="${y}" style="font:600 12.5px ${DISP};fill:${INK}">${esc(w)}</text><text x="250" y="${y}" style="font:400 11.5px ${DISP};fill:${INK}">${esc(m)}</text>`});return o}
function planClose(){let o=`<text class="t-lab" x="14" y="20">A SHORT ESSAY, PART BY PART</text>`,y=30;
  [["#E3D7FA","INTRO","Name the text and writer, say what it's about, end with your thesis: a claim you can prove."],["#FFE2A8","BODY PARAGRAPHS · 2–3","One idea from the thesis each, written as TEEL. Start each with a topic sentence."],["#FAD0DC","CONCLUSION","Restate the thesis in new words and end with a bigger idea. No new quotes."]].forEach(([c,h,b])=>{const r=row(y,c,h,b);o+=r.o;y+=r.h+6});
  const n=Math.min(THESES[s.thesis].ideas.length,s.bodies),need=Math.max(THESES[s.thesis].ideas.length,s.bodies);
  o+=`<text x="14" y="${y+16}" style="font:500 12px ${DISP};fill:var(--ink)">${esc(THESES[s.thesis].ideas.length?(n===need?"Every paragraph plugs into the thesis.":"Your thesis promises three ideas. Add a third body paragraph."):"This thesis has no ideas to plug into. Try another.")}</text>`;return o}
function testClose(){let o=`<text class="t-lab" x="14" y="20">BEFORE YOU ANSWER, ASK…</text>`,y=30;
  [["#FFE9A8","RETRIEVE","Is the answer right there? Find it and keep it short."],["#CFE3F8","INFER","What's suggested but not said? Idea + because + quote."],["#F7D3DD","EXPLAIN THE EFFECT","Technique + quote + what it makes the reader think or feel."],["#E3D7FA","WRITE A PARAGRAPH","Topic sentence, evidence, explanation, link."]].forEach(([c,h,b])=>{const r=row(y,c,h,b);o+=r.o;y+=r.h+5});return o}

// ---- steps
const steps=[
 {k:"read",lab:"Read the text",cap:"An unfamiliar text, read three ways. Switch the lens to find the writer's <b>purpose</b>, the <b>audience</b>, and the <b>techniques</b> they use.",controls:["lens"],
  big:"<b>The big idea:</b> before you answer anything, work out <i>why</i> the text was written, <i>who</i> it's for, and <i>how</i> the writer tries to get what they want. Every answer you write hangs off those three.",
  exam:"This letter to the editor is written to persuade the local council to build a pump track. Its audience is the council and adult readers of the local paper, which is why the writer stays polite and reasonable: 'We are not asking for a stadium.'",
  trap:"Saying the audience is 'everyone'. Look for clues: who is the writer asking, and who has the power to say yes?",chips:["lens","purpose","form"]},
 {k:"questions",lab:"Three kinds of question",cap:"Comprehension questions come in three kinds. Choose one, then <b>tap the sentence</b> in the letter where the answer lives.",controls:["qt"],
  big:"<b>The big idea:</b> <i>retrieve</i> means find it, <i>infer</i> means work it out from clues, and <i>explain the effect</i> means say what the writing does to the reader. Each kind needs a different-shaped answer.",
  exam:"Kids ride in the car park behind the library.",
  trap:"Writing an inference with no evidence. An infer answer needs your idea, then 'because', then a quote that proves it.",chips:["qtype","status"]},
 {k:"teel",lab:"Build a TEEL paragraph",cap:"Six sentences, but only four belong in an analysis paragraph. Tap them in order: Topic, Evidence, Explain, Link. Tap a numbered one again to take it out.",controls:["reset","showme"],
  big:"<b>The big idea:</b> <b>T</b>opic sentence makes your point. <b>E</b>vidence is a short quote. <b>E</b>xplain how the quote proves the point. <b>L</b>ink back to the question. Personal opinions and retelling don't count as analysis.",
  exam:"The writer persuades the council by making the problem feel urgent and the solution feel easy. The letter asks, 'Is that really the best our town can offer?' This rhetorical question makes adult readers feel a little embarrassed that young people are stuck dodging cars in a car park. Once readers feel responsible for the problem, a simple, affordable pump track seems like the obvious answer.",
  trap:"Retelling the text instead of analysing it. 'The letter has four paragraphs' describes it; it doesn't explain how the writer persuades.",chips:["teel","placed"]},
 {k:"sharpen",lab:"Sharpen it",cap:"This paragraph has the right shape but vague words. Tap each highlighted phrase to swap it for something more precise, and fill the meter.",controls:["dreset"],
  big:"<b>The big idea:</b> markers reward precise words. Name the exact technique, use a verb that says <i>how</i> (emphasises, suggests, contrasts), and say exactly <i>who</i> feels <i>what</i>.",
  exam:"The writer uses a list of three ('little kids on balance bikes, teenagers learning tricks, parents chatting') to emphasise that a pump track is good for the whole community, not just teenagers. This makes parents picture their own children there and makes the council more likely to say yes.",
  trap:"Using 'shows' for everything. Choose a verb that says how the writing works: suggests, emphasises, exaggerates, contrasts, challenges.",chips:["spec","lvl"]},
 {k:"plan",lab:"Plan the essay",cap:"An essay is an intro with a thesis, two or three body paragraphs, and a conclusion. Pick a thesis and watch whether the body paragraphs can plug into it.",controls:["thesis","bodies"],
  big:"<b>The big idea:</b> the thesis is your answer to the essay question in one sentence. Each body paragraph proves one part of it. If a paragraph can't plug into the thesis, either the paragraph or the thesis needs to change.",
  exam:"In the letter 'Give Us Somewhere to Ride', a Year 10 rider writes to the local paper asking for a pump track. The writer persuades the council by making the problem feel urgent and the solution feel easy and fair.",
  trap:"A thesis that only announces the topic ('This essay is about…'). A thesis makes a claim your body paragraphs can prove.",chips:["thesis","plugged"]},
 {k:"test",lab:"Test yourself",cap:"A new unseen text. Read it twice, then answer each challenge and press Check.",controls:[],chips:["solved"],
  big:"<b>Exam tip:</b> in the exam, read the questions first, then the text. Underline the evidence as you go, and match the shape of your answer to the kind of question."}];

const sel=(id,opts,ph="Choose…")=>`<select id="${id}" class="wx-sel"><option value="">${ph}</option>${opts.map(o=>`<option value="${esc(o[0])}">${esc(o[1])}</option>`).join("")}</select>`;
const radios=(name,opts)=>`<span class="wx-opts">${opts.map(o=>`<label class="wx-opt"><input type="radio" name="${name}" value="${esc(o[0])}"><span>${esc(o[1])}</span></label>`).join("")}</span>`;
const val=id=>{const e=document.getElementById(id);return e?e.value:""};
const rval=n=>{const e=document.querySelector(`input[name="${n}"]:checked`);return e?e.value:""};
function solve(k,ok){if(ok)s.solved[k]=true;sfx(ok?"ding":"buzz");if(ok&&Object.values(s.solved).filter(Boolean).length===6)setTimeout(()=>sfx("win"),400);api&&api.redraw();return ok}
const challenges=[
 {q:`<b>Retrieve.</b> What time did the lights come back on? ${sel("ec0",[["714","7:14"],["ten","Ten o'clock"],["mid","Midnight"],["morn","The next morning"]])}`,
  check:()=>solve("c0",val("ec0")==="ten"),ok:"Yes: 'When the lights snapped back on at ten'. Retrieve answers can be short.",no:()=>val("ec0")?"Not quite. 7:14 is when the power went off. Look near the end.":"Choose an answer first."},
 {q:`<b>Infer.</b> How does the family feel when the lights come back on, and what's the best evidence? ${radios("ec1",[["a","Relieved: 'the lights snapped back on'"],["b","Disappointed: 'we all groaned'"],["c","Scared: 'long, wobbling shadows'"]])}`,
  check:()=>solve("c1",rval("ec1")==="b"),ok:"Yes. They groan because the cosy night is over, which the last line confirms: 'the best night in months'.",no:()=>rval("ec1")?"Not that one. Find the moment the lights come back on: what do they all do?":"Pick an option first."},
 {q:`<b>Explain the effect.</b> Which is the best explanation of <i>“the wind shoved at the windows as if it wanted to come in”</i>? ${radios("ec2",[["a","The writer uses personification to make the story more interesting."],["b","Personification is when you give human qualities to something that isn't human."],["c","The writer uses personification ('shoved at the windows') to make the storm seem like an aggressive intruder, which makes the reader feel how safe and cosy the family is inside."]])}`,
  check:()=>solve("c2",rval("ec2")==="c"),ok:"Yes: feature, short quote, effect, and the reader's response.",no:()=>rval("ec2")?"Not that one. One is vague and one only defines the feature.":"Pick an option first."},
 {q:`<b>Topic sentence.</b> For an essay on how the writer shows a power cut bringing a family together, which topic sentence is strongest? ${radios("ec3",[["a","In this paragraph I will talk about the power cut."],["b","The power went out at 7:14 and they ate pizza."],["c","By taking away every screen, the writer leaves the family with nothing to do but enjoy each other's company."]])}`,
  check:()=>solve("c3",rval("ec3")==="c"),ok:"Yes: it makes a point that answers the question, and the rest of the paragraph can prove it.",no:()=>rval("ec3")?"Not that one. One announces, one retells. Which makes a point you could prove?":"Pick an option first."},
 {q:`<b>Precise verb.</b> “The family's groan ___ that they did not want the night to end.” ${sel("ec4",[["shows","shows"],["says","says"],["suggests","suggests"],["makes","makes"]])}`,
  check:()=>solve("c4",val("ec4")==="suggests"),ok:"Yes: 'suggests' fits an inference. Nobody says it out loud; the groan hints at it.",no:()=>val("ec4")==="shows"?"'Shows' isn't wrong, but it's vague. Which verb fits something hinted at, not stated?":val("ec4")?"That verb doesn't fit the sentence. Try again.":"Choose a verb first."},
 {q:`<b>Purpose.</b> What is the main purpose of this text? ${sel("ec5",[["per","To persuade"],["inf","To inform"],["ent","To entertain and share an experience"],["ins","To instruct"]])}`,
  check:()=>solve("c5",val("ec5")==="ent"),ok:"Yes: it's a story that entertains and reflects on an experience. Clue: 'It had been the best night in months.'",no:()=>val("ec5")?"Not quite. Is the writer asking for something, teaching facts, or telling a story?":"Choose an answer first."}];

// ---- kupu Māori: te reo terms for this machine, each checked in Te Aka Māori Dictionary (ta = word id). Sources and notes: te-reo-notes.md
const KUPU=[
 {mi:"tuhinga",en:"text, writing",ta:8648},
 {mi:"kaituhi",en:"writer, author",ta:2031},
 {mi:"kaupapa",en:"topic, theme, purpose",ta:2439},
 {mi:"kōwae",en:"paragraph",ta:3169},
 {mi:"rerenga kōrero",en:"sentence",ta:6727},
 {mi:"taunakitanga",en:"evidence",ta:14911},
 {mi:"whakamārama",en:"explanation",ta:9594},
 {mi:"tohutoro",en:"reference (where a quote comes from)",ta:12623}];
Object.entries({"read": ["tuhinga", "kaituhi", "kaupapa"], "questions": ["tuhinga"], "teel": ["kōwae", "rerenga kōrero", "taunakitanga", "whakamārama"], "sharpen": ["taunakitanga", "tohutoro"], "plan": ["kaupapa", "kōwae"]}).forEach(([k,a])=>{const st=steps.find(x=>x.k===k);if(st)st.kupu=a});
const api=StudyKit.mount({kupu:KUPU,
  eyebrow:"English · Reading and writing", title:"The paragraph machine", crumb:"Year 9 and 10 English: unfamiliar texts, paragraphs and essays", homeHash:"y9",
  fig:"FIG. 16 · A READING DESK AND A PARAGRAPH BUILDER", railTitle:"From reading to writing",
  badge:{label:"English · Year 9",examText:"Tue 3 Nov",exam:"2026-11-03T09:00:00+13:00"},
  mainBox:"0 0 800 420", mainPhoneBig:true, mainLabel:"A letter to the editor under three reading lenses, sentence blocks that build a TEEL paragraph, and an essay plan wired together with cables", closeBox:"0 0 420 260",
  state:s, steps, onStep:(x,st)=>{if(st.k==="plan"){s.plugT=performance.now();kick(700)}},
  controls:[
    {type:"select",id:"lens",label:"Lens",options:[["p","Purpose"],["a","Audience"],["t","Techniques"]],get:()=>s.lens,set:(x,v)=>{s.lens=v;sfx("whoosh")}},
    {type:"select",id:"qt",label:"Question",options:[["retrieve","Retrieve"],["infer","Infer"],["effect","Explain the effect"]],get:()=>s.qt,set:(x,v)=>{s.qt=v;s.pick=null;sfx("tick")}},
    {type:"button",id:"reset",label:"↺ Start again",onClick:()=>{s.order=[];sfx("whoosh")}},
    {type:"button",id:"showme",label:"Show me",onClick:()=>{s.order=[...CORRECT];s.doneT=performance.now();sfx("win");kick(900)}},
    {type:"button",id:"dreset",label:"↺ Back to vague",onClick:()=>{s.dials=[0,0,0,0,0];sfx("whoosh")}},
    {type:"select",id:"thesis",label:"Thesis",options:THESES.map((t,i)=>[String(i),`${t.kind}: ${t.t.slice(0,28)}…`]),get:()=>String(s.thesis),set:(x,v)=>{s.thesis=+v;s.plugT=performance.now();sfx(+v===2?"pop":"buzz");kick(700)}},
    {type:"select",id:"bodies",label:"Body paragraphs",options:[["2","2"],["3","3"]],get:()=>String(s.bodies),set:(x,v)=>{s.bodies=+v;s.plugT=performance.now();sfx("pop");kick(700)}}],
  drawMain:(x,st)=>{const k=st.k;if(k==="sharpen"){const e=document.getElementById("k-exam"),t=dialScore()===10?steps[3].exam:"Sharpen all five phrases first. A model version appears here when the meter is full.";if(e&&e.textContent!==t)e.textContent=t}if(k==="teel"){const e=document.getElementById("k-exam"),t=teelDone()?steps[2].exam:"Put the paragraph in order first. The model answer appears here when it's built.";if(e&&e.textContent!==t)e.textContent=t}if(k==="questions"){const e=document.getElementById("k-exam");if(e&&e.textContent!==QS[s.qt].model)e.textContent=QS[s.qt].model;
      const c=document.getElementById("k-cap"),h=`<b>${{retrieve:"Retrieve",infer:"Infer",effect:"Explain the effect"}[s.qt]}:</b> ${esc(QS[s.qt].q)} <span style="color:var(--rose)">Tap the sentence where the answer lives.</span>`;if(c&&c.innerHTML!==h)c.innerHTML=h}
    return k==="read"?readScene():k==="questions"?qScene():k==="teel"?teelScene():k==="sharpen"?sharpScene():k==="plan"?planScene():testScene()},
  drawClose:(x,st)=>{const k=st.k;return k==="read"?readClose():k==="questions"?qClose():k==="teel"?teelClose():k==="sharpen"?sharpClose():k==="plan"?planClose():testClose()},
  chips:()=>{const th=THESES[s.thesis],plug=Math.min(th.ideas.length,s.bodies),n=dialScore();return{
    lens:["LENS",{p:"purpose",a:"audience",t:"techniques"}[s.lens],true],purpose:["PURPOSE","to persuade"],form:["FORM","letter to the editor"],
    qtype:["QUESTION",{retrieve:"retrieve",infer:"infer",effect:"explain the effect"}[s.qt],true],status:["EVIDENCE",s.pick==null?"not found yet":s.pick===QS[s.qt].ans?"found":"keep looking"],
    teel:["STRENGTH",`${teelScore()} / 4`,true],placed:["PLACED",`${s.order.length} of 6`],
    spec:["SPECIFIC",`${n} / 10`,true],lvl:["LEVEL",sharpLevel(n)],
    thesis:["THESIS",th.kind.toLowerCase(),true],plugged:["PLUGGED IN",`${plug} of ${Math.max(th.ideas.length,s.bodies)}`],
    solved:["SOLVED",`${Object.values(s.solved).filter(Boolean).length} of 6`,true]}},
  challenges,
  papers:[{label:"NZQA: English past exams",url:"https://www2.nzqa.govt.nz/ncea/subjects/past-exams-and-exemplars/"}],
  truth:"The letter and the story are original, written for this machine, and kept short and simple so the skills stand out. TEEL is one common way to structure an analysis paragraph; your teacher may call it PEEL or SEXY and want slightly different parts. Check your school's exam guidance for exactly what your teacher expects.",
  footer:"Covers Year 9–10 English: reading unfamiliar texts for purpose, audience and techniques; retrieve, infer and explain-the-effect questions; TEEL analysis paragraphs; precise vocabulary; and planning a short essay with a thesis. Leads into NCEA Level 1 English."
});
// ---- taps on the canvas
const svg=document.getElementById("k-main");
function act(a){const[k,v]=a.split(":");
  if(k==="sent"){if(api.step.k!=="questions")return;s.pick=+v;sfx(+v===QS[s.qt].ans?"ding":"buzz");api.redraw()}
  else if(k==="blk"){if(teelDone())return;const i=s.order.indexOf(v);if(i>=0){s.order.splice(i,1);sfx("tick")}else if(s.order.length<6){s.order.push(v);sfx("pop")}
    if(teelDone()){s.doneT=performance.now();setTimeout(()=>sfx("win"),150);kick(900)}api.redraw()}
  else if(k==="dial"){const i=+v;s.dials[i]=(s.dials[i]+1)%3;sfx(s.dials[i]===2?"ding":"tick");if(dialScore()===10)setTimeout(()=>sfx("win"),200);api.redraw()}}
svg.addEventListener("click",e=>{const g=e.target.closest&&e.target.closest("[data-a]");if(g)act(g.getAttribute("data-a"))});
svg.addEventListener("keydown",e=>{if(e.key!=="Enter"&&e.key!==" ")return;const g=e.target.closest&&e.target.closest("[data-a]");if(g){e.preventDefault();act(g.getAttribute("data-a"))}});
const st=document.createElement("style");st.textContent=`.wx-sel{margin:4px 0 0 4px;max-width:100%}.wx-opts{display:grid;gap:6px;margin-top:8px}.wx-opt{display:flex;gap:8px;align-items:flex-start;font-size:13.5px;line-height:1.4;color:var(--body);border:1px solid var(--line);border-radius:10px;padding:7px 10px;cursor:pointer;background:var(--paper)}
.wx-opt:has(input:checked){border-color:var(--ink);background:var(--chalk)}.wx-opt input{accent-color:var(--sun);margin-top:3px;flex:none}.challenge .q i{font-style:normal;color:var(--ink);font-weight:500}
#k-main [data-a]:focus{outline:none}#k-main [data-a]:focus-visible>rect:first-of-type{stroke:var(--sun);stroke-width:4}`;document.head.appendChild(st);
try{mq.addEventListener("change",()=>api.redraw())}catch(e){}
try{document.fonts&&document.fonts.ready.then(()=>api.redraw())}catch(e){}
})();
