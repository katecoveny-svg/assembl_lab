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
// ---------- the 3D bench (../kit3d.js): a lavender acrylic claw machine full of instanced plush toys, a results tape of the last
// 40 plays, a 3D tree diagram whose branches carry a flow of balls split by the chances you set, a long-run bar chart that settles
// on the theoretical line, and a coin balance that weighs the cost of a play against the expected prize. Everything reads the same
// state the challenges mark: pWin(), s.hist, s.plays, s.wins, s.anim and the sliders.
function claw3d(S){const {THREE,mat,PAL}=S;const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
  const ZT=V3(-7.6,0,-.4),ZM=V3(0,0,0),ZG=V3(7.0,0,-.4),ZV=V3(13.0,0,-.4),TOP=.3;
  const plinth=(c,w,d,tint)=>{const p=S.rbox(w,.3,d,.12,mat("plastic",tint,{rough:.55,coat:.2}));p.position.set(c.x,.15,c.z);S.scene.add(p);return p};
  plinth(ZT,7.4,4,PAL.case.blush);plinth(ZM,5.6,5.4,PAL.case.mint);plinth(ZG,6.2,4,PAL.case.blush);plinth(ZV,5.8,4,PAL.case.mint);
  const LAV=PAL.case.lavender,LAVD=PAL.deep.lavender;
  const lav=mat("plastic",LAV,{rough:.4}),white=mat("plastic","#ffffff",{rough:.35}),steel=mat("metal",PAL.steel,{rough:.25}),steelD=mat("metal",PAL.steelDark,{rough:.3});
  const PLUSH=[PAL.product.strawberry,PAL.product.lime,PAL.product.butter,PAL.product.blueberry,PAL.product.peach];
  const tmp=V3(0,0,0),q=new THREE.Quaternion(),eul=new THREE.Euler(),off=V3(0,0,0);
  const hdr=(c,k)=>new THREE.Color(c).multiplyScalar(k);
  // ================================================================ the cabinet
  const cab=S.group();cab.position.set(ZM.x,TOP,ZM.z-.3);
  const BW=3,BH=1.6,BD=2.4,CH=2.6,FL=BH;   // base, case height, case floor
  cab.add(S.rbox(BW,BH,BD,.12,lav,{at:[0,BH/2,0]}));
  cab.add(S.rbox(BW-.36,BH-.5,.05,.03,mat("plastic","#F3EEFB",{rough:.5}),{at:[0,.62,BD/2+.005]}));
  const door=S.rbox(.86,.5,.08,.05,mat("plastic",LAVD,{rough:.5}),{at:[.72,.42,BD/2+.02]});cab.add(door);
  const tray=S.rbox(.9,.06,.42,.03,steel,{at:[.72,.2,BD/2+.22]});cab.add(tray);
  cab.add(S.rbox(.92,.16,.05,.02,steel,{at:[.72,.26,BD/2+.42]}));
  // the control deck: joystick, the big go button and a coin slot
  const deck=S.group(cab);deck.position.set(0,BH-.05,BD/2+.32);deck.rotation.x=.22;
  deck.add(S.rbox(BW,.22,.72,.08,lav));deck.add(S.rbox(BW-.2,.02,.56,.01,mat("plastic","#F3EEFB",{rough:.5}),{at:[0,.11,0]}));
  const joy=S.group(deck);joy.position.set(-.85,.12,0);joy.add(S.cyl(.14,.16,.05,steelD,{seg:24}));
  const stick=S.group(joy);stick.add(S.cyl(.028,.028,.42,steel,{at:[0,.21,0],seg:12}));const knobM=mat("plastic",PAL.product.strawberry,{rough:.3});stick.add(S.sphere(.1,knobM,{at:[0,.44,0]}));
  const btnM=S.M.glow(PAL.product.lime,.4);
  const btn=S.group(deck);btn.position.set(.05,.12,.02);btn.add(S.cyl(.2,.22,.06,steelD,{seg:32}));const cap=S.cyl(.16,.16,.1,btnM,{at:[0,.07,0],seg:32});btn.add(cap);
  deck.add(S.rbox(.36,.05,.22,.02,steelD,{at:[.85,.12,0]}));deck.add(S.box(.2,.06,.025,mat("plastic",PAL.ink),{at:[.85,.13,0]}));
  // the frosted case, its floor, back wall and the prize chute
  const glass=S.acrylicCase(BW,CH,BD,LAV,{opacity:.12,railColor:LAV});glass.position.y=FL;cab.add(glass);
  cab.add(S.rbox(BW-.08,.06,BD-.08,.02,mat("plastic","#E9E0F8",{rough:.6}),{at:[0,FL+.03,0]}));
  cab.add(S.rbox(BW-.1,CH-.1,.04,.02,mat("matte","#F4F0FB"),{at:[0,FL+CH/2,-BD/2+.06]}));
  const CHX=.92,CHZ=.62,CHW=.86;
  const chute=S.group(cab);chute.position.set(CHX,FL+.06,CHZ);
  const chM=mat("acrylic","#ffffff",{opacity:.22});
  [[0,CHW/2,CHW,.04],[0,-CHW/2,CHW,.04],[CHW/2,0,.04,CHW],[-CHW/2,0,.04,CHW]].forEach(([x,z,w,d])=>{const m=S.box(w,.62,d,chM,{at:[x,.31,z],cast:false});m.renderOrder=3;chute.add(m)});
  [[0,CHW/2],[0,-CHW/2],[CHW/2,0],[-CHW/2,0]].forEach(([x,z])=>chute.add(S.box(x?.06:CHW+.06,.06,z?.06:CHW+.06,lav,{at:[x,.64,z]})));
  chute.add(S.cyl(CHW*.42,CHW*.42,.02,mat("matte","#4A3F6B"),{at:[0,.01,0],seg:40}));
  // the marquee with chasing bulbs (HDR instance colours so bloom picks up the lit ones)
  const MQY=FL+CH+.32;cab.add(S.rbox(BW+.16,.64,BD+.16,.14,lav,{at:[0,MQY,0]}));
  const strip=S.rbox(BW-.5,.3,.04,.03,mat("glow","#FFF4D6",.5),{at:[0,MQY,BD/2+.09]});cab.add(strip);
  const NB=26,bulbs=S.swarm(NB,new THREE.SphereGeometry(.045,12,8),new THREE.MeshBasicMaterial({color:"#ffffff",toneMapped:false}),{colors:true});cab.add(bulbs);
  const bulbP=[];for(let i=0;i<NB;i++){const u=i/NB;let x,y;const P=2*(BW-.2)+2*.44,d=u*P,a=BW-.2;
    if(d<a){x=-a/2+d;y=MQY+.22}else if(d<a+.44){x=a/2;y=MQY+.22-(d-a)}else if(d<2*a+.44){x=a/2-(d-a-.44);y=MQY-.22}else{x=-a/2;y=MQY-.22+(d-2*a-.44)}bulbP.push([x,y])}
  // the payout counter: one lamp a play since the last win, shown only when the machine pays out on a schedule
  const NL=30,lamps=S.swarm(NL,new THREE.SphereGeometry(.045,10,8),new THREE.MeshBasicMaterial({color:"#ffffff",toneMapped:false}),{colors:true});cab.add(lamps);
  // the gantry: two rails, a bridge that runs along x and a carriage that runs along z
  const GY=FL+CH-.2;
  for(const z of [-BD/2+.18,BD/2-.18])cab.add(S.cyl(.035,.035,BW-.1,steel,{rot:[0,0,Math.PI/2],at:[0,GY,z],seg:12}));
  const bridge=S.group(cab);bridge.add(S.rbox(.16,.1,BD-.3,.03,steelD,{at:[0,GY-.02,0]}));
  const carriage=S.rbox(.3,.16,.3,.04,mat("plastic",PAL.product.strawberry,{rough:.35}),{});cab.add(carriage);
  const cable=S.cyl(.012,.012,1,steelD,{seg:6});cab.add(cable);
  // the claw: a steel hub with three hinged prongs
  const claw=S.group(cab);
  claw.add(S.cyl(.15,.12,.2,steel,{seg:28}));claw.add(S.cyl(.16,.16,.04,steelD,{at:[0,.11,0],seg:28}));
  const clawLight=S.M.glow(PAL.product.strawberry,1.4);claw.add(S.sphere(.045,clawLight,{at:[0,.16,0]}));
  const prongs=[0,1,2].map(i=>{const p=S.group(claw);p.rotation.y=i*Math.PI*2/3;const h=S.group(p);h.position.set(.1,-.08,0);
    h.add(S.tube([[0,0,0],[.12,-.18,0],[.13,-.34,0],[.06,-.46,0]],.022,steel,{seg:24}));h.add(S.sphere(.03,steelD,{at:[0,0,0],seg:12}));return h});
  // ================================================================ plush prizes (instanced: bodies, ears and belly patches)
  const NP=46,sph=new THREE.SphereGeometry(1,20,14);
  const bodies=S.swarm(NP+2,sph,mat("plastic","#ffffff",{rough:.75,coat:.05}),{colors:true,cast:true}),ears=S.swarm((NP+2)*2,sph,mat("plastic","#ffffff",{rough:.75,coat:.05}),{colors:true,cast:true}),
    bellies=S.swarm(NP+2,sph,mat("plastic","#FFF8EC",{rough:.8,coat:.05}));
  cab.add(bodies,ears,bellies);
  let pseed=5;const prnd=()=>(pseed=(pseed*16807)%2147483647)/2147483647;
  const PX=-.42,PZ=-.05,heap=(x,z)=>.42*Math.exp(-((x-PX)**2+(z-PZ)**2)/.55);
  const pile=[];for(let i=0;i<NP;i++){const x=-1.32+prnd()*1.82,z=-1.0+prnd()*1.95;pile.push({x,z,y:FL+.06+.19+heap(x,z)*(.55+.45*prnd()),yaw:prnd()*6.28,tilt:(prnd()-.5)*.9,c:PLUSH[i%5],s:.17+prnd()*.05})}
  pile.sort((a,b)=>a.y-b.y);
  const R=.19;const held={x:PX,z:PZ,y:FL+.06+R+.45,yaw:.4,tilt:0,c:PAL.product.blueberry,s:R};
  function bear(i,b,x,y,z,yaw,tilt,s){eul.set(0,yaw,tilt);q.setFromEuler(eul);bodies.putS(i,x,y,z,s,s*.92,s,q);bodies.tint(i,b.c);
    for(let k=0;k<2;k++){off.set(k?.62*s:-.62*s,.72*s,0).applyQuaternion(q);ears.put(i*2+k,x+off.x,y+off.y,z+off.z,s*.36);ears.tint(i*2+k,b.c)}
    off.set(0,-.08*s,.62*s).applyQuaternion(q);bellies.putS(i,x+off.x,y+off.y,z+off.z,s*.55,s*.5,s*.42,q)}
  pile.forEach((b,i)=>bear(i,b,b.x,b.y,b.z,b.yaw,b.tilt,b.s));
  const hideBear=i=>{bodies.put(i,0,-50,0,.001);bellies.put(i,0,-50,0,.001);ears.put(i*2,0,-50,0,.001);ears.put(i*2+1,0,-50,0,.001)};
  const confetti=S.puffs(60,"#FFE7A0",{additive:true});cab.add(confetti);const cf=[];for(let i=0;i<60;i++)cf.push({x:0,y:0,z:0,vx:0,vy:0,vz:0,life:0});
  // ================================================================ results tape: the last 40 plays, a tall mint block for a win
  const NT=40,tape=S.swarm(NT,new S.RoundedBoxGeometry(1,1,1,2,.15),mat("plastic","#ffffff",{rough:.4}),{colors:true,cast:true});S.scene.add(tape);
  const TZ=ZM.z+2.15,TX0=ZM.x-2.05,TDX=4.1/(NT-1);
  S.scene.add(S.rbox(4.5,.06,.36,.03,white,{at:[ZM.x,TOP+.03,TZ]}));
  // scoreboard screen on a stand beside the cabinet
  const board=S.group();board.position.set(ZM.x-2.25,TOP,ZM.z-.9);board.rotation.y=.35;
  board.add(S.cyl(.05,.07,1.6,steel,{at:[0,.8,0]}));board.add(S.cyl(.3,.34,.06,steelD,{at:[0,.03,0]}));
  board.add(S.rbox(1.42,.98,.1,.05,lav,{at:[0,2.0,-.02]}));const scr=S.panel(512,336,1.28);scr.position.set(0,2.0,.04);board.add(scr);let scrKey="";
  // ================================================================ tree zone: branches as tubes, a flow of balls split by the chances
  const tz=S.group();tz.position.set(ZT.x,TOP,ZT.z);
  tz.add(S.rbox(6.6,3.5,.14,.07,mat("plastic","#ffffff",{rough:.5}),{at:[.2,1.85,-1.2]}));
  const N_={root:V3(-2.7,1.9,-.6),grab:V3(-.9,2.85,-.6),miss:V3(-.9,.95,-.6),win:V3(.9,3.35,-.6),drop:V3(.9,2.35,-.6)};
  const nodeCol={root:"#ffffff",grab:PAL.case.sky,miss:PAL.case.blush,win:PAL.case.mint,drop:PAL.case.butter};
  for(const k in N_)tz.add(S.rbox(1.0,.4,.34,.14,mat("plastic",nodeCol[k],{rough:.35}),{at:[N_[k].x,N_[k].y,N_[k].z]}));
  const unitCyl=new THREE.CylinderGeometry(1,1,1,20);
  const branch=(a,b,c)=>{const m=S.mesh(unitCyl,mat("plastic",c,{rough:.4}));const d=b.clone().sub(a);m.position.copy(a).addScaledVector(d,.5);m.quaternion.setFromUnitVectors(V3(0,1,0),d.clone().normalize());m.userData.len=d.length();m.scale.set(.05,m.userData.len,.05);tz.add(m);return m};
  const BR={grab:branch(N_.root,N_.grab,PAL.case.sky),miss:branch(N_.root,N_.miss,PAL.case.blush),win:branch(N_.grab,N_.win,PAL.case.mint),drop:branch(N_.grab,N_.drop,PAL.case.butter)};
  // probability tubes: frosted acrylic with a liquid that fills to each outcome's probability
  const tubes={};[["win",N_.win],["drop",N_.drop],["miss",N_.miss.clone().setX(.9)]].forEach(([k,p])=>{const g=S.group(tz);g.position.set(p.x+.75,p.y,p.z);
    const L=1.9;const sh=S.cyl(.16,.16,L,mat("acrylic","#ffffff",{opacity:.25}),{rot:[0,0,Math.PI/2],at:[L/2,0,0],cast:false});sh.renderOrder=4;g.add(sh);
    for(const x of [0,L])g.add(S.cyl(.17,.17,.04,white,{rot:[0,0,Math.PI/2],at:[x,0,0]}));
    const fm=mat("liquid",k==="win"?PAL.product.lime:k==="drop"?PAL.product.butter:PAL.product.strawberry,{opacity:1});const f=S.cyl(.125,.125,1,fm,{rot:[0,0,Math.PI/2]});g.add(f);tubes[k]={g,f,L}});
  tz.add(branch(N_.miss,N_.miss.clone().setX(.9),PAL.case.blush));
  const NBALL=110,balls=S.swarm(NBALL,new THREE.SphereGeometry(.06,12,10),mat("plastic","#ffffff",{rough:.25}),{colors:true});tz.add(balls);
  const bl=[];for(let i=0;i<NBALL;i++)bl.push({u:-i/NBALL*2.6,fate:0});
  // ================================================================ long-run zone: a bar for every slice of the plays so far
  const gz=S.group();gz.position.set(ZG.x,TOP,ZG.z);
  gz.add(S.rbox(5.6,3.1,.12,.06,mat("plastic","#ffffff",{rough:.5}),{at:[0,1.75,-.9]}));
  const GX0=-2.35,GW=4.7,GY0=.32,GH=2.5;
  gz.add(S.rbox(GW+.2,.08,.9,.03,mat("plastic","#F3EEFB",{rough:.5}),{at:[GX0+GW/2,GY0-.04,-.3]}));
  gz.add(S.box(.03,GH,.03,steelD,{at:[GX0,GY0+GH/2,-.75]}));
  for(let k=1;k<=4;k++)gz.add(S.box(GW,.008,.01,mat("flat","#DCD6EA"),{at:[GX0+GW/2,GY0+k*GH/4,-.8],cast:false}));
  const NG=120,bars=S.swarm(NG,new THREE.BoxGeometry(1,1,1),mat("plastic","#ffffff",{rough:.35}),{colors:true,cast:true});gz.add(bars);
  const theo=S.box(GW+.3,.03,.62,mat("glow",PAL.product.lime,1.8),{cast:false});gz.add(theo);
  const theoSheet={position:V3(0,0,0)};
  let gKey="";
  // ================================================================ value zone: a coin balance and two coin towers
  const vz=S.group();vz.position.set(ZV.x,TOP,ZV.z);
  const BX=-1.15;vz.add(S.rbox(1.4,.16,.8,.06,white,{at:[BX,.08,0]}));vz.add(S.cyl(.06,.08,2.25,steel,{at:[BX,1.25,0]}));
  const PIV=2.4;const beam=S.group(vz);beam.position.set(BX,PIV,0);beam.add(S.rbox(2.7,.1,.14,.04,mat("plastic",LAV,{rough:.3})));beam.add(S.sphere(.09,steelD,{rot:[Math.PI/2,0,0]}));
  const needle=S.box(.03,.5,.03,mat("plastic",PAL.ink),{at:[0,-.3,0]});beam.add(needle);
  const pans=[-1,1].map(sg=>{const g=S.group(vz);g.add(S.cyl(.48,.44,.05,steel,{seg:40}));
    const w=[0,1,2].map(i=>{const a=i/3*Math.PI*2+.4;const m=S.cyl(.006,.006,1,steelD,{seg:4});g.add(m);return {m,a}});return {g,sg,w}});
  const NC=200,coins=S.swarm(NC,new THREE.CylinderGeometry(.16,.16,.045,24),mat("metal",PAL.product.butter,{rough:.25}),{cast:true});vz.add(coins);
  [1.2,2.15].forEach(x=>vz.add(S.cyl(.32,.34,.06,white,{at:[x,.03,0],seg:32})));
  // ================================================================ labels
  const lPlay=S.label({cls:"big",off:[-30,-30]}),lChute=S.label({off:[28,10]}).set("Chute"),lTape=S.label({off:[-20,26]}),lGo=S.label({cls:"hot",off:[26,20]});
  const lPay=S.label({off:[30,-20]}),lGrip=S.label({off:[-30,-10]});
  const lN={};for(const k in N_)lN[k]=S.label({off:[2,0],lead:false});
  lN.root.set("Press go");lN.grab.set("Grabs it");lN.miss.set("Misses");lN.win.set("Holds: WIN");lN.drop.set("Drops it");
  const lB={grab:S.label({off:[-24,-16]}),miss:S.label({off:[-24,16]}),win:S.label({off:[-18,-18]}),drop:S.label({off:[-18,18]})};
  const lT={win:S.label({off:[20,-24]}),drop:S.label({off:[20,-24]}),miss:S.label({off:[20,-24]})},lMul=S.label({cls:"hot big",off:[0,40]});
  const lTheo=S.label({cls:"hot",off:[-24,-24]}),lRF=S.label({cls:"big",off:[22,-30]}),lAxis=S.label({off:[0,28],lead:false});
  const lCost=S.label({off:[-26,-36]}),lRet=S.label({off:[26,-36]}),lEV=S.label({cls:"hot big",off:[0,-48]}),lSpent=S.label({off:[-14,46]}),lWon=S.label({off:[24,46]});
  const zoneL={machine:[lPlay,lChute,lTape,lGo,lPay,lGrip],tree:[...Object.values(lN),...Object.values(lB),...Object.values(lT),lMul],graph:[lTheo,lRF,lAxis],value:[lCost,lRet,lEV,lSpent,lWon]};
  // ================================================================ picks: the button and joystick play, as the step's own buttons do
  function press(){const st=S.api.step,c=st.controls||[];
    if(c.includes("play1")){if(s.anim&&s.anim.t<1)return;const r=playOnce();s.anim={t:0,...r};return}
    const n=c.includes("play100")?100:c.includes("play10")?10:0;for(let i=0;i<n;i++)playOnce();if(n)s.anim=null}
  S.pick(btn,press);S.pick(joy,press);
  // ================================================================ views
  S.view("machine",[ZM.x+2.6,4.1,ZM.z+11.4],[ZM.x,2.2,ZM.z+.4],{min:3,max:24});
  S.view("rigged",[ZM.x+2.2,3.4,ZM.z+9.6],[ZM.x,1.9,ZM.z+.4],{min:3,max:24});
  S.view("tree",[ZT.x+.9,3.0,ZT.z+9.2],[ZT.x+.35,2.05,ZT.z-.4],{min:3,max:24});
  S.view("graph",[ZG.x+.9,3.0,ZG.z+8.4],[ZG.x,1.55,ZG.z-.3],{min:3,max:24});
  S.view("value",[ZV.x+.8,3.2,ZV.z+8.4],[ZV.x+.35,1.5,ZV.z],{min:3,max:24});
  S.view("all",[2.7,8.8,25],[2.7,3.0,-.8],{min:6,max:50});
  const zoneOf=k=>k==="play"?"machine":k==="rigged"?"rigged":k==="long"?"graph":k==="tree"?"tree":k==="value"?"value":"all";
  const shadowOf={machine:[5,[ZM.x,0,ZM.z]],rigged:[5,[ZM.x,0,ZM.z]],tree:[5,[ZT.x,0,ZT.z]],graph:[5,[ZG.x,0,ZG.z]],value:[5,[ZV.x,0,ZV.z]],all:[16,[2.7,0,0]]};
  let zone="all";S.goView("all",true);
  // the last n outcomes, oldest first, recovered from the running relative frequency the model keeps
  function lastOutcomes(n){const H=s.hist,L=H.length,out=[];for(let j=Math.max(0,L-n);j<L;j++){const p=s.plays-(L-1-j);const w=Math.round(H[j]*p);
      const pw=j>0?Math.round(H[j-1]*(p-1)):(p===1?0:null);out.push(pw===null?null:w>pw)}return out}
  const money=x=>(x<0?"−":"")+"$"+fmt(Math.abs(x),2);
  let playCls="big",tapeKey="",lastAnim=null,wonT=-1,shake=0;const W=V3(0,0,0);
  return {
    step(st){zone=zoneOf(st.k);S.goView(zone);S.setShadowBox(...shadowOf[zone]);
      Object.entries(zoneL).forEach(([z,ls])=>ls.forEach(l=>l.show(z===(zone==="rigged"?"machine":zone))));},
    update(s,st,dt,t){
      const P=pWin(),a=s.anim;
      // ---- claw motion, the same timeline as the drawing: drop, close, lift, carry to the chute, open
      const X0=PX,Z0=PZ,TY=GY-.75,BY=held.y+.42;let cx=X0,cz=Z0,cy=TY,open=1,carry=false,drop=false,fall=0;
      if(a){const k=a.t;if(k<.25){cy=TY-(TY-BY)*S.ease(k/.25)}else if(k<.35){cy=BY;open=1-(k-.25)/.1}else if(k<.6){cy=BY+(TY-BY)*S.ease((k-.35)/.25);open=0;carry=a.grab}
        else if(k<.85){const u=S.ease((k-.6)/.25);cx=S.lerp(X0,CHX,u);cz=S.lerp(Z0,CHZ,u);open=0;carry=a.grab&&(a.win||k<.7);drop=a.grab&&!a.win&&k>=.7;fall=(k-.7)/.15}
        else{cx=CHX;cz=CHZ;open=Math.min(1,(k-.85)/.06)}}
      else if(!S.REDUCED){cx=X0+Math.sin(t*.4)*.05;cz=Z0+Math.cos(t*.31)*.04}
      // grip: a full clamp when it will hold, a limp grip that wobbles before a drop; in payout mode the claw is visibly weak
      const weak=s.mode==="payout"?.55:1-s.pHold*.6;
      let ang=S.lerp(-.12,.5,open);if(a&&open<1&&a.grab)ang=Math.max(ang,a.win?.06:.06+weak*.22+(a.t>.55&&!a.win?Math.sin(t*40)*.04:0));
      if(!a&&s.mode==="payout")ang=.5+.12;
      prongs.forEach(h=>h.rotation.z=ang);
      claw.position.set(cx,cy,cz);carriage.position.set(cx,GY+.04,cz);bridge.position.x=cx;
      const cl=GY-cy-.06;cable.scale.y=Math.max(.01,cl);cable.position.set(cx,cy+.06+cl/2,cz);
      clawLight.emissiveIntensity=a?(1.2+Math.sin(t*14)*.8):1.1;
      stick.rotation.set(a&&a.t>.6&&a.t<.85?-.35:0,0,a&&a.t>.6&&a.t<.85?-.35:0);
      btnM.emissiveIntensity=(st.controls||[]).some(c=>/^play/.test(c))?.9+Math.sin(t*4)*.5:.2;cap.position.y=.07-(a&&a.t<.05?.03:0);
      // ---- the held plush (instance NP) and the prize in the tray (instance NP+1)
      if(a&&a!==lastAnim){lastAnim=a;wonT=-1;shake=.3}
      let hx=held.x,hy=held.y,hz=held.z,hyaw=held.yaw;
      if(carry){hx=cx;hy=cy-.42;hz=cz;hyaw=held.yaw+Math.sin(t*3)*.1}
      else if(drop){const f=S.clamp(fall,0,1);const x7=S.lerp(X0,CHX,S.ease(.4));hx=x7;hz=S.lerp(Z0,CHZ,S.ease(.4));hy=S.lerp(TY-.42,FL+.06+R+.2,f*f)}
      else if(a&&a.win&&a.t>=.85){const f=S.clamp((a.t-.85)/.1,0,1);hx=CHX;hz=CHZ;hy=S.lerp(cy-.42,FL-.3,f*f);if(f>=1&&wonT<0){wonT=t;for(const c of cf){c.x=CHX;c.y=FL+.7;c.z=CHZ;c.vx=(Math.random()-.5)*1.6;c.vy=1+Math.random()*1.6;c.vz=(Math.random()-.5)*1.6;c.life=1+Math.random()*.6}}}
      if(a&&a.win&&a.t>=.95)hideBear(NP);else bear(NP,held,hx,hy,hz,hyaw,0,R);
      const showPrize=s.lastWin&&(!a||a.t>=.95);if(showPrize)bear(NP+1,{c:PAL.product.blueberry},.72,.42,BD/2+.22,.3,0,.15);else hideBear(NP+1);
      bodies.done();ears.done();bellies.done();
      for(let i=0;i<cf.length;i++){const c=cf[i];if(c.life>0){c.life-=dt;c.vy-=3*dt;c.x+=c.vx*dt;c.y+=c.vy*dt;c.z+=c.vz*dt}confetti.put(i,c.x,c.y,c.z,c.life>0?Math.min(1,c.life):0,90)}confetti.done();
      // ---- marquee bulbs chase, faster while the claw works
      const sp=a?14:5;for(let i=0;i<NB;i++){const on=((i+Math.floor(t*sp))%4)===0;bulbs.put(i,bulbP[i][0],bulbP[i][1],BD/2+.1,1);bulbs.setColorAt(i,on?hdr(PAL.product.butter,4.5):hdr("#FFF4D6",.85))}bulbs.done();
      // ---- payout counter lamps
      const pay=s.mode==="payout",since=pay?s.plays%s.every:0;
      for(let i=0;i<NL;i++){const vis=pay&&i<s.every;const x=-1.3+(i+.5)*2.6/Math.max(1,s.every);lamps.put(i,vis?x:0,vis?1.25:-50,BD/2+.03,vis?1:.001);
        lamps.setColorAt(i,!vis?hdr("#ffffff",1):i===s.every-1?hdr(PAL.product.lime,i<since+1&&since===s.every-1?4.5:.9):i<since?hdr(PAL.product.peach,4):hdr("#E9E0F8",.9))}lamps.done();
      // ---- results tape
      const key=s.plays+"|"+s.mode;if(key!==tapeKey){tapeKey=key;const o=lastOutcomes(NT);
        for(let i=0;i<NT;i++){const j=o.length-NT+i,v=j>=0?o[j]:undefined,x=TX0+i*TDX;
          if(v===undefined){tape.putS(i,x,TOP+.08,TZ,.07,.02,.2);tape.tint(i,"#ECE7F6")}else if(v){tape.putS(i,x,TOP+.06+.17,TZ,.075,.34,.2);tape.tint(i,PAL.product.lime)}else{tape.putS(i,x,TOP+.06+.035,TZ,.075,.07,.2);tape.tint(i,"#D9CBF2")}}tape.done()}
      // ---- scoreboard screen
      const sk=[s.plays,s.wins,P.toFixed(3),s.mode,s.cost,s.prize].join("|");if(sk!==scrKey){scrKey=sk;scr.redraw((g,w,h)=>{g.fillStyle="#222A55";g.beginPath();g.roundRect(0,0,w,h,26);g.fill();
        const row=(y,l,v,c)=>{g.fillStyle="rgba(255,255,255,.7)";g.font="600 22px Instrument Sans, system-ui";g.textAlign="left";g.fillText(l,30,y);g.fillStyle=c||"#fff";g.font="700 40px IBM Plex Mono, monospace";g.textAlign="right";g.fillText(v,w-30,y+4)};
        row(64,"PLAYS",fmt(s.plays));row(128,"PRIZES",fmt(s.wins),PAL.product.lime);row(192,"WINS ÷ PLAYS",s.plays?fmt(s.wins/s.plays,3):"–",PAL.product.butter);row(256,"P(WIN)",fmt(P,3),"#BFE8D6");
        g.fillStyle="rgba(255,255,255,.55)";g.font="600 18px Instrument Sans, system-ui";g.textAlign="left";g.fillText(s.mode==="random"?"RANDOM EVERY PLAY":"PAYS OUT EVERY "+s.every+" PLAYS",30,h-26)})}
      const cw=cab.position;
      lPlay.at(tmp.set(cw.x+cx,cw.y+cy+.5,cw.z+cz)).set(a&&a.t>.85?(a.win?"WIN!":a.grab?"Dropped it!":"Missed!"):`${fmt(s.plays)} play${s.plays===1?"":"s"}<small>${fmt(s.wins)} prize${s.wins===1?"":"s"}</small>`);{const c=a&&a.t>.85&&a.win?"hot big":"big";if(c!==playCls){playCls=c;lPlay.cls(c)}}
      lChute.at(tmp.set(cw.x+CHX+.4,cw.y+FL+.5,cw.z+CHZ));lGo.at(tmp.set(cw.x+.05,cw.y+BH+.12,cw.z+BD/2+.4)).set((st.controls||[]).includes("play1")?"Press to play":"Press: play "+((st.controls||[]).includes("play100")?100:10));
      lTape.at(tmp.set(TX0+NT*TDX*.5,TOP+.2,TZ+.15)).set(`Last ${NT} plays<small>tall green block = a win</small>`);
      lPay.show(zone==="rigged"&&pay).at(tmp.set(cw.x+1.3,cw.y+1.25,cw.z+BD/2)).set(`${since} of ${s.every} plays<small>since the last win</small>`);
      lGrip.show(zone==="rigged").at(tmp.set(cw.x+cx-.1,cw.y+cy-.4,cw.z+cz)).set(pay?"Weak grip<small>wins come on a schedule</small>":"Same grip every play<small>no memory</small>");
      // ---- tree: branch thickness and the liquid in each tube follow the probabilities, balls split at each fork
      const pg=s.pGrab,ph=s.pHold,pr={grab:pg,miss:1-pg,win:pg*ph,drop:pg*(1-ph)};
      for(const k in BR){const m=BR[k];const r=.02+.075*pr[k];m.scale.set(r,m.userData.len,r)}
      for(const k in tubes){const T=tubes[k],v=k==="miss"?1-pg:pr[k];T.f.scale.set(1,Math.max(.002,v*T.L),1);T.f.position.x=v*T.L/2;lT[k].at(tmp.set(ZT.x+T.g.position.x+v*T.L,TOP+T.g.position.y+.12,ZT.z+T.g.position.z)).set(`<b>${fmt(v,3)}</b>`)}
      for(let i=0;i<NBALL;i++){const b=bl[i];const u0=b.u;b.u+=dt*.55*(S.REDUCED?.3:1);if(b.u>=2.6||(u0<0&&b.u>=0)){if(b.u>=2.6)b.u-=2.6;b.fate=Math.random()<pg?(Math.random()<ph?1:2):3}
        let p=null;if(b.u<0||!b.fate){balls.put(i,0,-50,0,.001);continue}
        const L1=b.fate===3?N_.miss:N_.grab,L2=b.fate===1?N_.win:b.fate===2?N_.drop:N_.miss.clone().setX(.9),L3=L2.clone().setX(L2.x+.75+.2);
        if(b.u<1)p=tmp.lerpVectors(N_.root,L1,b.u);else if(b.u<2)p=tmp.lerpVectors(L1,L2,b.u-1);else p=tmp.lerpVectors(L2,L3,Math.min(1,(b.u-2)/.6));
        balls.put(i,p.x,p.y,p.z+.22,b.u>2.4?(2.6-b.u)*5:1);balls.tint(i,b.fate===1?PAL.product.lime:b.fate===2?PAL.product.butter:PAL.product.strawberry)}balls.done();
      for(const k in N_)lN[k].at(tmp.set(ZT.x+N_[k].x-.44,TOP+N_[k].y,ZT.z+N_[k].z+.18));
      const mid=(A,B)=>tmp.set(ZT.x+(A.x+B.x)/2,TOP+(A.y+B.y)/2,ZT.z+A.z);
      lB.grab.at(mid(N_.root,N_.grab)).set(`<b>${fmt(pg,2)}</b>`);lB.miss.at(mid(N_.root,N_.miss)).set(`<b>${fmt(1-pg,2)}</b>`);lB.win.at(mid(N_.grab,N_.win)).set(`<b>${fmt(ph,2)}</b>`);lB.drop.at(mid(N_.grab,N_.drop)).set(`<b>${fmt(1-ph,2)}</b>`);
      lMul.at(tmp.set(ZT.x-.4,TOP+.3,ZT.z-.4)).set(`P(win) = ${fmt(pg,2)} × ${fmt(ph,2)}<b>= ${fmt(pg*ph,3)}</b>`);
      // ---- long-run bars
      const gk=s.plays+"|"+P.toFixed(4);const ymax=Math.max(.5,P*3),Yv=v=>Math.min(1.05,v/ymax)*GH;
      if(gk!==gKey){gKey=gk;const H=s.hist,Hn=H.length,n=Math.min(NG,Hn),span=Math.max(50,Hn),bw=GW/Math.max(n,50)*.72;
        for(let j=0;j<NG;j++){if(j>=n){bars.put(j,0,-50,0,.001);continue}const i=Math.round((j+1)/n*Hn)-1;const v=H[i],hgt=Math.max(.01,Yv(v)),x=GX0+(i+1)/span*GW;
          bars.putS(j,x,GY0+hgt/2,-.3,bw,hgt,.42);const off2=Math.min(1,Math.abs(v-P)/Math.max(.02,P));bars.tint(j,new THREE.Color(PAL.product.strawberry).lerp(new THREE.Color(PAL.product.lime),1-off2).getStyle())}bars.done()}
      theo.position.set(GX0+GW/2,GY0+Yv(P),-.3);theoSheet.position.copy(theo.position);
      lTheo.at(tmp.set(ZG.x+GX0+.05,TOP+GY0+Yv(P),ZG.z-.3)).set(`Theoretical<b>${fmt(P,3)}</b>`);
      const Hn=s.hist.length;lRF.show(zone==="graph"&&Hn>0);if(Hn){const v=s.hist[Hn-1];lRF.at(tmp.set(ZG.x+GX0+Hn/Math.max(50,Hn)*GW,TOP+GY0+Yv(v),ZG.z-.05)).set(`Relative frequency<b>${fmt(v,3)}</b><small>after ${fmt(s.plays)} plays</small>`)}
      lAxis.at(tmp.set(ZG.x,TOP+GY0-.1,ZG.z+.2)).set(Hn?"Number of plays →":"Press Play 100 or Play 1,000");
      // ---- value: the balance weighs one play's cost against its expected prize; towers stack what you've really spent and won
      const ret=P*s.prize,cost=s.cost,diff=ret-cost;const tilt=-S.clamp(diff/Math.max(cost,ret,.5),-1,1)*.3;
      beam.rotation.z=S.lerp(beam.rotation.z,tilt,S.REDUCED?1:.08);
      let ci=0;const coinAt=(x,y,z,f)=>{if(ci<NC){coins.putS(ci++,x,y,z,1,Math.max(.05,f),1)}};
      pans.forEach(pn=>{const ex=pn.sg*1.25,ca=Math.cos(beam.rotation.z),sa=Math.sin(beam.rotation.z);const hx2=BX+ex*ca,hy2=PIV+ex*sa;const py=hy2-1.05;pn.g.position.set(hx2,py,0);
        pn.w.forEach(({m,a:aa})=>{const rx=Math.cos(aa)*.4,rz=Math.sin(aa)*.4;const d=V3(rx,py+.03-hy2,rz);m.position.set(rx/2,(hy2-py)/2,rz/2);m.scale.set(1,d.length(),1);m.quaternion.setFromUnitVectors(V3(0,-1,0),d.normalize())});
        const val=pn.sg<0?cost:ret;let left=val;const offs=[[-.17,-.12],[.17,-.12],[-.17,.16],[.17,.16]];for(let st2=0;st2<4&&left>0;st2++)for(let c=0;c<10&&left>0;c++){const f=Math.min(1,left);coinAt(hx2+offs[st2][0],py+.05+c*.047+.0225*f,offs[st2][1],f);left-=1}});
      const spent=s.plays*s.cost,won=s.wins*s.prize,unit=[1,2,5,10,20,50,100,200,500,1000,2000,5000].find(u=>Math.max(spent,won)/u<=60)||10000;
      [[1.2,spent],[2.15,won]].forEach(([x,v])=>{const n=Math.min(70,Math.ceil(v/unit-1e-9));for(let c=0;c<n;c++)coinAt(x+Math.sin(c*1.7)*.012,.08+c*.047,Math.cos(c*1.3)*.012,1)});
      for(;ci<NC;ci++)coins.put(ci,0,-50,0,.001);coins.done();
      const pl=pans[0].g.position,pr2=pans[1].g.position;
      lCost.at(tmp.set(ZV.x+pl.x,TOP+pl.y+.1,ZV.z)).set(`Cost a play<b>${money(cost)}</b><small>1 coin = $1</small>`);
      lRet.at(tmp.set(ZV.x+pr2.x,TOP+pr2.y+.1,ZV.z)).set(`Expected prize<b>${money(ret)}</b><small>${fmt(P,3)} × $${fmt(s.prize,0)}</small>`);
      lEV.at(tmp.set(ZV.x+BX,TOP+PIV+.1,ZV.z)).set(`Expected value<b>${money(diff)} a play</b>`);
      lSpent.at(tmp.set(ZV.x+1.2,TOP+.1,ZV.z+.3)).set(`Spent<b>${money(spent)}</b><small>1 coin = $${fmt(unit)}</small>`);
      lWon.at(tmp.set(ZV.x+2.15,TOP+.1,ZV.z+.3)).set(`Prizes worth<b>${money(won)}</b><small>${won>=spent?"ahead":"behind"} ${money(Math.abs(won-spent))}</small>`);
      if(zone==="all"){[lTape,lGo,lPay,lGrip,lChute].forEach(l=>l.hide());}
    }};
}
const api=StudyKit.mount({kupu:KUPU,scene3d:claw3d,
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
