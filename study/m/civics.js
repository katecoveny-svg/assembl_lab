(()=>{
// ---------- model: fictional parties, real MMP rules
const ELECTORATES=71; // electorate seats (general + Māori)
// one neutral ink in six strengths, so no real party's colours are implied
const PARTIES=["Harbour","Summit","Forest","Tide","Plains","Lantern"].map((n,i)=>({n:n+" Party",o:[1,.78,.6,.45,.32,.2][i],c:"var(--ink)"}));
const s={vote:[34,30,11,9,7,4.5],elec:[40,27,3,1,0,0],gov:[true,false,false,true,false,false],stage:0,t:0};
function allocate(){
  const tot=Math.max(100,s.vote.reduce((a,b)=>a+b,0));const share=s.vote.map(v=>v/tot*100);
  const q=share.map((v,i)=>v>=5||s.elec[i]>=1);
  const seats=[0,0,0,0,0,0],quots=[];
  for(let k=0;k<120;k++){let best=-1,bv=-1;for(let i=0;i<6;i++){if(!q[i])continue;const v=share[i]/(2*seats[i]+1);if(v>bv){bv=v;best=i}}if(best<0)break;quots.push({i:best,v:bv,seat:k+1});seats[best]++}
  const final=seats.map((x,i)=>Math.max(x,s.elec[i]));const overhang=final.map((x,i)=>x-seats[i]);
  const total=final.reduce((a,b)=>a+b,0);
  const wasted=share.reduce((a,v,i)=>a+(q[i]?0:v),0)+Math.max(0,100-share.reduce((a,b)=>a+b,0));
  return{share,q,seats,final,overhang,total,list:final.map((x,i)=>x-s.elec[i]),quots,wasted};
}
function gov(){const A=allocate();const g=A.final.reduce((a,x,i)=>a+(s.gov[i]?x:0),0);return{g,need:Math.floor(A.total/2)+1,total:A.total,A}}
const STAGES=[["Introduced","A member puts the bill before Parliament"],["First reading","First debate and vote"],["Select committee","MPs study it and hear from the public, usually up to 6 months"],["Second reading","Debate on the committee's changes, then a vote"],["Committee of the whole House","Every clause debated, changes voted on"],["Third reading","Final debate and vote"],["Royal assent","The Governor-General signs it into law"]];

// ---------- chamber drawing: figure parts from the shared bench look (StudyKit.fig), peach for social studies
const FG=StudyKit.fig,PAL=FG.palette,TINT=PAL.case.peach,TDEEP=FG.deep(PAL.case.peach),AX="#8F9BAA";
const benchArcs=()=>{let g="";const rows=7,r0=66,r1=168;
  // the chamber floor, then seven tiers of benches: each a peach band with a darker riser in front
  g+=`<path d="M${320-r1-14},236 A${r1+14},${r1+14} 0 0 1 ${320+r1+14},236 Z" fill="${TINT}" fill-opacity=".32" stroke="${TDEEP}" stroke-width="1.1"/>`;
  for(let k=rows-1;k>=0;k--){const r=r0+k*(r1-r0)/(rows-1);
    g+=`<path d="M${320-r},236 A${r},${r} 0 0 1 ${320+r},236" fill="none" stroke="${TINT}" stroke-width="13" stroke-opacity=".75"/>`;
    g+=`<path d="M${320-r+6.5},236 A${r-6.5},${r-6.5} 0 0 1 ${320+r-6.5},236" fill="none" stroke="${TDEEP}" stroke-width="1.6" stroke-opacity=".55"/>`}
  // the well of the House, with the Table and the Speaker's chair
  g+=`<path d="M${320-r0+8},236 A${r0-8},${r0-8} 0 0 1 ${320+r0-8},236 Z" fill="#fff" fill-opacity=".55"/>`;
  return g};
function seatPositions(N){const rows=7,r0=66,r1=168,pos=[];
  const radii=[...Array(rows).keys()].map(k=>r0+k*(r1-r0)/(rows-1));const totR=radii.reduce((a,b)=>a+b,0);
  let left=N;radii.forEach((r,k)=>{let n=k===rows-1?left:Math.round(N*r/totR);n=Math.min(n,left);left-=n;
    for(let j=0;j<n;j++){const a=Math.PI*(n===1?0.5:j/(n-1));pos.push({x:320-Math.cos(a)*r,y:236-Math.sin(a)*r,a})}});
  return pos.sort((p,q)=>p.a-q.a);}
function drawMain(st0,st){
  const A=allocate(),G=gov();let o=FG.floor(640,330);
  // the chamber: a frosted peach case holding the tiered benches
  o+=FG.acrylic(128,40,384,214,{tint:TINT,d:14,r:16,shadowLen:70});
  o+=benchArcs();
  const order=[...Array(6).keys()].sort((i,j)=>(s.gov[j]-s.gov[i])||(A.final[j]-A.final[i]));
  const seq=[];order.forEach(i=>{for(let k=0;k<A.final[i];k++)seq.push({i,elec:k<s.elec[i]})});
  const pos=seatPositions(seq.length);
  const showSides=["govt","cabinet","bill","committee"].includes(st.k);
  seq.forEach((p,k)=>{const q=pos[k];if(!q)return;const col=PARTIES[p.i].c;
    const op=PARTIES[p.i].o;o+=`<circle cx="${q.x.toFixed(1)}" cy="${q.y.toFixed(1)}" r="5.6" fill="${p.elec?col:"var(--paper)"}" fill-opacity="${p.elec?op:1}" stroke="${col}" stroke-opacity="${op}" stroke-width="2"/>`;
    // a lit spot on each seat so they read as round chairs on the benches
    o+=`<circle cx="${(q.x-1.7).toFixed(1)}" cy="${(q.y-1.9).toFixed(1)}" r="1.5" fill="#fff" opacity="${p.elec?.5:.9}"/>`});
  o+=`<text class="t-big" x="320" y="222" text-anchor="middle">${A.total} seats</text><text class="t-lab" x="320" y="238" text-anchor="middle">${A.total>120?`120 + ${A.total-120} OVERHANG`:"NO OVERHANG"}</text>`;
  if(showSides)o+=`<text class="t-lab" x="110" y="262" text-anchor="middle">GOVERNMENT · ${G.g}</text><text class="t-lab" x="530" y="262" text-anchor="middle">OPPOSITION · ${A.total-G.g}</text>`;
  // legend
  PARTIES.forEach((P,i)=>{const x=16+(i%2)*320,y=290+Math.floor(i/2)*16;o+=`<circle cx="${x+5}" cy="${y-4}" r="5" fill="${P.c}" fill-opacity="${P.o}"/><text class="t-ink" x="${x+15}" y="${y}">${P.n.replace(" Party","")} ${A.share[i].toFixed(1)}% · ${A.final[i]}${s.gov[i]&&showSides?" · govt":""}</text>`});
  o+=`<text class="t-lab" x="16" y="22">FILLED = ELECTORATE SEAT · RING = LIST SEAT</text><text class="t-lab" x="624" y="22" text-anchor="end">FICTIONAL PARTIES</text>`;
  return o;
}
function drawClose(st0,st){
  const A=allocate(),G=gov();let o=FG.floor(420,260);
  if(["vote","threshold","electorate"].includes(st.k)){
    o+=`<text class="t-lab" x="14" y="22">HOW THE 120 SEATS ARE SHARED (SAINTE-LAGUË)</text>`;
    o+=FG.acrylic(6,34,392,174,{tint:TINT,d:12,r:12,shadowLen:40,balls:false});
    const cols=[["PARTY",14],["VOTE",150],["SEATS",204],["ELECT.",258],["LIST",312],["OVER",364]];
    cols.forEach(([h,x])=>o+=`<text class="t-lab" x="${x}" y="46">${h}</text>`);
    PARTIES.forEach((P,i)=>{const y=68+i*24,op=A.q[i]?1:.45;
      o+=`<g opacity="${op}"><circle cx="20" cy="${y-4}" r="5" fill="${P.c}" fill-opacity="${P.o}"/><text class="t-ink" x="30" y="${y}">${P.n}</text><text class="t-ink" x="150" y="${y}">${A.share[i].toFixed(1)}%</text>
        <text class="t-ink" x="204" y="${y}">${A.final[i]}</text><text class="t-ink" x="258" y="${y}">${s.elec[i]}</text><text class="t-ink" x="312" y="${A.list[i]<0?y:y}">${Math.max(0,A.list[i])}</text><text class="t-ink" x="364" y="${y}">${A.overhang[i]||""}</text></g>`;
      if(!A.q[i])o+=`<text class="t-lab" x="150" y="${y+11}">UNDER 5% AND NO ELECTORATE: NO SEATS</text>`});
    o+=`<text class="t-body" x="14" y="228">Each seat goes to the party with the highest vote ÷ (2 × seats so far + 1).</text>`;
    o+=`<text class="t-body" x="14" y="246">Wasted votes (parties with no seats): ${A.wasted.toFixed(1)}%</text>`;
    return o;
  }
  if(["govt","cabinet"].includes(st.k)){
    o+=`<text class="t-lab" x="14" y="22">IS THERE A MAJORITY?</text>`;
    const W=380,x0=20,y0=60;
    // the seat bar as a frosted peach rail; government seats are painted blocks standing in it
    o+=FG.acrylic(x0,y0,W,30,{tint:TINT,d:10,r:6,balls:false,shadowLen:36});
    let x=x0;PARTIES.forEach((P,i)=>{if(!s.gov[i])return;const w=A.final[i]/A.total*W;o+=`<rect x="${x}" y="${y0}" width="${w}" height="30" fill="${P.c}" fill-opacity="${P.o}" stroke="var(--paper)"/><path d="M${x},${y0} l10,-5.5 h${w} l-10,5.5z" fill="${P.c}" fill-opacity="${P.o*.55}" stroke="var(--paper)"/>`;x+=w});
    const mx=x0+G.need/A.total*W;o+=`<line x1="${mx}" x2="${mx}" y1="${y0-10}" y2="${y0+40}" stroke="var(--ink)" stroke-width="2"/><text class="t-ink" x="${mx}" y="${y0-14}" text-anchor="middle">${G.need} needed</text>`;
    const ok=G.g>=G.need;
    o+=`<text class="t-big" x="14" y="130">${ok?`Majority: ${G.g} of ${A.total} seats`:`No majority: ${G.g} of ${A.total} seats, ${G.need-G.g} short`}</text>`;
    o+=`<text class="t-body" x="14" y="156">${ok?"These parties can form a government and pass laws together.":"Add another party, or look for confidence and supply from one."}</text>`;
    o+=`<text class="t-body" x="14" y="200">The Prime Minister leads the biggest party in the government.</text><text class="t-body" x="14" y="220">Cabinet: the PM and senior ministers who make the big decisions.</text><text class="t-body" x="14" y="240">The Opposition: everyone else, led by the largest party not in government.</text>`;
    return o;
  }
  // bill journey
  o+=`<text class="t-lab" x="14" y="22">A FICTIONAL BILL: THE KERERŪ PROTECTION BILL</text>`;
  const pass=G.g>=G.need;const failAt=pass?99:1;
  STAGES.forEach((S,k)=>{const y=46+k*28,done=k<s.stage||(k===s.stage&&s.t>=1),cur=k===s.stage,fail=k>=failAt&&s.stage>=failAt;
    if(k<STAGES.length-1)o+=`<line x1="26" x2="26" y1="${y+6}" y2="${y+22}" stroke="${AX}" stroke-width="2"/>`;
    // each stage is a painted token: lime once passed, butter for the current stage, strawberry where it fails
    o+=FG.cyl(26,y-3,8,6,{colour:fail&&k===failAt?PAL.product.strawberry:done?PAL.product.lime:cur?PAL.product.butter:PAL.steel,kind:fail||done||cur?"painted":"metal",shadow:false});
    o+=`<text class="t-ink" x="44" y="${y+4}" style="font-weight:${cur?600:400}">${S[0]}</text><text class="t-lab" x="200" y="${y+4}">${S[1].toUpperCase().slice(0,38)}</text>`});
  if(!pass&&s.stage>=1)o+=`<text class="t-big" x="14" y="250" fill="var(--warn)">Voted down at first reading: ${G.g} for, ${A.total-G.g} against</text>`;
  else if(s.stage>=6&&s.t>=1)o+=`<text class="t-big" x="14" y="250">It's now an Act of Parliament: the law.</text>`;
  return o;
}
const bill=(x,dt,st)=>{s.t+=dt*0.6;if(s.t>=1){const G=gov();if(s.stage===1&&G.g<G.need){s.playing=false;s.t=1;return}if(s.stage<6){s.stage++;s.t=0}else{s.t=1;s.playing=false}}};
const steps=[
 {k:"vote",lab:"Party vote",cap:"You get two votes. The party vote decides how many of the 120 seats each party gets. Slide the votes and watch the chamber fill.",speed:0,controls:["v0","v1","v2","v3","v4","v5"],
  big:"<b>The big idea:</b> MMP (mixed member proportional) means a party's share of seats roughly matches its share of the party vote.",
  exam:"Under MMP each voter has two votes: an electorate vote for a local MP and a party vote. The party vote decides each party's share of the 120 seats, so a party with about 30% of the party vote gets about 30% of the seats.",
  trap:"Thinking the electorate vote decides the overall result. It's the party vote that sets each party's share.",chips:["total","wasted"]},
 {k:"threshold",lab:"The 5% rule",cap:"The Lantern Party has 4.5% and no electorate seat, so it gets nothing. Now give it one electorate seat and watch it bring list MPs in with it.",speed:0,controls:["v5","e5"],
  big:"<b>The big idea:</b> a party needs 5% of the party vote OR one electorate seat to share in the list seats.",
  exam:"A party only gets list seats if it wins at least 5% of the party vote or wins an electorate seat. A party on 4.5% with no electorate gets no seats, but if it wins one electorate it gets seats in proportion to its 4.5%.",
  trap:"Saying a party under 5% can never get into Parliament. Winning one electorate gets it in.",chips:["lantern","wasted"],onStep:()=>{s.vote[5]=4.5;s.elec[5]=0}},
 {k:"electorate",lab:"Electorates",cap:`${ELECTORATES} MPs win a local electorate. List seats top each party up to its fair share. If a party wins more electorates than its share, it keeps them: an overhang.`,speed:0,controls:["e0","e1","e2","e3","e4","e5"],
  big:"<b>The big idea:</b> electorate seats come first, list seats top up. Extra electorate wins make Parliament bigger than 120.",
  exam:"Parties keep every electorate seat they win, and list seats are added until each party reaches its share of the party vote. If a party wins more electorate seats than its share, it keeps them and Parliament has more than 120 MPs. This is called an overhang.",
  trap:"Adding electorate and list seats separately. List seats fill the gap between a party's fair share and its electorate seats.",chips:["total","elecsum"]},
 {k:"govt",lab:"Make a government",cap:"Tap parties to join the government. They need more than half the seats to pass laws and survive confidence votes.",speed:0,controls:["g0","g1","g2","g3","g4","g5"],
  big:"<b>The big idea:</b> under MMP one party rarely has a majority, so parties usually work together in a coalition or with a confidence and supply deal.",
  exam:"To form a government, a party or group of parties needs a majority of seats in Parliament, more than half. Because MMP rarely gives one party a majority, parties usually form a coalition or agree to confidence and supply.",
  trap:"Thinking the party with the most votes automatically forms the government. It needs a majority, often with partners.",chips:["govseats","need"]},
 {k:"cabinet",lab:"PM and Cabinet",cap:"The government's leader becomes Prime Minister and picks ministers. The biggest party outside government leads the Opposition.",speed:0,controls:["g0","g1","g2","g3","g4","g5"],
  big:"<b>The big idea:</b> Parliament makes laws; the Executive (PM, Cabinet and ministers) runs the country; the courts apply the law. That's the separation of powers.",
  exam:"The Prime Minister leads the government and chooses ministers, who are responsible for areas like health and education. The most senior ministers form Cabinet, which makes the government's main decisions. The Opposition questions and challenges the government.",
  trap:"Mixing up Parliament and the government. Parliament is all 120-plus MPs; the government is the parties with the majority.",chips:["govseats","oppseats"]},
 {k:"bill",lab:"A bill becomes law",cap:"Press Play to send a fictional bill through Parliament. It needs a majority at each reading. Try it with and without a majority.",speed:1,speedLabel:"one stage every ≈ 1.7 s",controls:["play","restart","g0","g1","g2","g3","g4","g5"],
  big:"<b>The big idea:</b> a bill goes through three readings and a select committee, then the Governor-General's Royal assent makes it an Act: the law.",
  exam:"A bill becomes law after it passes a first reading, is studied by a select committee, passes a second reading, is debated clause by clause in the committee of the whole House, and passes a third reading. It then receives Royal assent from the Governor-General and becomes an Act.",
  trap:"Leaving out the Governor-General. A bill isn't law until it gets Royal assent.",chips:["stage","govseats"],onStep:()=>{s.stage=0;s.t=0}},
 {k:"committee",lab:"Have your say",cap:"At select committee anyone, including you, can send a submission about a bill and sometimes speak to the MPs in person.",speed:0,controls:["restart"],
  big:"<b>The big idea:</b> select committees are the main way ordinary people take part in law-making between elections.",
  exam:"Citizens can participate in law-making by making a submission to a select committee. The committee hears submissions from the public and experts, and can recommend changes to the bill before it goes back to Parliament.",
  trap:"Thinking you have to be 18 to make a submission. Anyone can make one.",chips:["stage"],onStep:()=>{s.stage=2;s.t=0.5}},
 {k:"test",lab:"Test yourself",cap:"Set up each one with the sliders and party buttons, then press Check. The machine counts seats with the real MMP rules.",speed:0,controls:["v5","e5","g0","g1","g2","g3","g4","g5"],
  big:"<b>Exam tip:</b> name the rule (5% threshold, overhang, majority), then explain what it does to the result.",
  chips:["total","govseats","need","lantern"]}
];
const ctl=[{type:"play"},{type:"button",id:"restart",label:"Restart bill",onClick:()=>{s.stage=0;s.t=0}}];
PARTIES.forEach((P,i)=>{ctl.push({type:"range",id:"v"+i,label:P.n.replace(" Party","")+" vote",min:0,max:50,step:0.5,get:()=>s.vote[i],set:(x,v)=>{s.vote[i]=v},fmt:()=>s.vote[i].toFixed(1)+"%"})});
PARTIES.forEach((P,i)=>{ctl.push({type:"range",id:"e"+i,label:P.n.replace(" Party","")+" electorates",min:0,max:50,step:1,get:()=>s.elec[i],set:(x,v)=>{s.elec[i]=v},fmt:()=>String(s.elec[i])})});
PARTIES.forEach((P,i)=>{ctl.push({type:"toggle",id:"g"+i,label:P.n,get:()=>s.gov[i],set:(x,v)=>{s.gov[i]=v}})});
// ---- kupu Māori: te reo terms for this machine, each checked in Te Aka Māori Dictionary (ta = word id). Sources and notes: te-reo-notes.md
const KUPU=[
 {mi:"manapori",en:"democracy",ta:11071},
 {mi:"Pāremata",en:"Parliament",ta:5295},
 {mi:"pōti",en:"to vote; a vote, an election",ta:5918},
 {mi:"rōpū tōrangapū",en:"political party",ta:6909},
 {mi:"rohe pōti",en:"electorate",ta:6860,chip:"elecsum"},
 {mi:"Pirimia",en:"Prime Minister",ta:5645},
 {mi:"rūnanga o te kāwanatanga",en:"Cabinet",ta:13091},
 {mi:"pire",en:"bill (a proposed law)",ta:13133}];
Object.entries({"vote": ["pōti", "rōpū tōrangapū", "Pāremata"], "threshold": ["rōpū tōrangapū"], "electorate": ["rohe pōti", "pōti"], "govt": ["manapori"], "cabinet": ["Pirimia", "rūnanga o te kāwanatanga"], "bill": ["pire", "Pāremata"]}).forEach(([k,a])=>{const st=steps.find(x=>x.k===k);if(st)st.kupu=a});
StudyKit.mount({kupu:KUPU,
  eyebrow:"Social studies · Civics", title:"The MMP and law machine", crumb:"Year 9–10 social studies · civics: how government is formed and how a law is passed", homeHash:"y9",
  fig:"FIG. 04 · THE DEBATING CHAMBER", railTitle:"How Aotearoa chooses and makes its laws",
  mainBox:"0 0 640 330", mainPhoneBig:true, mainLabel:"Seats in Parliament coloured by fictional parties", closeBox:"0 0 420 260",
  state:s, steps, controls:ctl, tick:bill, drawMain, drawClose,
  chips:()=>{const A=allocate(),G=gov(),es=s.elec.reduce((a,b)=>a+b,0);return{
    total:["SEATS",`${A.total}${A.total>120?" (overhang)":""}`,true],wasted:["WASTED VOTE",A.wasted.toFixed(1)+"%"],lantern:["LANTERN",`${A.share[5].toFixed(1)}% · ${A.final[5]} seats`],
    elecsum:["ELECTORATES",`${es} of ${ELECTORATES}`,es!==ELECTORATES],govseats:["GOVERNMENT",G.g+" seats",G.g>=G.need],need:["MAJORITY",G.need+" needed"],oppseats:["OPPOSITION",(A.total-G.g)+" seats"],
    stage:["STAGE",STAGES[Math.min(6,s.stage)][0],true]}},
  challenges:[
    {q:"Get the Lantern Party into Parliament without raising its party vote above 4.9%.",check:()=>{const A=allocate();return s.vote[5]<5&&A.final[5]>0},ok:"Yes: winning an electorate seat gets a party past the threshold, so its party vote counts.",no:"Not yet. Keep its vote under 5% and find another way in."},
    {q:"Make an overhang so Parliament has more than 120 seats.",check:()=>allocate().total>120,ok:()=>`Yes: ${allocate().total} seats. A party won more electorates than its party vote entitles it to and keeps them.`,no:"Not yet. Give a small party more electorate seats than its party vote would earn."},
    {q:"Form a government with the smallest number of parties that still has a majority.",check:()=>{const G=gov();if(G.g<G.need)return false;const A=G.A;const n=s.gov.filter(Boolean).length;
      // any smaller combination with a majority?
      for(let m=0;m<64;m++){const c=[...Array(6).keys()].filter(i=>m>>i&1);if(c.length>=n)continue;if(c.reduce((a,i)=>a+A.final[i],0)>=G.need)return false}return true},
     ok:"Yes: a majority with as few partners as possible.",no:()=>{const G=gov();return G.g<G.need?`Not yet: ${G.g} seats, ${G.need} needed.`:"That works, but you could do it with fewer parties."}}],
  papers:[{label:"Electoral Commission: how MMP works",url:"https://vote.nz/"},{label:"Parliament: how a bill becomes law",url:"https://www.parliament.nz/"}],
  truth:"The parties and their votes are made up. Seat counting follows MMP's rules: 120 seats (71 electorates and 49 list seats in 2026), the 5% or one-electorate threshold, Sainte-Laguë allocation and overhang. Real elections have more detail, such as electorates won by independents.",
  footer:"Civics, including how New Zealand's government is formed and how a law is passed, is Year 9 social sciences content in the refreshed curriculum. This machine is non-partisan and does not represent any real party."
});
})();
