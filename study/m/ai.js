(()=>{
// Train-your-own-AI machine: draw two kinds of thing, a k-nearest-neighbours model learns them, then you find its bias.
// Everything runs on this page. Nothing is sent anywhere.
const fmt=(x,d=0)=>Number(x).toLocaleString("en-NZ",{maximumFractionDigits:d,minimumFractionDigits:d});
const PAD={x:40,y:40,s:340},G=16;
const s={names:["Fish","Wheel"],ex:[[],[]],strokes:[],cur:null,pred:null,center:false,streak:0,tested:0,correct:0,acc:null,biasLoaded:false,last:null};
// ---- turn strokes into what the AI "sees": a 16 × 16 grid of ink
const cv=document.createElement("canvas");cv.width=cv.height=64;const cx=cv.getContext("2d",{willReadFrequently:true});
function raster(strokes,center){cx.fillStyle="#000";cx.fillRect(0,0,64,64);cx.strokeStyle="#fff";cx.lineCap="round";cx.lineJoin="round";cx.lineWidth=5;
  let minx=1e9,miny=1e9,maxx=-1e9,maxy=-1e9;strokes.forEach(st=>st.forEach(([x,y])=>{minx=Math.min(minx,x);miny=Math.min(miny,y);maxx=Math.max(maxx,x);maxy=Math.max(maxy,y)}));
  let tx=p=>(p[0]-PAD.x)/PAD.s*64,ty=p=>(p[1]-PAD.y)/PAD.s*64;
  if(center&&maxx>minx){const sz=Math.max(maxx-minx,maxy-miny)||1,k=52/sz,ox=(minx+maxx)/2,oy=(miny+maxy)/2;tx=p=>32+(p[0]-ox)*k;ty=p=>32+(p[1]-oy)*k}
  strokes.forEach(st=>{cx.beginPath();st.forEach((p,i)=>i?cx.lineTo(tx(p),ty(p)):cx.moveTo(tx(p),ty(p)));if(st.length===1)cx.lineTo(tx(st[0])+0.1,ty(st[0]));cx.stroke()});
  const d=cx.getImageData(0,0,64,64).data,v=new Float32Array(G*G);
  for(let y=0;y<64;y++)for(let x=0;x<64;x++){v[(y>>2)*G+(x>>2)]+=d[(y*64+x)*4]/255/16}return v}
function dist(a,b){let s2=0;for(let i=0;i<a.length;i++){const d=a[i]-b[i];s2+=d*d}return Math.sqrt(s2)}
function predict(v){const all=[];s.ex.forEach((list,c)=>list.forEach((e,i)=>all.push({c,i,d:dist(v,s.center?e.vc:e.v)})));if(all.length<2)return null;
  all.sort((a,b)=>a.d-b.d);const k=all.slice(0,Math.min(3,all.length));const votes=[0,0];k.forEach(n=>votes[n.c]+=1/(n.d+0.3));const tot=votes[0]+votes[1];
  return {c:votes[1]>votes[0]?1:0,conf:Math.max(votes[0],votes[1])/tot,near:k}}
// ---- synthetic drawings for the built-in test set and the lopsided dataset
function synth(kind,o={}){const R=Math.random,sc=o.scale??(0.25+R()*0.55),cxp=o.x??(PAD.x+PAD.s*(0.25+R()*0.5)),cyp=o.y??(PAD.y+PAD.s*(0.25+R()*0.5)),r=PAD.s*sc/2,j=()=>(R()-.5)*r*0.12;const st=[];
  if(kind===0){const body=[];for(let a=0;a<=Math.PI*2+0.01;a+=0.25)body.push([cxp+Math.cos(a)*r*0.75+j(),cyp+Math.sin(a)*r*0.42+j()]);st.push(body);
    st.push([[cxp+r*0.7,cyp],[cxp+r*1.1,cyp-r*0.4],[cxp+r*1.1,cyp+r*0.4],[cxp+r*0.7,cyp]]);st.push([[cxp-r*0.4,cyp-r*0.08],[cxp-r*0.38,cyp-r*0.06]])}
  else{const rim=[];for(let a=0;a<=Math.PI*2+0.01;a+=0.25)rim.push([cxp+Math.cos(a)*r+j(),cyp+Math.sin(a)*r+j()]);st.push(rim);for(let k=0;k<4;k++){const a=k*Math.PI/4+R()*0.3;st.push([[cxp-Math.cos(a)*r*0.9,cyp-Math.sin(a)*r*0.9],[cxp+Math.cos(a)*r*0.9,cyp+Math.sin(a)*r*0.9]])}}
  return st}
function addExample(c,strokes){s.ex[c].push({strokes,v:raster(strokes,false),vc:raster(strokes,true)})}
let TEST=null;function testSet(){if(!TEST){TEST=[];for(let i=0;i<40;i++){const c=i%2;TEST.push({c,strokes:synth(c)})}TEST.forEach(t=>{t.v=raster(t.strokes,false);t.vc=raster(t.strokes,true)})}return TEST}
function accuracy(){const T=testSet();let ok=0;T.forEach(t=>{const p=predict(s.center?t.vc:t.v);if(p&&p.c===t.c)ok++});return ok/T.length}
// ---- drawing (the bench figure look: StudyKit.fig; digital technologies use the blush case tint)
const F=StudyKit.fig,PAL=F.palette,TINT=PAL.case.blush,CLS=[PAL.product.strawberry,PAL.product.blueberry];
const path=st=>st.length?`M${st.map(p=>p.join(",")).join(" L")}`:"";
function thumb(e,x,y,w,c){const k=w/PAD.s;return `<path d="M${x},${y+w} h${w} l${w*0.3},${w*0.16} h${-w}z" fill="${PAL.shadow}" opacity=".1"/><g transform="translate(${x},${y}) scale(${k}) translate(${-PAD.x},${-PAD.y})"><rect x="${PAD.x}" y="${PAD.y}" width="${PAD.s}" height="${PAD.s}" rx="${24}" fill="#fff" stroke="${c?F.mat("painted",c).stroke:"#DCD6EA"}" stroke-width="${c?10:4}"/>${e.strokes.map(st=>`<path d="${path(st)}" fill="none" stroke="var(--ink)" stroke-width="${10}" stroke-linecap="round" stroke-linejoin="round"/>`).join("")}</g>`}
function drawMain(st){let o=F.floor(800,420);
  // the drawing tablet: a blush plastic case with a white screen (the screen is exactly the drawing pad)
  o+=F.box(PAD.x-12,PAD.y-12,PAD.s+24,PAD.s+24,{colour:TINT,kind:"plastic",d:10,r:24,shadowLen:60});
  o+=`<rect x="${PAD.x}" y="${PAD.y}" width="${PAD.s}" height="${PAD.s}" rx="18" fill="#fff" stroke="${F.deep(TINT)}" stroke-width="2"/><path d="M${PAD.x+22},${PAD.y+10} h120" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".9"/>`;
  o+=`<circle cx="${PAD.x+PAD.s/2}" cy="${PAD.y+PAD.s+7}" r="3.2" fill="${PAL.product.lime}" stroke="#6E9A3E" stroke-width=".8"/>`;
  if(!s.strokes.length&&!s.cur)o+=`<text class="t-lab" x="${PAD.x+PAD.s/2}" y="${PAD.y+PAD.s/2}" text-anchor="middle">DRAW HERE${st.k==="test"||st.k==="guess"?": THE AI WILL GUESS":""}</text>`;
  [...s.strokes,...(s.cur?[s.cur]:[])].forEach(stk=>o+=`<path d="${path(stk)}" fill="none" stroke="var(--ink)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`);
  // right side: the training examples, by class
  o+=F.acrylic(404,34,386,188,{tint:TINT,d:8,r:12,opacity:.24,shadowLen:28,balls:false});
  [0,1].forEach(c=>{const x0=410+c*195;o+=`<rect x="${x0}" y="64" width="185" height="3" rx="1.5" fill="${CLS[c]}" opacity=".9"/>`;o+=`<text x="${x0}" y="58" style="font:600 15px var(--display);fill:var(--ink)">${s.names[c]}</text><text class="t-lab" x="${x0+185}" y="58" text-anchor="end">${s.ex[c].length} EXAMPLES</text>`;
    s.ex[c].slice(-12).forEach((e,i)=>o+=thumb(e,x0+(i%4)*47,74+Math.floor(i/4)*47,42,CLS[c]));});
  if(s.pred){const p=s.pred,bx=410,by=232;o+=F.acrylic(bx,by,375,150,{tint:TINT,d:10,r:14,opacity:.3,shadowLen:24})+`<rect x="${bx+12}" y="${by+36}" width="6" height="56" rx="3" fill="${CLS[p.c]}"/>`;o+=`<text class="t-lab" x="${bx+16}" y="${by+26}">THE AI'S GUESS</text>
    <text x="${bx+26}" y="${by+62}" style="font:700 30px var(--display);fill:var(--ink)">${s.names[p.c]}</text><text class="t-ink" x="${bx+26}" y="${by+86}">${fmt(p.conf*100)}% sure</text>
    <text class="t-lab" x="${bx+190}" y="${by+26}">LOOKS MOST LIKE</text>`;p.near.forEach((n,i)=>{const e=s.ex[n.c][n.i];o+=thumb(e,bx+190+i*60,by+38,52,CLS[n.c])+`<text class="t-lab" x="${bx+216+i*60}" y="${by+108}" text-anchor="middle">${s.names[n.c].toUpperCase()}</text>`});
    if(s.last!=null)o+=`<text class="t-ink" x="${bx+16}" y="${by+132}">${s.last?"✓ Right!":"✗ Wrong: show it more examples like this"}</text>`}
  else if(st.k==="draw")o+=`<text class="t-ink" x="410" y="300">Draw one, then press "Add as ${s.names[0]}" or "Add as ${s.names[1]}".</text><text class="t-ink" x="410" y="320">Five of each is a good start.</text>`;
  return o}
function drawClose(st){const v=raster(s.strokes,s.center);let o=F.floor(420,260)+`<rect x="10" y="28" width="204" height="204" rx="8" fill="#fff" stroke="#DCD6EA"/><text class="t-lab" x="16" y="22">WHAT THE AI SEES: 16 × 16 = 256 NUMBERS</text>`;
  for(let y=0;y<G;y++)for(let x=0;x<G;x++){const a=Math.min(1,v[y*G+x]*2.2);o+=`<rect x="${16+x*12}" y="${32+y*12}" width="11" height="11" fill="var(--ink)" opacity="${0.06+a*0.94}"/>`}
  o+=`<text class="t-ink" x="226" y="50">Your drawing becomes</text><text class="t-ink" x="226" y="68">a grid of numbers:</text><text class="t-ink" x="226" y="86">0 = blank, 1 = ink.</text>`;
  o+=`<text class="t-ink" x="226" y="120">To guess, it finds the</text><text class="t-ink" x="226" y="138">3 training drawings with</text><text class="t-ink" x="226" y="156">the closest numbers.</text>`;
  o+=`<text class="t-lab" x="226" y="190">${s.center?"CENTRING ON: SIZE AND":"CENTRING OFF: POSITION"}</text><text class="t-lab" x="226" y="206">${s.center?"POSITION NO LONGER MATTER":"AND SIZE CHANGE THE NUMBERS"}</text>`;
  if(s.acc!=null)o+=`<text class="t-ink" x="226" y="240" style="font-weight:600">Test set: ${fmt(s.acc*100)}% right</text>`;
  return o}
const steps=[
 {k:"draw",lab:"Teach it",cap:"You're the teacher. Draw a fish, press Add as Fish. Draw a wheel, press Add as Wheel. Give it at least five of each, all a bit different.",controls:["addA","addB","clear","nameA","nameB"],
  big:"<b>The big idea:</b> an AI like this doesn't follow rules you write. It learns from examples, so the examples you give it decide what it can do.",
  exam:"Machine learning is when a computer learns patterns from training data instead of being given step-by-step rules. The quality and variety of the training data decides how well the model works on new examples.",
  trap:"Thinking the computer 'understands' what a fish is. It only compares numbers with the examples it was given.",chips:["n0","n1"]},
 {k:"guess",lab:"Let it guess",cap:"Now draw something new and press Guess. The AI compares your drawing with every example and votes using the three closest.",controls:["guess","right","wrong","clear"],
  big:"<b>The big idea:</b> this AI is a nearest-neighbour classifier: it says 'this looks most like those', using distance between grids of numbers.",
  exam:"To classify a new drawing, the model converts it into numbers and finds the training examples with the smallest distance. The most common label among those nearest neighbours becomes the prediction.",
  trap:"Treating confidence as certainty. 90% sure can still be wrong.",chips:["streak","n0","n1"]},
 {k:"score",lab:"Test it fairly",cap:"Don't just test with your own drawings. Press Run the test set: 40 drawings the AI has never seen, half fish and half wheels.",controls:["score","center"],
  big:"<b>The big idea:</b> we judge an AI on test data it wasn't trained on. Doing well on the training data proves very little.",
  exam:"A model is evaluated on a separate test set that was not used in training, so its accuracy reflects how well it generalises to new data rather than how well it memorised the training data.",
  trap:"Testing on the same examples you trained with. That only shows it memorised them.",chips:["acc","n0","n1"]},
 {k:"bias",lab:"Find the bias",cap:"Load a lopsided dataset: every training drawing is big and in the top-left corner. Then draw a small one in the bottom-right and ask for a guess. Watch it fail, then fix it.",controls:["bias","guess","center","clear","score"],
  big:"<b>The big idea:</b> if the training data only covers some situations, the AI fails in the rest. That's bias, and the fix is better data or better features, not a cleverer excuse.",
  exam:"Bias in an AI system can come from unrepresentative training data. If every training example is large and in one corner, the model has not learned what a fish looks like elsewhere. Adding varied examples, or centring and scaling each drawing first, reduces this bias.",
  trap:"Blaming the user for drawing it 'wrong'. The model should be trained on the variety of inputs real people will give it.",chips:["acc","n0","n1"]},
 {k:"test",lab:"Test yourself",cap:"Three challenges. Use what you've learned.",controls:["addA","addB","guess","right","wrong","score","center","clear","bias"],chips:["acc","streak"],
  big:"<b>Real AIs:</b> image and language models learn the same way, from examples, just with billions of numbers instead of 256. Their training data decides what they're good at and where they're biased."}];
// ---- kupu Māori: te reo terms for this machine, each checked in Te Aka Māori Dictionary (ta = word id). Sources and notes: te-reo-notes.md
const KUPU=[
 {mi:"rorohiko",en:"computer",ta:6926},
 {mi:"raraunga",en:"data",ta:6555},
 {mi:"hātepe",en:"algorithm",ta:917},
 {mi:"whakangungu",en:"to train, training",ta:9686},
 {mi:"tauira",en:"example, pattern, model",ta:7706},
 {mi:"tīpako",en:"sample",ta:8150},
 {mi:"tīpako haukume",en:"biased sample",ta:46051},
 {mi:"tīpako matapōkere",en:"random sample",ta:46052}];
Object.entries({"draw": ["whakangungu", "tauira", "raraunga"], "guess": ["hātepe", "rorohiko"], "score": ["tīpako", "raraunga"], "bias": ["tīpako haukume", "tīpako matapōkere"]}).forEach(([k,a])=>{const st=steps.find(x=>x.k===k);if(st)st.kupu=a});
let api;
api=StudyKit.mount({kupu:KUPU,
  eyebrow:"Digital technologies · Artificial intelligence", title:"Train your own AI", crumb:"Years 9–10 Technology and Digital Technologies: data, algorithms and AI ethics", homeHash:"y9",
  fig:"FIG. 12 · A DRAWING CLASSIFIER YOU TEACH", railTitle:"Teach, test, find the bias",
  badge:{label:"AI and digital tech · Years 9–11"},
  mainBox:"0 0 800 420", mainPhoneBig:true, mainLabel:"A drawing pad on the left, your training examples on the right and the AI's guess", closeBox:"0 0 420 260",
  state:s, steps,
  controls:[
    {type:"button",id:"addA",label:"Add as Fish",onClick:()=>{if(s.strokes.length){addExample(0,s.strokes);s.strokes=[];s.pred=null}}},
    {type:"button",id:"addB",label:"Add as Wheel",onClick:()=>{if(s.strokes.length){addExample(1,s.strokes);s.strokes=[];s.pred=null}}},
    {type:"button",id:"guess",label:"Guess",onClick:()=>{if(s.strokes.length){s.pred=predict(raster(s.strokes,s.center));s.last=null}}},
    {type:"button",id:"right",label:"✓ It was right",onClick:()=>{if(s.pred){s.streak++;s.tested++;s.correct++;s.last=true;addExample(s.pred.c,s.strokes);s.strokes=[]}}},
    {type:"button",id:"wrong",label:"✗ It was wrong",onClick:()=>{if(s.pred){s.streak=0;s.tested++;s.last=false;addExample(1-s.pred.c,s.strokes);s.strokes=[]}}},
    {type:"button",id:"clear",label:"Clear drawing",onClick:()=>{s.strokes=[];s.pred=null;s.last=null}},
    {type:"button",id:"score",label:"Run the test set",onClick:()=>{s.acc=s.ex[0].length&&s.ex[1].length?accuracy():null}},
    {type:"button",id:"bias",label:"Load a lopsided dataset",onClick:()=>{s.ex=[[],[]];for(let i=0;i<8;i++){addExample(0,synth(0,{scale:0.7+Math.random()*0.15,x:PAD.x+PAD.s*0.3,y:PAD.y+PAD.s*0.3}));addExample(1,synth(1,{scale:0.7+Math.random()*0.15,x:PAD.x+PAD.s*0.3,y:PAD.y+PAD.s*0.3}))}s.biasLoaded=true;s.center=false;s.acc=accuracy();s.pred=null}},
    {type:"toggle",id:"center",label:"Centre and scale each drawing",get:()=>s.center,set:(x,v)=>{s.center=v;if(s.acc!=null)s.acc=accuracy();if(s.pred&&s.strokes.length)s.pred=predict(raster(s.strokes,s.center))}},
    {type:"select",id:"nameA",label:"First thing",options:[["Fish","Fish"],["Star","Star"],["Heart","Heart"],["Smiley","Smiley"],["Tree","Tree"]],get:()=>s.names[0],set:(x,v)=>{s.names[0]=v;relabel()}},
    {type:"select",id:"nameB",label:"Second thing",options:[["Wheel","Wheel"],["Moon","Moon"],["House","House"],["Note","Music note"],["Ball","Ball"]],get:()=>s.names[1],set:(x,v)=>{s.names[1]=v;relabel()}}],
  drawMain:(x,st)=>drawMain(st), drawClose:(x,st)=>drawClose(st),
  chips:()=>({n0:[s.names[0].toUpperCase(),s.ex[0].length+" examples"],n1:[s.names[1].toUpperCase(),s.ex[1].length+" examples"],streak:["STREAK",s.streak+" right in a row",s.streak>=3],acc:["TEST SET",s.acc==null?"not run":fmt(s.acc*100)+"%",true]}),
  challenges:[
    {q:"Get three right guesses in a row on your own new drawings.",check:()=>s.streak>=3,ok:"Yes. More varied examples make it more reliable.",no:()=>`Your streak is ${s.streak}. Add more varied examples, then keep testing.`},
    {q:"Teach it well enough to score at least 80% on the test set (with centring off).",check:()=>!s.center&&s.acc!=null&&s.acc>=0.8&&!s.biasLoaded,ok:()=>`Yes: ${fmt(s.acc*100)}%. Your examples covered enough variety.`,no:()=>s.biasLoaded?"Clear the lopsided dataset first: it's loaded. Reload the page or teach it from scratch.":s.acc==null?"Run the test set first.":`Not yet: ${fmt(s.acc*100)}%. Add examples in different sizes and places.`},
    {q:"Load the lopsided dataset, then get it above 75% on the test set without adding any examples.",check:()=>s.biasLoaded&&s.ex[0].length===8&&s.ex[1].length===8&&s.acc>=0.75,ok:()=>`Yes: ${fmt(s.acc*100)}%. Centring and scaling removed the position and size bias.`,no:()=>!s.biasLoaded?"Press Load a lopsided dataset first.":`Not yet: ${s.acc==null?"run the test set":fmt(s.acc*100)+"%"}. What setting stops position and size mattering?`}],
  papers:[{label:"NZQA: Digital Technologies",url:"https://www2.nzqa.govt.nz/ncea/subjects/subject/digital-technologies/"}],
  truth:"A real machine-learning method (k-nearest neighbours, k = 3) running entirely on this page. Your drawings stay on your device and are gone when you leave. The built-in test set is generated drawings, not anyone's data.",
  footer:"Covers Years 9–10 Technology (computational thinking, data and algorithms, the ethics and bias of digital systems). Leads into NCEA Digital Technologies and the new Applied Intelligent Systems subject planned from 2029."
});
function relabel(){document.querySelectorAll("#k-ctl .btn").forEach(b=>{if(b.textContent.startsWith("Add as"))b.textContent="Add as "+(b===document.querySelectorAll("#k-ctl .btn")[0]?s.names[0]:s.names[1])})}
// pointer drawing on the pad
const svg=document.getElementById("k-main");
function pt(e){const r=svg.getBoundingClientRect(),vb=svg.viewBox.baseVal;return [(e.clientX-r.left)/r.width*vb.width,(e.clientY-r.top)/r.height*vb.height]}
const inPad=([x,y])=>x>=PAD.x&&x<=PAD.x+PAD.s&&y>=PAD.y&&y<=PAD.y+PAD.s;
svg.style.touchAction="none";
svg.addEventListener("pointerdown",e=>{const p=pt(e);if(!inPad(p))return;s.cur=[p];svg.setPointerCapture(e.pointerId);api.redraw()});
svg.addEventListener("pointermove",e=>{if(!s.cur)return;const p=pt(e);if(!inPad(p))return;const l=s.cur[s.cur.length-1];if(Math.hypot(p[0]-l[0],p[1]-l[1])>3){s.cur.push(p);api.redraw()}});
const end=()=>{if(s.cur){s.strokes.push(s.cur);s.cur=null;api.redraw()}};svg.addEventListener("pointerup",end);svg.addEventListener("pointercancel",end);
// start with a couple of examples of each so the guess step works straight away
for(let i=0;i<3;i++){addExample(0,synth(0));addExample(1,synth(1))}api.redraw();
})();
