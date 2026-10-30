(()=>{
// The claw machine: probability, relative frequency, the long run, expected value and two-step trees.
const fmt=(x,d=0)=>{let v=Number(x);if(Math.abs(v)<0.5*Math.pow(10,-d))v=0;return v.toLocaleString("en-NZ",{maximumFractionDigits:d,minimumFractionDigits:d})};
const PINK="#F6C9D3",PINKD="#D96A8A",MINT="#CDEBDF",MINTD="#3F8F72",BUTTER="#F8E6B5",BUTTERD="#B8862B",SKY="#CFE0F4",SKYD="#4A72A8",LILAC="#E3D6F2",LILACD="#7A5BA6",INK="#3F2A3A";
let seed=11;const rnd=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return ((seed>>>0)%1e6)/1e6};
const s={playing:false,pGrab:0.6,pHold:0.25,cost:2,prize:8,plays:0,wins:0,hist:[],anim:null,mode:"random",every:12,phase:0,lastWin:null,lastGrab:null,outcomes:[],runId:0};
const pWin=()=>s.mode==="random"?s.pGrab*s.pHold:1/s.every;
function playOnce(){s.plays++;let win,grab;if(s.mode==="random"){grab=rnd()<s.pGrab;win=grab&&rnd()<s.pHold}else{win=s.plays%s.every===0;grab=win||rnd()<0.5}
  if(win)s.wins++;s.hist.push(s.wins/s.plays);if(s.hist.length>2000)s.hist.shift();s.lastWin=win;s.lastGrab=grab;s.outcomes.push(win);if(s.outcomes.length>40)s.outcomes.shift();return {win,grab}}
function playAnimated(){if(s.anim&&s.anim.t<1)return;const r=playOnce();s.anim=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches?null:{t:0,...r};s.playing=!!s.anim}
function reset(){s.plays=0;s.wins=0;s.hist=[];s.anim=null;s.playing=false;s.lastWin=null;s.lastGrab=null;s.outcomes=[];s.runId++;seed=11}
// The approved Blender render is a useful, explicitly static fallback. Readouts and diagrams
// remain live HTML/SVG even when WebGL or the model download is unavailable.
const F=StudyKit.fig,PAL=F.palette,NAVY="#262E5C";
function drawMain(){return `<image href="/assets/models/claw/claw-hero.webp" x="0" y="0" width="800" height="800" preserveAspectRatio="xMidYMid meet"/><rect x="180" y="750" width="440" height="36" rx="18" fill="#fff"/><text x="400" y="773" text-anchor="middle" style="font:500 18px system-ui;fill:#262E5C">Blender render · static reference</text>`}
function lln(){const w=420,h=260,H=s.hist,X=i=>40+(i+1)/Math.max(50,H.length)*(w-56),Y=v=>220-v*190;let o=F.floor(w,h)+`<line x1="40" x2="${w-12}" y1="220" y2="220" stroke="#8F9BAA"/><line x1="40" x2="40" y1="20" y2="220" stroke="#8F9BAA"/>`;
  o+=`<line x1="40" x2="${w-12}" y1="${Y(pWin())}" y2="${Y(pWin())}" stroke="${MINTD}" stroke-width="2" stroke-dasharray="5 4"/><text class="t-lab" x="${w-14}" y="${Y(pWin())-6}" text-anchor="end">THEORETICAL ${fmt(pWin(),3)}</text>`;
  o+=`<text class="t-lab" x="30" y="224" text-anchor="end">0</text><text class="t-lab" x="30" y="129" text-anchor="end">.5</text><text class="t-lab" x="30" y="34" text-anchor="end">1</text>`;
  if(H.length===1)o+=`<circle cx="${X(0)}" cy="${Y(H[0])}" r="4" fill="${PINKD}"/>`;
  if(H.length>1)o+=`<polyline points="${H.map((v,i)=>`${X(i)},${Y(v)}`).join(" ")}" fill="none" stroke="${PINKD}" stroke-width="2.2"/>`;
  o+=`<text class="t-lab" x="${w-12}" y="244" text-anchor="end">${s.plays>2000?"LAST 2,000 OF ":"NUMBER OF PLAYS: "}${fmt(s.plays)}</text><text class="t-lab" x="44" y="16">RELATIVE FREQUENCY (0–1)</text>`;return o}
function tree(){const g=s.pGrab,h=s.pHold;const n=(x,y,t,c)=>`<rect x="${x-52}" y="${y-15}" width="104" height="30" rx="12" fill="${c}" stroke="${F.deep(c)}" stroke-width="1.4"/><text x="${x}" y="${y+5}" text-anchor="middle" style="font:600 12px var(--display);fill:${NAVY}">${t}</text>`;
  let o=F.floor(420,260)+`<path d="M60,130 L170,65 M60,130 L170,195 M222,65 L320,30 M222,65 L320,100" stroke="#8F9BAA" stroke-width="2" fill="none"/>`;
  o+=n(60,130,"Press go","#FFFFFF")+n(222,65,"Grabs it",PAL.case.sky)+n(222,195,"Misses",PAL.case.blush)+n(366,30,"Holds: WIN",PAL.case.mint)+n(366,100,"Drops it",PAL.case.butter);
  o+=`<text class="t-ink" x="105" y="88">${fmt(g,2)}</text><text class="t-ink" x="105" y="182">${fmt(1-g,2)}</text><text class="t-ink" x="262" y="40">${fmt(h,2)}</text><text class="t-ink" x="262" y="100">${fmt(1-h,2)}</text>`;
  o+=`<text class="t-ink" x="20" y="240">Multiply along the branches: ${fmt(g,2)} × ${fmt(h,2)} = ${fmt(g*h,3)}</text>`;return o}
const steps=[
 {k:"play",lab:"Have a go",speed:1,cap:"Press Play once to drop the claw, or play 10 at once. Count your prizes. Is it as easy as it looks?",controls:["play1","play10","reset","cost"],
  big:"<b>The big idea:</b> relative frequency = number of wins ÷ number of plays. With only a few plays it jumps around a lot.",
  exam:"Relative frequency is an estimate of probability from an experiment: wins ÷ total plays. With a small number of trials it can be far from the true probability.",
  trap:"Treating a few lucky wins as proof the machine is generous. Small samples vary a lot.",chips:["plays","wins","rf"]},
 {k:"long",lab:"The long run",cap:"Compare a short run with a longer one. The coral line is your relative frequency; the dashed line is the probability in this model.",controls:["play100","play1000","reset"],
  big:"<b>The big idea:</b> over many independent trials, relative frequency tends towards the theoretical probability. It need not get closer after every trial.",
  exam:"As the number of trials increases, the relative frequency tends to get closer to the theoretical probability. After 1,000 plays the estimate is far more reliable than after 10.",
  trap:"Thinking a win is 'due' after lots of losses. Each play is independent.",chips:["plays","wins","rf","p"]},
 {k:"tree",lab:"Two steps to win",cap:"To win, the claw has to grab the prize AND hold on all the way to the chute. Change each chance and see the tree diagram multiply them.",controls:["pGrab","pHold","play10","reset"],
  big:"<b>The big idea:</b> P(win) = P(grab) × P(hold given grab). Both stages must succeed.",
  exam:"Winning needs a grab, followed by a successful hold. Multiply the grab probability by the conditional hold probability. At 0.60 and 0.25, P(win) = 0.15: 15 wins per 100 trials on average.",
  trap:"Adding the two chances. Follow the win branch and multiply the grab chance by the hold chance given a grab.",chips:["p","rf"]},
 {k:"value",lab:"Is it worth it?",cap:"Each play costs money and each prize is worth something. The expected value tells you what you win or lose per play on average.",controls:["cost","prize","pGrab","pHold","play100","reset"],
  big:"<b>The big idea:</b> expected value = P(win) × prize value − cost. If it's negative, you lose money on average the more you play.",
  exam:()=>`Expected value per play = ${fmt(pWin(),3)} × $${fmt(s.prize,2)} − $${fmt(s.cost,2)} = ${pWin()*s.prize-s.cost<0?"−":""}$${fmt(Math.abs(pWin()*s.prize-s.cost),2)}. Average cost per prize = $${fmt(s.cost,2)} ÷ ${fmt(pWin(),3)} ≈ $${fmt(s.cost/pWin(),2)}. This is a long-run average, not a promise for any individual play.`,
  trap:"Comparing the prize value with one play's cost. Compare it with the cost of all the plays it takes to win.",chips:["ev","perPrize","p"]},
 {k:"rigged",lab:"Random or rigged?",cap:"Compare independent random trials with an idealised schedule: exactly one win every N plays. Watch the last 40 outcomes. This does not represent the controls of a particular real machine.",controls:["mode","every","play100","reset"],
  big:"<b>The big idea:</b> a random process has no memory. A machine set to pay out on a schedule does: the pattern gives it away in the data.",
  exam:"In a random process, wins are scattered unpredictably and each play is independent. If wins happen at regular intervals (every 12th play), the outcomes are not independent, and the probability changes depending on how many plays since the last win.",
  trap:"Assuming every game of chance is fair and random. Check the data for patterns.",chips:["plays","wins","rf"]},
 {k:"test",lab:"Test yourself",cap:"Three challenges. Use the controls, then press Check.",controls:["pGrab","pHold","cost","prize","play100","reset"],chips:["p","ev","perPrize"],
  big:"<b>Exam tip:</b> show the calculation: P(A) × P(B) for 'and', wins ÷ plays for relative frequency, and P × value − cost for expected value."}];
// ---- kupu Māori: te reo terms for this machine, each checked in Te Aka Māori Dictionary (ta = word id). Sources and notes: te-reo-notes.md
const KUPU=[
 {mi:"tūponotanga",en:"probability, chance",ta:46069,chip:"p"},
 {mi:"whakamātau tūponotanga",en:"probability experiment",ta:46107},
 {mi:"pāpono",en:"event (in probability)",ta:45828},
 {mi:"putanga",en:"outcome",ta:6346},
 {mi:"hoahoa rākau",en:"tree diagram",ta:45657},
 {mi:"raraunga",en:"data",ta:6555},
 {mi:"tauanga",en:"statistics",ta:44587},
 {mi:"uara",en:"value (maths)",ta:8853}];
Object.entries({"play": ["whakamātau tūponotanga", "putanga", "raraunga"], "long": ["tūponotanga", "raraunga"], "tree": ["pāpono", "putanga", "hoahoa rākau", "tūponotanga"], "value": ["uara", "tūponotanga"], "rigged": ["tauanga", "raraunga"]}).forEach(([k,a])=>{const st=steps.find(x=>x.k===k);if(st)st.kupu=a});
// Lazy loading keeps the probability lesson usable if any 3D module fails.
function claw3d(S){
  let world=null;const host=S.canvas.parentElement,figure=host.parentElement;
  host.style.visibility="hidden";figure.classList.remove("s3-on");
  import("./claw-scene.js").then(m=>{world=m.clawScene(S);const r=host.getBoundingClientRect();world.resize?.(r.width,r.height)}).catch(e=>{
    host.style.visibility="hidden";figure.classList.remove("s3-on");
    document.getElementById("claw-load-status").textContent="3D unavailable · static Blender render, live probability controls";
    console.warn("Claw viewer unavailable",e);
  });
  return {resize(...args){world?.resize?.(...args)},update(...args){world?.update?.(...args)}};
}
function updateReadouts(){
  const link=document.getElementById?.("claw-graphics-link");if(link)link.href=(/[?&]lite\b/.test(location.search)?location.pathname:"?lite")+location.hash;
  const status=document.getElementById?.("claw-outcome"),tape=document.getElementById?.("claw-tape");
  const message=s.lastWin===null?"Ready for your first trial":s.lastWin?"Prize won · grabbed and held":s.lastGrab?"Prize dropped · grabbed, then lost":"Missed · no grab";
  if(status&&status.textContent!==message)status.textContent=message;
  if(tape&&tape.dataset.key!==s.runId+":"+s.plays){tape.dataset.key=s.runId+":"+s.plays;tape.innerHTML=s.outcomes.map(w=>`<i class="${w?"win":"miss"}" aria-hidden="true"></i>`).join("");tape.setAttribute("aria-label",s.outcomes.length?"Last "+s.outcomes.length+" outcomes, oldest first: "+s.outcomes.map(w=>w?"win":"loss").join(", "):"No trials yet")}
}
const api=StudyKit.mount({kupu:KUPU,scene3d:claw3d, ar:false, postprocessing:false, companion:"quiet",
  lesson:{step:"long",
    question:"Does a bigger sample give a better estimate?",
    explore:"Try a few plays. Each trial first samples a grab, then a hold given a grab. The cabinet illustrates that outcome. Watch the wins and the relative frequency change.",
    predict:"Which estimate will usually be closer to the theoretical probability: 10 plays or 1,000? Explain why. Must every extra trial improve it?",
    investigate:"Set up A runs 10 trials at P(grab) = 0.60 and P(hold given grab) = 0.25. Capture A. Set up B continues that same run to 1,000 trials; capture B. Keep the chances fixed. Reset repeats the same random sequence so you can reproduce this example.",
    explain:"Compare each estimate with 0.15 using its absolute error. Explain why a larger sample is usually more reliable, but is not guaranteed to be closer in every experiment. A losing streak does not make the next independent win due.",
    prepare(k,x,a,e){
      if(k==="A"){s.mode="random";s.pGrab=.6;s.pHold=.25;s.cost=2;s.prize=8;reset();for(let i=0;i<10;i++)playOnce();return "A: 10 trials completed. Observe the results, then capture A."}
      if(!e.A||e.A.raw.runId!==s.runId||s.mode!=="random"||s.pGrab!==.6||s.pHold!==.25||s.plays!==10)return "Capture a fresh A at 10 trials before setting up B. Keep the same run and chances.";
      for(let i=s.plays;i<1000;i++)playOnce();s.anim=null;return "B: continued the same run to 1,000 trials. Observe the smaller or larger error, then capture B.";
    },
    capture(k,x,a,e){
      if(s.mode!=="random"||s.pGrab!==.6||s.pHold!==.25||s.plays!==(k==="A"?10:1000))return {error:"Use Set up "+k+" and keep its trial count and chances unchanged before capturing."};
      if(k==="B"&&(!e.A||e.A.raw.runId!==s.runId))return {error:"B must continue the same run as captured A. Set up and capture a fresh A first."};
      const probability=pWin(),frequency=s.wins/s.plays,error=Math.abs(frequency-probability);
      return {raw:{runId:s.runId,plays:s.plays,wins:s.wins,pGrab:s.pGrab,pHold:s.pHold,probability,frequency,error},fields:{"Trials":fmt(s.plays),"Prizes":fmt(s.wins),"Theoretical probability":fmt(probability,3),"Relative frequency":fmt(frequency,3),"Absolute error":fmt(error,3)}};
    },
    reset(){s.mode="random";s.pGrab=.6;s.pHold=.25;s.cost=2;s.prize=8;reset()}
  },
  eyebrow:"Maths · Probability and statistics", title:"The claw machine", crumb:"Years 9 and 10 Maths (probability, relative frequency, expected value) and NCEA Level 1 ideas", homeHash:"y10",
  fig:"FIG. 13 · CLAW ATELIER", railTitle:"Chance, frequency and value",
  badge:{label:"Probability · Years 9–11"},
  mainBox:"0 0 800 800", mainPhoneBig:true, mainLabel:"A detailed lilac claw machine with chrome linkage and pastel prize capsules", closeBox:"0 0 420 260",
  state:s, steps, onStep:(x,st)=>{s.anim=null;s.playing=false;if(st.k!=="rigged"&&s.mode!=="random"){s.mode="random";reset()}},
  controls:[
    {type:"button",id:"play1",label:"▶ Play once",onClick:playAnimated},
    {type:"button",id:"play10",label:"Play 10",onClick:()=>{for(let i=0;i<10;i++)playOnce();s.anim=null}},
    {type:"button",id:"play100",label:"Play 100",onClick:()=>{for(let i=0;i<100;i++)playOnce();s.anim=null}},
    {type:"button",id:"play1000",label:"Play 1,000",onClick:()=>{for(let i=0;i<1000;i++)playOnce();s.anim=null}},
    {type:"button",id:"reset",label:"Reset",onClick:()=>reset()},
    {type:"range",id:"pGrab",label:"P(claw grabs it)",min:0.1,max:1,step:0.05,get:()=>s.pGrab,set:(x,v)=>{s.pGrab=v;reset()},fmt:()=>fmt(s.pGrab,2)},
    {type:"range",id:"pHold",label:"P(hold given grab)",min:0.05,max:1,step:0.05,get:()=>s.pHold,set:(x,v)=>{s.pHold=v;reset()},fmt:()=>fmt(s.pHold,2)},
    {type:"range",id:"cost",label:"Cost a play",min:0.5,max:5,step:0.5,get:()=>s.cost,set:(x,v)=>{s.cost=v;reset()},fmt:()=>"$"+fmt(s.cost,2)},
    {type:"range",id:"prize",label:"Prize worth",min:2,max:30,step:1,get:()=>s.prize,set:(x,v)=>{s.prize=v;reset()},fmt:()=>"$"+fmt(s.prize,2)},
    {type:"select",id:"mode",label:"Machine",options:[["random","Random every play"],["payout","Pays out on a schedule"]],get:()=>s.mode,set:(x,v)=>{s.mode=v;reset()}},
    {type:"range",id:"every",label:"Win every",min:5,max:30,step:1,get:()=>s.every,set:(x,v)=>{s.every=v;reset()},fmt:()=>s.every+" plays"}],
  tick:(x,dt)=>{if(s.anim){s.anim.t+=dt/2.4;if(s.anim.t>1.2){s.anim=null;s.playing=false}}else s.playing=false},
  drawMain:(x,st)=>{updateReadouts();return drawMain(st)},
  drawClose:(x,st)=>{document.getElementById?.("k-close")?.setAttribute("aria-label",st.k==="tree"?"Probability tree: grab followed by hold, with win probability equal to their product":"Running relative frequency of wins, on a zero to one scale, compared with theoretical probability");return st.k==="tree"?tree():lln()},
  chips:()=>({plays:["PLAYS",fmt(s.plays)],wins:["PRIZES",fmt(s.wins)],rf:["RELATIVE FREQUENCY",s.plays?fmt(s.wins/s.plays,3):"–",true],p:["P(WIN)",fmt(pWin(),3),true],
    ev:["EXPECTED VALUE",(pWin()*s.prize-s.cost<0?"−":"")+"$"+fmt(Math.abs(pWin()*s.prize-s.cost),2)+" a play",true],perPrize:["COST PER PRIZE","$"+fmt(s.cost/pWin(),2)]}),
  challenges:[
    {q:"Set the chances so P(win) is exactly 0.2.",check:()=>Math.abs(s.pGrab*s.pHold-0.2)<0.001&&s.mode==="random",ok:()=>`Yes: ${fmt(s.pGrab,2)} × ${fmt(s.pHold,2)} = 0.2.`,no:()=>`Not yet: ${fmt(s.pGrab,2)} × ${fmt(s.pHold,2)} = ${fmt(s.pGrab*s.pHold,3)}. Try 0.8 × 0.25 or 0.4 × 0.5.`},
    {q:"With $2 plays and P(win) = 0.15, what's the smallest whole-dollar prize value that makes the expected value zero or better? Set it.",check:()=>s.cost===2&&Math.abs(pWin()-0.15)<0.001&&s.prize===14,ok:"Yes: 0.15 × $14 = $2.10, which beats the $2 cost. $13 gives $1.95.",no:()=>s.cost!==2||Math.abs(pWin()-0.15)>0.001?"Set $2 a play and P(win) = 0.15 (0.6 and 0.25) first.":`Not yet: 0.15 × $${s.prize} = $${fmt(0.15*s.prize,2)}. You need at least $2.`},
    {q:"Play at least 1,000 times and get a relative frequency within 0.02 of P(win).",check:()=>s.plays>=1000&&Math.abs(s.wins/s.plays-pWin())<=0.02,ok:()=>`Yes: ${fmt(s.wins/s.plays,3)} vs ${fmt(pWin(),3)} after ${fmt(s.plays)} plays.`,no:()=>s.plays<1000?`Only ${fmt(s.plays)} plays so far.`:`Off by ${fmt(Math.abs(s.wins/s.plays-pWin()),3)}. Reset and try again; more plays help.`}],
  papers:[{label:"NZQA: Mathematics and Statistics",url:"https://www2.nzqa.govt.nz/ncea/subjects/past-exams-and-exemplars/"}],
  truth:"A probability experiment with chances you set. Claw motion illustrates the sampled grab/hold outcome; it does not calculate contact forces, friction or physical skill. Scheduled mode is an idealised comparison, not a model of a specific commercial machine. Reset repeats a seeded sequence. Changing settings starts a fresh run. No real money is involved.",
  footer:"Covers Years 9–10 probability (experimental and theoretical probability, relative frequency, independent events, tree diagrams, expected value) leading into NCEA Level 1 statistics and probability."
});
api.runClawTrial=()=>{if(api.step.controls.includes("play1")){playAnimated();api.redraw()}};
// A real DOM status and results tape stay available to keyboard and screen-reader users.
if(document.querySelector?.(".playmain")){
  const graph=document.getElementById("k-close").parentElement;
  graph.classList.add("claw-graph");document.querySelector(".rail").insertBefore(graph,document.querySelector(".al-slot"));
  document.querySelector(".lower").classList.add("noclose");
  const canvas=document.querySelector(".playmain .canvas");
  const panel=document.createElement("section");panel.className="claw-results";panel.setAttribute("aria-label","Trial results");
  panel.innerHTML=`<p id="claw-outcome" role="status"></p><div id="claw-tape" role="img"></div><p class="claw-key">Last 40 trials · <span>mint = win</span> · lilac = loss</p>`;
  canvas.after(panel);
  const note=document.createElement("p");note.className="claw-view-note";
  note.innerHTML=`<span id="claw-load-status" role="status">Static Blender render · live results below</span><a id="claw-graphics-link" href="?lite${location.hash}">Use static view</a>`;
  canvas.after(note);const link=note.querySelector("a");if(/[?&]lite\b/.test(location.search)){link.href=location.pathname+location.hash;link.textContent="Try live 3D"}
  window.addEventListener("hashchange",()=>{link.href=(/[?&]lite\b/.test(location.search)?location.pathname:"?lite")+location.hash});
  updateReadouts();
}
})();
