(()=>{
// The claw machine: probability, relative frequency, the long run, expected value and two-step trees.
const fmt=(x,d=0)=>{let v=Number(x);if(Math.abs(v)<0.5*Math.pow(10,-d))v=0;return v.toLocaleString("en-NZ",{maximumFractionDigits:d,minimumFractionDigits:d})};
const PINK="#F6C9D3",PINKD="#D96A8A",MINT="#CDEBDF",MINTD="#3F8F72",BUTTER="#F8E6B5",BUTTERD="#B8862B",SKY="#CFE0F4",SKYD="#4A72A8",LILAC="#E3D6F2",LILACD="#7A5BA6",INK="#3F2A3A";
let seed=11;const rnd=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return ((seed>>>0)%1e6)/1e6};
const s={pGrab:0.6,pHold:0.25,cost:2,prize:8,plays:0,wins:0,hist:[],anim:null,mode:"random",every:12,phase:0,lastWin:null};
const pWin=()=>s.mode==="random"?s.pGrab*s.pHold:1/s.every;
function playOnce(){s.plays++;let win,grab;if(s.mode==="random"){grab=rnd()<s.pGrab;win=grab&&rnd()<s.pHold}else{win=s.plays%s.every===0;grab=win||rnd()<0.5}
  if(win)s.wins++;s.hist.push(s.wins/s.plays);if(s.hist.length>2000)s.hist.shift();s.lastWin=win;return {win,grab}}
function reset(){s.plays=0;s.wins=0;s.hist=[];s.anim=null;s.lastWin=null;seed=11}
// ---- the machine: a frosted lavender arcade cabinet in the bench figure look (StudyKit.fig)
const F=StudyKit.fig,PAL=F.palette,TINT=PAL.case.lavender,TD=F.deep(TINT),NAVY="#262E5C",GREY="#5B6280";
const PR=PAL.product,PLUSH=[PR.strawberry,PR.lime,PR.butter,PR.blueberry,PR.peach];
// a faceless plush bear: painted body and ears, a pale belly patch and one soft highlight
function plush(x,y,k,i){const c=PLUSH[i%5],m=F.mat("painted",c);
  return `<g transform="translate(${x},${y}) scale(${k})"><ellipse cx="3" cy="19" rx="19" ry="5" fill="${PAL.shadow}" opacity=".12"/><circle cx="-13" cy="-16" r="7" fill="${c}" stroke="${m.stroke}" stroke-width="1.6"/><circle cx="13" cy="-16" r="7" fill="${m.shade}" stroke="${m.stroke}" stroke-width="1.6"/><circle r="20" fill="${c}" stroke="${m.stroke}" stroke-width="1.8"/><path d="M8,-17 a20,20 0 0 1 11,22 a22,22 0 0 0 -11,-22z" fill="${m.shade}" opacity=".55"/><ellipse cx="-1" cy="6" rx="10" ry="8" fill="${m.hi}" opacity=".9"/><path d="M-13,-8 a14,14 0 0 1 9,-8" stroke="#fff" stroke-opacity=".8" stroke-width="3" fill="none" stroke-linecap="round"/></g>`}
function machine(){let o=F.floor(800,420);
  // base cabinet with the controls, then the marquee, then the glass case on top
  o+=F.box(70,292,284,114,{colour:TINT,kind:"plastic",d:22,r:10,shadowLen:120});
  o+=`<rect x="80" y="300" width="264" height="98" rx="10" fill="#fff" fill-opacity=".35" stroke="${TD}" stroke-width="1"/>`;
  o+=F.box(70,20,284,44,{colour:TINT,kind:"plastic",d:22,r:10,shadow:false});
  o+=F.plate(150,29,"Claw-some!",{tint:TINT,size:15});
  // inside the case: back wall, prize bed, plush, chute
  o+=`<rect x="78" y="70" width="268" height="222" fill="#fff" fill-opacity=".55"/><path d="M78,70 l22,-12 h268 v222 h-290z" fill="${TINT}" fill-opacity=".14"/><path d="M100,58 v222 h268" fill="none" stroke="${TD}" stroke-opacity=".35"/>`;
  o+=`<path d="M86,270 q30,-26 60,-6 q34,-22 66,-2 q30,-24 60,-4 q16,-10 12,0 L284,288 L86,288Z" fill="${TINT}" stroke="${TD}" stroke-width="1" opacity=".7"/>`;
  [[120,258],[160,250],[200,262],[240,248],[268,262],[106,272],[140,270],[220,272],[184,276]].forEach(([x,y],i)=>o+=plush(x,y,0.72,i));
  o+=F.acrylic(290,220,50,66,{tint:TINT,d:8,r:4,balls:false,shadow:false,opacity:.45});
  o+=`<rect x="296" y="276" width="38" height="8" rx="2" fill="${TD}" opacity=".5"/>`;
  // gantry rail
  o+=F.box(84,82,256,6,{colour:PAL.steel,kind:"metal",d:10,shadow:false});
  // claw: animated drop, grab, lift, carry
  const a=s.anim;let cx=200,cy=96,open=1,carry=false,drop=false;
  if(a){const t=a.t;if(t<0.25){cy=96+t/0.25*140}else if(t<0.35){cy=236;open=1-(t-0.25)/0.1}else if(t<0.6){cy=236-(t-0.35)/0.25*140;open=0;carry=a.grab}else if(t<0.85){cy=96;open=0;cx=200+(t-0.6)/0.25*115;carry=a.grab&&(a.win||t<0.7);drop=a.grab&&!a.win&&t>=0.7}else{cx=315;cy=96;open=1}}
  o+=F.box(cx-15,80,30,10,{colour:PAL.steelDark,kind:"metal",d:6,r:2,shadow:false});
  o+=`<line x1="${cx}" x2="${cx}" y1="90" y2="${cy}" stroke="${PAL.steelDark}" stroke-width="2"/>`;
  if(carry)o+=plush(cx,cy+30,0.72,3);if(drop){const dy=(a.t-0.7)/0.15*120;o+=plush(cx-10,Math.min(256,cy+30+dy),0.72,3)}
  const arm=(sx)=>`M${sx*5},6 L${sx*(14+8*open)},24 L${sx*(6+4*open)},32`;
  o+=`<g transform="translate(${cx},${cy})"><path d="${arm(-1)}" stroke="#6E7A8C" stroke-width="4.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="${arm(1)}" stroke="#6E7A8C" stroke-width="4.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="${arm(-1)}" stroke="${PAL.steel}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="${arm(1)}" stroke="${PAL.steel}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
    +`<path d="M-11,-7 h22 a5,5 0 0 1 5,5 v6 a5,5 0 0 1 -5,5 h-22 a5,5 0 0 1 -5,-5 v-6 a5,5 0 0 1 5,-5z" fill="${PAL.steel}" stroke="#6E7A8C" stroke-width="1.2"/><path d="M-9,-4 h12" stroke="#fff" stroke-width="2" stroke-linecap="round"/><circle cx="0" cy="2" r="2.6" fill="${PR.strawberry}"/></g>`;
  // the frosted glass front over the case
  o+=F.acrylic(78,70,268,222,{tint:TINT,d:22,r:6,shadow:false,opacity:.14});
  o+=F.pill(296,184,"Chute",{size:8,ax:315,ay:222});
  if(a&&a.t>0.85){const msg=a.win?"WIN!":a.grab?"Dropped it!":"Missed!",w=msg.length*15+30;o+=`<rect x="${212-w/2}" y="112" width="${w}" height="40" rx="16" fill="#fff" stroke="${PAL.pill.line}"/><text x="212" y="140" text-anchor="middle" style="font:700 26px var(--display);fill:${a.win?MINTD:PINKD}">${msg}</text>`}
  // controls: joystick, a big button, the price display and the prize door
  o+=`<ellipse cx="120" cy="352" rx="18" ry="6" fill="${PAL.steelDark}" opacity=".5"/><path d="M120,350 L126,322" stroke="${PAL.steelDark}" stroke-width="5" stroke-linecap="round"/>`;
  o+=`<circle cx="127" cy="318" r="9" fill="${PR.strawberry}" stroke="${F.mat("painted",PR.strawberry).stroke}" stroke-width="1.4"/><circle cx="124" cy="315" r="3" fill="#fff" opacity=".8"/>`;
  o+=F.cyl(166,338,15,10,{colour:PR.strawberry,kind:"painted",shadow:false});
  o+=F.box(204,318,120,34,{colour:"#FFFFFF",kind:"plastic",d:6,r:7,shadow:false});
  o+=`<text x="264" y="341" text-anchor="middle" style="font:700 14px var(--mono);fill:${NAVY}">$${fmt(s.cost,2)} / PLAY</text>`;
  o+=`<rect x="226" y="364" width="76" height="24" rx="6" fill="${TD}" opacity=".55"/><rect x="232" y="368" width="64" height="5" rx="2" fill="#fff" opacity=".5"/><rect x="112" y="370" width="12" height="18" rx="3" fill="${PAL.steel}" stroke="#6E7A8C"/><path d="M118,374 v10" stroke="${NAVY}" stroke-width="2" stroke-linecap="round"/>`;
  return o}
function scoreboard(st){let o=F.acrylic(410,30,360,360,{tint:TINT,d:16,r:20,shadowLen:90});
  o+=`<g transform="translate(410,30)"><rect x="10" y="14" width="340" height="334" rx="14" fill="#fff" fill-opacity=".9" stroke="${PAL.pill.line}"/>`;
  o+=`<text x="22" y="46" style="font:700 18px var(--display);fill:${NAVY}">${fmt(s.plays)} plays · ${fmt(s.wins)} prizes</text>`;
  o+=`<text x="22" y="72" style="font:500 13px var(--mono);fill:${GREY}">RELATIVE FREQUENCY = ${s.plays?fmt(s.wins,0)+" ÷ "+fmt(s.plays,0)+" = "+fmt(s.wins/s.plays,3):"–"}</text>`;
  o+=`<text x="22" y="94" style="font:500 13px var(--mono);fill:${GREY}">THEORETICAL P(WIN) = ${fmt(pWin(),3)}</text>`;
  const spent=s.plays*s.cost,won=s.wins*s.prize;o+=`<text x="22" y="128" style="font:600 14px var(--display);fill:${NAVY}">Spent $${fmt(spent,2)} · prizes worth $${fmt(won,2)}</text>`;
  o+=`<text x="22" y="150" style="font:600 14px var(--display);fill:${won>=spent?MINTD:PINKD}">${won>=spent?"Ahead by":"Behind by"} $${fmt(Math.abs(won-spent),2)}</text>`;
  o+=`<text x="22" y="186" style="font:500 12px var(--mono);fill:${GREY}">ONE PRIZE EVERY ${fmt(1/pWin(),1)} PLAYS ON AVERAGE = $${fmt(s.cost/pWin(),2)}</text>`;
  o+=`<text x="22" y="208" style="font:500 12px var(--mono);fill:${GREY}">EV A PLAY = ${fmt(pWin(),3)} × $${fmt(s.prize,0)} − $${fmt(s.cost,2)} = ${pWin()*s.prize-s.cost>=0?"":"−"}$${fmt(Math.abs(pWin()*s.prize-s.cost),2)}</text>`;
  const ev=pWin()*s.prize-s.cost,bar=Math.max(-1,Math.min(1,ev/s.cost));o+=`<rect x="22" y="228" width="316" height="14" rx="7" fill="#ECEEF4" stroke="${PAL.pill.line}"/><rect x="${bar<0?180+bar*158:180}" y="228" width="${Math.abs(bar)*158}" height="14" rx="7" fill="${bar<0?PR.strawberry:PR.lime}"/><line x1="180" x2="180" y1="222" y2="248" stroke="${NAVY}"/>`;
  o+=s.mode==="random"?`<text x="22" y="270" style="font:500 11px var(--mono);fill:${GREY}">EVERY PLAY IS INDEPENDENT:</text><text x="22" y="286" style="font:500 11px var(--mono);fill:${GREY}">LOSING STREAKS DON'T MAKE A WIN \"DUE\"</text>`:`<text x="22" y="270" style="font:500 11px var(--mono);fill:${GREY}">PAYOUT MODE: ONE WIN IS LET</text><text x="22" y="286" style="font:500 11px var(--mono);fill:${GREY}">THROUGH EVERY ${s.every} PLAYS</text>`;
  if(st.k==="tree"){o+=`<g transform="translate(22,322)"><text x="0" y="0" style="font:600 11.5px var(--mono);fill:${NAVY}">P(win) = P(grab) × P(hold) = ${fmt(s.pGrab,2)} × ${fmt(s.pHold,2)} = ${fmt(s.pGrab*s.pHold,3)}</text></g>`}
  return o+`</g>`}
function drawMain(st){return machine()+scoreboard(st)}
function lln(){const w=420,h=260,H=s.hist,X=i=>40+i/Math.max(50,H.length)*(w-56),Y=v=>220-v/Math.max(0.5,pWin()*3)*190;let o=F.floor(w,h)+`<line x1="40" x2="${w-12}" y1="220" y2="220" stroke="#8F9BAA"/><line x1="40" x2="40" y1="20" y2="220" stroke="#8F9BAA"/>`;
  o+=`<line x1="40" x2="${w-12}" y1="${Y(pWin())}" y2="${Y(pWin())}" stroke="${MINTD}" stroke-width="2" stroke-dasharray="5 4"/><text class="t-lab" x="${w-14}" y="${Y(pWin())-6}" text-anchor="end">THEORETICAL ${fmt(pWin(),3)}</text>`;
  if(H.length>1)o+=`<polyline points="${H.map((v,i)=>`${X(i)},${Y(v)}`).join(" ")}" fill="none" stroke="${PINKD}" stroke-width="2.2"/>`;
  o+=`<text class="t-lab" x="${w-12}" y="244" text-anchor="end">NUMBER OF PLAYS (${fmt(s.plays)})</text><text class="t-lab" x="44" y="16">RELATIVE FREQUENCY OF WINNING</text>`;return o}
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
 {k:"long",lab:"The long run",cap:"Now play 1,000 times. Watch the red line settle towards the green dashed line: the true chance of winning.",controls:["play100","play1000","reset"],
  big:"<b>The big idea:</b> the law of large numbers: the more trials, the closer the relative frequency gets to the theoretical probability.",
  exam:"As the number of trials increases, the relative frequency tends to get closer to the theoretical probability. After 1,000 plays the estimate is far more reliable than after 10.",
  trap:"Thinking a win is 'due' after lots of losses. Each play is independent.",chips:["plays","rf","p"]},
 {k:"tree",lab:"Two steps to win",cap:"To win, the claw has to grab the prize AND hold on all the way to the chute. Change each chance and see the tree diagram multiply them.",controls:["pGrab","pHold","play10","reset"],
  big:"<b>The big idea:</b> for independent events, P(A and B) = P(A) × P(B). Two decent chances multiply into a small one.",
  exam:"Winning needs two independent events: the claw grabs the toy (0.6) and keeps hold of it (0.25). P(win) = 0.6 × 0.25 = 0.15, so on average 15 wins in every 100 plays.",
  trap:"Adding the probabilities instead of multiplying them. 'And' means multiply.",chips:["p","rf"]},
 {k:"value",lab:"Is it worth it?",cap:"Each play costs money and each prize is worth something. The expected value tells you what you win or lose per play on average.",controls:["cost","prize","pGrab","pHold","play100","reset"],
  big:"<b>The big idea:</b> expected value = P(win) × prize value − cost. If it's negative, you lose money on average the more you play.",
  exam:"Expected value per play = P(win) × value of prize − cost = 0.15 × $8 − $2 = −$0.80. On average a player loses 80 cents a play, so a prize costs about $2 ÷ 0.15 ≈ $13.33 to win.",
  trap:"Comparing the prize value with one play's cost. Compare it with the cost of all the plays it takes to win.",chips:["ev","perPrize","p"]},
 {k:"rigged",lab:"Random or rigged?",cap:"Some claw machines can be set to let a win through every so many plays. Switch to payout mode and watch the pattern in the results.",controls:["mode","every","play100","reset"],
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
const api=StudyKit.mount({kupu:KUPU,
  eyebrow:"Maths · Probability and statistics", title:"The claw machine", crumb:"Years 9 and 10 Maths (probability, relative frequency, expected value) and NCEA Level 1 ideas", homeHash:"y10",
  fig:"FIG. 13 · A PASTEL ARCADE CLAW MACHINE", railTitle:"Chance, frequency and value",
  badge:{label:"Probability · Years 9–11"},
  mainBox:"0 0 800 420", mainPhoneBig:true, mainLabel:"A claw machine full of plush toys beside a scoreboard of plays, prizes and expected value", closeBox:"0 0 420 260",
  state:s, steps, onStep:(x,st)=>{if(st.k==="rigged"&&s.mode==="random"){}},
  controls:[
    {type:"button",id:"play1",label:"▶ Play once",onClick:()=>{const r=playOnce();s.anim={t:0,...r}}},
    {type:"button",id:"play10",label:"Play 10",onClick:()=>{for(let i=0;i<10;i++)playOnce();s.anim=null}},
    {type:"button",id:"play100",label:"Play 100",onClick:()=>{for(let i=0;i<100;i++)playOnce();s.anim=null}},
    {type:"button",id:"play1000",label:"Play 1,000",onClick:()=>{for(let i=0;i<1000;i++)playOnce();s.anim=null}},
    {type:"button",id:"reset",label:"Reset",onClick:()=>reset()},
    {type:"range",id:"pGrab",label:"P(claw grabs it)",min:0.1,max:1,step:0.05,get:()=>s.pGrab,set:(x,v)=>{s.pGrab=v},fmt:()=>fmt(s.pGrab,2)},
    {type:"range",id:"pHold",label:"P(holds on)",min:0.05,max:1,step:0.05,get:()=>s.pHold,set:(x,v)=>{s.pHold=v},fmt:()=>fmt(s.pHold,2)},
    {type:"range",id:"cost",label:"Cost a play",min:0.5,max:5,step:0.5,get:()=>s.cost,set:(x,v)=>{s.cost=v},fmt:()=>"$"+fmt(s.cost,2)},
    {type:"range",id:"prize",label:"Prize worth",min:2,max:30,step:1,get:()=>s.prize,set:(x,v)=>{s.prize=v},fmt:()=>"$"+fmt(s.prize,2)},
    {type:"select",id:"mode",label:"Machine",options:[["random","Random every play"],["payout","Pays out on a schedule"]],get:()=>s.mode,set:(x,v)=>{s.mode=v;reset()}},
    {type:"range",id:"every",label:"Win every",min:5,max:30,step:1,get:()=>s.every,set:(x,v)=>{s.every=v;reset()},fmt:()=>s.every+" plays"}],
  tick:(x,dt)=>{if(s.anim){s.anim.t+=dt/2.4;if(s.anim.t>1.2)s.anim=null}},
  drawMain:(x,st)=>drawMain(st),
  drawClose:(x,st)=>st.k==="tree"?tree():lln(),
  chips:()=>({plays:["PLAYS",fmt(s.plays)],wins:["PRIZES",fmt(s.wins)],rf:["RELATIVE FREQUENCY",s.plays?fmt(s.wins/s.plays,3):"–",true],p:["P(WIN)",fmt(pWin(),3),true],
    ev:["EXPECTED VALUE",(pWin()*s.prize-s.cost<0?"−":"")+"$"+fmt(Math.abs(pWin()*s.prize-s.cost),2)+" a play",true],perPrize:["COST PER PRIZE","$"+fmt(s.cost/pWin(),2)]}),
  challenges:[
    {q:"Set the chances so P(win) is exactly 0.2.",check:()=>Math.abs(s.pGrab*s.pHold-0.2)<0.001&&s.mode==="random",ok:()=>`Yes: ${fmt(s.pGrab,2)} × ${fmt(s.pHold,2)} = 0.2.`,no:()=>`Not yet: ${fmt(s.pGrab,2)} × ${fmt(s.pHold,2)} = ${fmt(s.pGrab*s.pHold,3)}. Try 0.8 × 0.25 or 0.4 × 0.5.`},
    {q:"With $2 plays and P(win) = 0.15, what's the smallest whole-dollar prize value that makes the expected value zero or better? Set it.",check:()=>s.cost===2&&Math.abs(pWin()-0.15)<0.001&&s.prize===14,ok:"Yes: 0.15 × $14 = $2.10, which beats the $2 cost. $13 gives $1.95.",no:()=>s.cost!==2||Math.abs(pWin()-0.15)>0.001?"Set $2 a play and P(win) = 0.15 (0.6 and 0.25) first.":`Not yet: 0.15 × $${s.prize} = $${fmt(0.15*s.prize,2)}. You need at least $2.`},
    {q:"Play at least 1,000 times and get a relative frequency within 0.02 of P(win).",check:()=>s.plays>=1000&&Math.abs(s.wins/s.plays-pWin())<=0.02,ok:()=>`Yes: ${fmt(s.wins/s.plays,3)} vs ${fmt(pWin(),3)} after ${fmt(s.plays)} plays.`,no:()=>s.plays<1000?`Only ${fmt(s.plays)} plays so far.`:`Off by ${fmt(Math.abs(s.wins/s.plays-pWin()),3)}. Reset and try again; more plays help.`}],
  papers:[{label:"NZQA: Mathematics and Statistics",url:"https://www2.nzqa.govt.nz/ncea/subjects/past-exams-and-exemplars/"}],
  truth:"A simulated claw machine with chances you set. Real machines vary, and some can be set to pay out on a schedule; this shows how the data would look either way. No real money involved.",
  footer:"Covers Years 9–10 probability (experimental and theoretical probability, relative frequency, independent events, tree diagrams, expected value) leading into NCEA Level 1 statistics and probability."
});
})();
