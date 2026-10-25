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
// ---------- the 3D bench: the party-vote tower of ballot coins with the 5% gate, a debating chamber whose seats fill by the MMP count,
// a Beehive cutaway with the Cabinet table, and a track the bill travels along. All of it reads allocate()/gov() and the same state.
function civics3d(S){const {THREE,mat}=S;const P3=S.PAL;const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
  const ZV=V3(-8.6,0,-.6),ZH=V3(0,0,-.6),ZK=V3(8.4,0,-.6),TZ=5.0,TOP=.3;
  const plinth=(c,w,d,tint)=>{const p=S.rbox(w,.3,d,.12,mat("plastic",tint,{rough:.55,coat:.2}));p.position.set(c.x,.15,c.z);S.scene.add(p);return p};
  plinth(ZV,6.6,4.2,P3.case.lavender);plinth(ZH,7.2,5.2,P3.case.peach);plinth(ZK,4.8,4.6,P3.case.lavender);plinth(V3(0,0,TZ),17.4,2.4,P3.case.mint);
  const glowM=(c,i=0)=>new THREE.MeshStandardMaterial({color:new THREE.Color(c),emissive:new THREE.Color(c),emissiveIntensity:i,roughness:.4});
  const INKC=new THREE.Color(P3.ink),WHITE=new THREE.Color("#ffffff");
  const shade=i=>WHITE.clone().lerp(INKC,PARTIES[i].o);                     // the party's navy shade (no real party colours)
  const shadeHex=i=>"#"+shade(i).getHexString();
  const short=i=>PARTIES[i].n.replace(" Party","");
  // ---------------------------------------------------------------- the party vote: one ballot coin per 1% in six towers, the 5% gate across them
  const vz=S.group();vz.position.set(ZV.x,TOP,ZV.z);
  const CH=.05,CX=i=>(i-2.5)*.95;
  vz.add(S.rbox(6.0,.08,1.1,.04,mat("plastic","#ffffff",{rough:.4}),{at:[0,.04,.2]}));
  const coins=S.swarm(330,new THREE.CylinderGeometry(.24,.24,CH*.82,28),mat("plastic","#ffffff",{rough:.32,coat:.8}),{colors:true,cast:true});coins.castShadow=true;vz.add(coins);
  const gate=S.box(5.9,.02,1.0,mat("acrylic",P3.product.butter,{opacity:.3}),{cast:false});gate.position.set(0,.08+5*CH,.2);gate.renderOrder=4;vz.add(gate);vz.add(S.box(5.9,.03,.03,glowM("#F2C83C",1.4),{at:[0,.08+5*CH,.7],cast:false}));
  const knobs=PARTIES.map((P,i)=>{const k=S.sphere(.11,mat("plastic",P3.product.butter,{rough:.3}),{at:[CX(i),.2,.2]});vz.add(k);
    S.dragger(k,{move:p=>{const l=vz.worldToLocal(p.clone());s.vote[i]=Math.round(S.clamp((l.y-.08)/CH,0,50)*2)/2}});return k});
  const vLab=PARTIES.map((P,i)=>S.label({off:[0,i%2?78:26],lead:false}));
  const lGate=S.label({cls:"hot",off:[-30,-8]}),lWaste=S.label({off:[30,-20]}),lDragV=S.label({cls:"hot",off:[24,-24]}).set("Drag a coin tower");
  const coinCount=new Array(6).fill(0);
  // ---------------------------------------------------------------- the debating chamber: seven tiers, a pawn on every seat (filled = electorate, collar = list)
  const ch=S.group();ch.position.set(ZH.x,TOP,ZH.z+.9);
  const ROWS=7,R0=1.05,R1=2.75,TIER=.1,rad=k=>R0+k*(R1-R0)/(ROWS-1);
  for(let k=ROWS-1;k>=0;k--){const r=rad(k),sh=new THREE.Shape();sh.absarc(0,0,r+.13,0,Math.PI,false);sh.absarc(0,0,r-.13-(k===0?0:0),Math.PI,0,true);
    const g=new THREE.ExtrudeGeometry(sh,{depth:(k+1)*TIER,bevelEnabled:false,curveSegments:48});g.rotateX(-Math.PI/2);
    ch.add(S.mesh(g,mat("plastic",k%2?"#F6E2D2":"#FBEDE2",{rough:.5})))}
  const floorSh=new THREE.Shape();floorSh.absarc(0,0,R0-.13,0,Math.PI,false);floorSh.lineTo(-(R0-.13),0);
  {const g=new THREE.ExtrudeGeometry(floorSh,{depth:.03,bevelEnabled:false,curveSegments:40});g.rotateX(-Math.PI/2);ch.add(S.mesh(g,mat("plastic","#BFE8D6",{rough:.6})))}
  ch.add(S.rbox(.7,.16,.3,.04,mat("plastic","#C9A27E",{rough:.45}),{at:[0,.08,-.45]}));                     // the Table
  const spk=S.group(ch);spk.position.set(0,0,.25);spk.add(S.rbox(.36,.08,.3,.04,mat("plastic","#C9A27E"),{at:[0,.04,0]}));spk.add(S.rbox(.28,.5,.08,.04,mat("plastic",P3.case.mint),{at:[0,.3,.12]}));
  ch.add(S.cyl(.02,.02,.5,mat("metal","#D8B16A"),{at:[.22,.25,-.45],rot:[0,0,Math.PI/2.2]}));                 // the Mace on the Table
  const NMAX=320;
  const body=S.swarm(NMAX,new THREE.CylinderGeometry(.055,.075,.17,16),mat("plastic","#ffffff",{rough:.35}),{colors:true,cast:true});body.castShadow=true;ch.add(body);
  const head=S.swarm(NMAX,new THREE.SphereGeometry(.055,14,10),mat("plastic","#ffffff",{rough:.3}),{colors:true});ch.add(head);
  const collar=S.swarm(NMAX,new THREE.TorusGeometry(.074,.022,8,20),mat("plastic","#ffffff",{rough:.3}),{colors:true});ch.add(collar);
  const govDisc=S.swarm(NMAX,new THREE.CylinderGeometry(.11,.11,.012,18),mat("plastic",P3.product.lime,{rough:.5}),{colors:true});ch.add(govDisc);
  const seat=[];for(let i=0;i<NMAX;i++)seat.push({p:-1,e:false,x:0,z:0,y:0,tx:0,tz:0,ty:0,drop:1,on:false});
  let posN=-1,posCache=[];
  function seatPos3(N){if(N===posN)return posCache;posN=N;const radii=[...Array(ROWS).keys()].map(rad);const totR=radii.reduce((a,b)=>a+b,0);const pos=[];let left=N;
    radii.forEach((r,k)=>{let n=k===ROWS-1?left:Math.round(N*r/totR);n=Math.min(n,left);left-=n;for(let j=0;j<n;j++){const a=Math.PI*(n===1?.5:j/(n-1));pos.push({x:-Math.cos(a)*r,z:-Math.sin(a)*r,y:(k+1)*TIER,a})}});
    posCache=pos.sort((p,q)=>p.a-q.a);return posCache}
  const gateM=glowM(P3.product.butter,1.2),majGate=S.box(.03,.4,.4,gateM,{cast:false});ch.add(majGate);
  S.pick(body,h=>{const id=h.instanceId;if(id==null)return;const p=seat[id].p;if(p<0)return;const k=S.api.step.k;if(["govt","cabinet","bill","test"].includes(k))s.gov[p]=!s.gov[p]});
  const lSeats=S.label({cls:"big",off:[0,40],lead:false}),lGov=S.label({cls:"hot",off:[-30,-30]}),lOpp=S.label({off:[30,-30]}),lMaj=S.label({off:[0,-40]}),lTapP=S.label({cls:"hot",off:[24,28]}).set("Tap an MP to change sides");
  const pLab=PARTIES.map(()=>S.label({off:[0,-30]}));
  // ---------------------------------------------------------------- the Beehive, cut away, with the Cabinet table inside
  const bh=S.group();bh.position.set(ZK.x,TOP,ZK.z);const CUT=Math.PI*.7,ROT=CUT/2-1.15;
  const floors=10;for(let f=0;f<floors;f++){if(f===5)continue;const r=1.55-f*.06,y=f*.3;
    const slab=S.mesh(new THREE.CylinderGeometry(r+.06,r+.06,.05,64,1,false,0,Math.PI*2-CUT),mat("plastic",f%2?"#F1EBFA":"#E6DCF5",{rough:.4}));slab.position.y=y+.025;slab.rotation.y=ROT;bh.add(slab);
    const band=S.mesh(new THREE.CylinderGeometry(r,r,.25,64,1,true,0,Math.PI*2-CUT),mat("acrylic",P3.case.lavender,{opacity:.1}),{cast:false});band.position.y=y+.175;band.rotation.y=ROT;band.renderOrder=3;bh.add(band);
  }
  {const dome=S.mesh(new THREE.SphereGeometry(1.0,48,16,0,Math.PI*2,0,Math.PI/2),mat("plastic","#ffffff",{rough:.35}));dome.scale.set(1,.28,1);dome.position.y=floors*.3;bh.add(dome)}
  const CF=4,cabY=CF*.3+.05;bh.add(S.cyl(.55,.55,.06,mat("plastic","#C9A27E",{rough:.45}),{at:[0,cabY+.22,.15],seg:48}));bh.add(S.cyl(.06,.1,.2,mat("plastic","#C9A27E"),{at:[0,cabY+.1,.15]}));
  const NCAB=12,cab=S.swarm(NCAB+1,new THREE.CylinderGeometry(.05,.07,.16,16),mat("plastic","#ffffff",{rough:.35}),{colors:true,cast:true});bh.add(cab);
  const cabH=S.swarm(NCAB+1,new THREE.SphereGeometry(.05,14,10),mat("plastic","#ffffff",{rough:.3}),{colors:true});bh.add(cabH);
  const sash=S.torus(.072,.022,mat("plastic",P3.product.butter,{rough:.3}),{rot:[Math.PI/2,0,0]});bh.add(sash);
  const lPM=S.label({cls:"hot",off:[30,-30]}),lCab=S.label({off:[-34,-20]}),lBee=S.label({off:[0,-30],lead:false}).set("The Beehive<small>the Executive: Prime Minister and ministers</small>"),lOppL=S.label({off:[0,-34]});
  // ---------------------------------------------------------------- the bill's journey: seven stations on a track
  const tr=S.group();tr.position.set(0,TOP,TZ);
  const SX=k=>-7+k*(14/6);const stn=[];
  tr.add(S.tube([[-7.6,.05,0],[7.6,.05,0]],.05,mat("metal",P3.steel),{seg:8}));
  for(let k=0;k<7;k++){const g=S.group(tr);g.position.x=SX(k);const padM=mat("plastic",P3.steel,{fresh:true,rough:.35});const pad=S.cyl(.42,.46,.1,padM,{at:[0,.05,0],seg:40});g.add(pad);
    if([1,3,4,5].includes(k)){for(let r=0;r<3;r++)g.add(S.torus(.32-r*.06,.03,mat("plastic","#F6E2D2",{rough:.5}),{at:[0,.12+r*.05,-.1],rot:[Math.PI/2,0,0],arc:Math.PI}))}
    if(k===2){const room=S.acrylicCase(1.1,.7,.8,P3.case.sky,{opacity:.14});room.position.set(0,.1,-.1);g.add(room);
      const hs=S.mesh(new THREE.TorusGeometry(.26,.05,10,32,Math.PI),mat("plastic","#C9A27E",{rough:.45}));hs.rotation.x=Math.PI/2;hs.position.set(0,.3,-.15);g.add(hs)}
    if(k===6){g.add(S.rbox(.8,.42,.5,.04,mat("plastic","#ffffff",{rough:.4}),{at:[0,.31,-.15]}));const rf=S.mesh(new THREE.CylinderGeometry(.34,.34,.9,3),mat("plastic",P3.case.blush,{rough:.4}),{rot:[-Math.PI/2,0,0]});rf.rotation.z=Math.PI/2;rf.scale.set(1,1,.45);rf.position.set(0,.62,-.15);g.add(rf)}
    stn.push({g,padM,lab:S.label({off:[0,k%2?54:28],lead:false}).set(STAGES[k][0])})}
  // the committee members and a submitter (that could be you) in the room
  const cm=S.swarm(7,new THREE.CylinderGeometry(.04,.055,.12,12),mat("plastic","#ffffff",{rough:.35}),{colors:true});stn[2].g.add(cm);
  for(let i=0;i<6;i++){const a=Math.PI*(i+.5)/6;cm.put(i,-Math.cos(a)*.3,.22+.09,-.15-Math.sin(a)*.3,1.5);cm.tint(i,shadeHex(i%6))}cm.put(6,0,.31,.22,1.6);cm.tint(6,P3.product.peach);cm.done();
  const papers=S.swarm(10,new THREE.BoxGeometry(.07,.004,.095),mat("plastic","#ffffff",{rough:.6}));stn[2].g.add(papers);
  const billG=S.group(tr);const scroll=S.cyl(.09,.09,.42,mat("plastic","#ffffff",{rough:.35}),{rot:[0,0,Math.PI/2],seg:24});billG.add(scroll);
  const band=S.cyl(.095,.095,.1,mat("plastic",P3.product.butter,{fresh:true,rough:.3}),{rot:[0,0,Math.PI/2],seg:24});billG.add(band);
  S.pick(billG,()=>{s.playing=!s.playing});
  const sparks=S.puffs(24,"#FFD76A",{additive:true});tr.add(sparks);const spk2=Array.from({length:24},()=>({x:0,y:0,z:0,vx:0,vy:0,l:0}));let lastDone=-1;
  const lBill=S.label({cls:"hot big",off:[26,-46]}),lVote=S.label({off:[-30,-30]});

  // ---------------------------------------------------------------- views
  S.view("vote",[-4.6,8.2,13.4],[-4.6,.7,-.3],{min:3,max:34});
  S.view("threshold",[ZV.x+.6,3.6,ZV.z+6.6],[ZV.x,1.0,ZV.z],{min:2,max:24});
  S.view("chamber",[ZH.x,6.0,ZH.z+7.4],[ZH.x,.4,ZH.z+.2],{min:2,max:24});
  S.view("cabinet",[ZK.x-3.6,5.4,ZK.z+8.6],[ZK.x-2.2,1.1,ZK.z],{min:2,max:24});
  S.view("bill",[0,7.2,TZ+12.6],[0,.3,TZ-.9],{min:3,max:30});
  S.view("committee",[SX(2)+.5,2.7,TZ+4.0],[SX(2),.45,TZ-.1],{min:1.5,max:20});
  S.view("all",[0,13,21],[0,.6,1.6],{min:5,max:50});
  const viewOf=k=>({vote:"vote",threshold:"threshold",electorate:"chamber",govt:"chamber",cabinet:"cabinet",bill:"bill",committee:"committee",test:"all"})[k]||"all";
  const half={vote:9,threshold:4,chamber:5,cabinet:5,bill:9,committee:3,all:13},ctr={vote:[-4.3,0,-.6],threshold:[ZV.x,0,ZV.z],chamber:[0,0,0],cabinet:[ZK.x,0,ZK.z],bill:[0,0,TZ],committee:[SX(2),0,TZ],all:[0,0,1.5]};
  let first=true;const tmp=V3(0,0,0);
  return {
    step(st){const v=viewOf(st.k);S.goView(v,first);first=false;S.setShadowBox(half[v],ctr[v])},
    update(s3,st,dt,t){const k=st.k,A=allocate(),G=gov(),over=k==="test";
      // ---- coins
      let ci=0;for(let i=0;i<6;i++){const v=s.vote[i],n=Math.ceil(v-1e-6),c=shade(i),wasted=!A.q[i];
        for(let j=0;j<n&&ci<330;j++){const frac=Math.min(1,v-j);const wob=0;coins.putS(ci,CX(i)+wob,.08+(j+.5)*CH*(j===n-1?1:1),.2,1,frac,1);coins.tint(ci,wasted?(j%2?"#F3B8C8":"#F7CBD7"):j%2?c:c.clone().lerp(WHITE,.12));ci++}
        knobs[i].position.set(CX(i),.08+v*CH+.14,.2);
        vLab[i].at(tmp.set(vz.position.x+CX(i),TOP,vz.position.z+.75)).set(`${short(i)}<b>${A.share[i].toFixed(1)}%</b><small>${A.final[i]} seats</small>`).cls(wasted?"hot":"")}
      for(;ci<330;ci++)coins.put(ci,0,-9,0,0);coins.done();
      const showV=["vote","threshold","test"].includes(k);vLab.forEach(l=>l.show(showV&&!over));
      lGate.at(tmp.set(vz.position.x-2.95,TOP+.08+5*CH,vz.position.z+.2)).set("5% threshold<small>or win one electorate</small>").show(showV&&!over||k==="threshold");
      lWaste.at(tmp.set(vz.position.x+2.2,TOP+.6,vz.position.z+.2)).set(`Wasted vote<b>${A.wasted.toFixed(1)}%</b>`).show(showV&&!over);
      lDragV.at(tmp.set(vz.position.x+CX(0),TOP+.08+s.vote[0]*CH+.2,vz.position.z+.2)).show(k==="vote"&&t<30);
      knobs.forEach(kb=>kb.visible=showV);
      // ---- seats
      const order=[...Array(6).keys()].sort((i,j)=>(s.gov[j]-s.gov[i])||(A.final[j]-A.final[i]));
      const seq=[];order.forEach(i=>{for(let q=0;q<A.final[i];q++)seq.push({i,e:q<s.elec[i]})});
      const N=Math.min(NMAX,seq.length),pos=seatPos3(N);const sides=["govt","cabinet","bill","committee","test"].includes(k);
      for(let q=0;q<NMAX;q++){const z=seat[q];if(q<N){const w=seq[q],p=pos[q];if(z.p!==w.i||z.e!==w.e||!z.on){z.p=w.i;z.e=w.e;z.drop=S.REDUCED?1:0;if(!z.on){z.x=p.x;z.z=p.z}z.on=true}
          z.x=S.lerp(z.x,p.x,.12);z.z=S.lerp(z.z,p.z,.12);z.drop=Math.min(1,z.drop+dt*2.2);const e=z.drop>=1?1:bounce3(z.drop);const y=p.y+(1-e)*1.4;
          const c=shade(w.i);body.put(q,z.x,y+.085,z.z,1);head.put(q,z.x,y+.23,z.z,1);body.tint(q,w.e?c:WHITE);head.tint(q,w.e?c:WHITE);
          if(w.e)collar.put(q,0,-9,0,0);else{collar.put(q,z.x,y+.12,z.z,1,Math.PI/2);collar.tint(q,c)}
          if(sides&&s.gov[w.i]){govDisc.put(q,z.x,p.y+.006,z.z,1);govDisc.tint(q,P3.product.lime)}else govDisc.put(q,0,-9,0,0)}
        else{if(z.on){z.on=false;z.p=-1}body.put(q,0,-9,0,0);head.put(q,0,-9,0,0);collar.put(q,0,-9,0,0);govDisc.put(q,0,-9,0,0)}}
      body.done();head.done();collar.done();govDisc.done();
      // the majority gate stands between the last seat a government needs and the next
      majGate.visible=sides&&N>1;if(majGate.visible){const a=Math.PI*Math.min(1,(G.need-.5)/N),r=(R0+R1)/2;majGate.position.set(-Math.cos(a)*r,.55,-Math.sin(a)*r);majGate.scale.set(1,1,(R1-R0+.4)/.4);majGate.rotation.y=Math.atan2(-Math.cos(a),-Math.sin(a));
        gateM.emissiveIntensity=G.g>=G.need?1.6+.6*Math.sin(t*4):.6;gateM.color.set(G.g>=G.need?P3.product.lime:P3.product.strawberry);gateM.emissive.set(gateM.color)}
      const chW=ch.position;lSeats.at(tmp.set(chW.x,TOP+.1,chW.z+.3)).set(`${A.total} seats<small>${A.total>120?`120 + ${A.total-120} overhang`:"no overhang"} · filled = electorate · collar = list</small>`).show(!over&&["vote","electorate","govt"].includes(k));
      lGov.at(tmp.set(chW.x-2.4,TOP+.6,chW.z-.6)).set(`Government<b>${G.g} seats</b>`).show(sides&&!over&&k!=="committee"&&k!=="cabinet");
      lOpp.at(tmp.set(chW.x+2.4,TOP+.6,chW.z-.6)).set(`Opposition<b>${A.total-G.g} seats</b>`).show(sides&&!over&&k!=="committee"&&k!=="cabinet");
      lMaj.at(tmp.set(majGate.position.x+chW.x,TOP+1.0,majGate.position.z+chW.z)).set(G.g>=G.need?`Majority<b>${G.g} ≥ ${G.need}</b>`:`No majority<b>${G.need-G.g} short of ${G.need}</b>`).cls(G.g>=G.need?"":"hot").show(k==="govt");
      lTapP.at(tmp.set(chW.x+1.2,TOP+.9,chW.z-2.4)).show(k==="govt"&&t<40);
      // per-party electorate and list counts (electorate step)
      const mid={};seq.forEach((w,q)=>{if(q<N){(mid[w.i]=mid[w.i]||[]).push(q)}});
      PARTIES.forEach((P,i)=>{const arr=mid[i];const show=k==="electorate"&&arr&&arr.length>0;pLab[i].show(!!show);if(!show)return;const q=arr[arr.length>>1],p=pos[q];pLab[i].off=[p.x<0?-22:22,i%2?20:-30];
        pLab[i].at(tmp.set(chW.x+p.x,TOP+p.y+.4,chW.z+p.z)).set(`${short(i)} ${A.final[i]}<small>${s.elec[i]} electorate + ${Math.max(0,A.list[i])} list${A.overhang[i]?` · ${A.overhang[i]} overhang`:""}</small>`).cls(A.overhang[i]?"hot":"")});
      // ---- Beehive: the Cabinet table
      const gp=[...Array(6).keys()].filter(i=>s.gov[i]).sort((i,j)=>A.final[j]-A.final[i]);const gs=gp.reduce((a,i)=>a+A.final[i],0);
      const chairs=[];if(gs>0){const quota=gp.map(i=>A.final[i]/gs*NCAB),fl=quota.map(Math.floor);let left=NCAB-fl.reduce((a,b)=>a+b,0);quota.map((q,j)=>[q-fl[j],j]).sort((a,b)=>b[0]-a[0]).forEach(([_,j])=>{if(left>0){fl[j]++;left--}});gp.forEach((i,j)=>{for(let q=0;q<fl[j];q++)chairs.push(i)})}
      for(let q=0;q<=NCAB;q++){if(q===0&&gp.length){const x=0,z=.15-.72;cab.putS(0,x,cabY+.1,z,1.15,1.35,1.15);cabH.put(0,x,cabY+.27,z,1.1);cab.tint(0,shade(gp[0]));cabH.tint(0,shade(gp[0]));sash.visible=true;sash.position.set(x,cabY+.19,z)}
        else if(q>0&&chairs[q-1]!=null){const a=-Math.PI/2+q/(NCAB+1)*Math.PI*2,x=Math.cos(a)*.72,z=.15+Math.sin(a)*.72;cab.put(q,x,cabY+.08,z,1);cabH.put(q,x,cabY+.21,z,1);cab.tint(q,shade(chairs[q-1]));cabH.tint(q,shade(chairs[q-1]))}
        else{cab.put(q,0,-9,0,0);cabH.put(q,0,-9,0,0);if(q===0)sash.visible=false}}cab.done();cabH.done();
      const showK=k==="cabinet";lPM.at(tmp.set(bh.position.x,TOP+cabY+.35,bh.position.z+.15-.72)).set(gp.length?`Prime Minister<small>leader of the ${PARTIES[gp[0]].n}</small>`:"No government yet<small>tap parties to join it</small>").show(showK);
      lCab.at(tmp.set(bh.position.x-.6,TOP+cabY+.3,bh.position.z+.4)).set("Cabinet<small>senior ministers make the big decisions</small>").show(showK&&gp.length>0);lBee.at(tmp.set(bh.position.x,TOP+3.3,bh.position.z)).show(showK);
      const opp=[...Array(6).keys()].filter(i=>!s.gov[i]&&A.final[i]>0).sort((i,j)=>A.final[j]-A.final[i])[0];
      lOppL.at(tmp.set(chW.x+1.9,TOP+.5,chW.z-1.4)).set(opp!=null?`Leader of the Opposition<small>${PARTIES[opp].n}</small>`:"No Opposition").show(showK);
      // ---- the bill
      const pass=G.g>=G.need,failAt=pass?99:1,stg=Math.min(6,s.stage);
      stn.forEach((o,q)=>{const done=q<s.stage||(q===s.stage&&s.t>=1),cur=q===s.stage,fail=q===failAt&&s.stage>=failAt;o.padM.color.set(fail?P3.product.strawberry:done?P3.product.lime:cur?P3.product.butter:P3.steel);o.padM.metalness=fail||done||cur?0:.6;o.lab.at(tmp.set(SX(q),TOP,TZ+.55)).cls(cur?"hot":"").show(["bill","committee","test"].includes(k)&&!over&&(k==="bill"||q===2))});
      const e=S.ease(Math.min(1,s.t*1.6)),from=stg===0?SX(0):SX(stg-1),to=SX(stg),bx=S.lerp(from,to,stg===0?1:e);const failed=!pass&&s.stage>=1&&s.t>=1&&s.stage===1;
      const inRoom=stg===2&&k==="committee";billG.position.set(bx,inRoom?.66:.32+Math.sin(Math.PI*(stg===0?0:e))*.6+(S.REDUCED?0:Math.sin(t*3)*.02),inRoom?-.15:0);billG.rotation.set(0,0,failed?1.2:0);
      band.material.color.set(failed?P3.product.strawberry:stg===6&&s.t>=1?P3.product.lime:P3.product.butter);
      const doneNow=s.stage*2+(s.t>=1?1:0);if(doneNow!==lastDone){if(lastDone>=0&&!S.REDUCED&&!failed&&doneNow>lastDone)for(const p of spk2){p.x=bx;p.y=.4;p.z=0;p.vx=(Math.random()-.5)*2;p.vy=1+Math.random()*1.5;p.l=.9}lastDone=doneNow}
      for(let q=0;q<24;q++){const p=spk2[q];if(p.l>0){p.l-=dt;p.vy-=4*dt;p.x+=p.vx*dt;p.y+=p.vy*dt}sparks.put(q,p.x,p.y,p.z,Math.max(0,p.l),200)}sparks.done();
      const showB=k==="bill"||k==="committee"||over;
      lBill.at(tmp.set(tr.position.x+bx,TOP+.9,TZ)).set(failed?`Voted down at first reading<small>${G.g} for, ${A.total-G.g} against</small>`:stg>=6&&s.t>=1?"Royal assent<small>it's now an Act of Parliament: the law</small>":`${STAGES[stg][0]}<small>${STAGES[stg][1]}</small>`).cls(failed?"hot":"hot big").show(showB&&!over);
      const reading=[1,3,5].includes(stg);lVote.at(tmp.set(tr.position.x+SX(stg),TOP+.25,TZ-.3)).set(`Ayes ${G.g} · Noes ${A.total-G.g}`).show(k==="bill"&&reading);
      // submissions fluttering into the committee room
      const subOn=k==="committee";for(let q=0;q<10;q++){if(subOn&&!S.REDUCED){const u=((t*.35+q/10)%1);papers.put(q,S.lerp(.9,.05,u)+Math.sin(u*9+q)*.05,.25+Math.sin(u*Math.PI)*.5+.1,S.lerp(.9,.18,u),1,Math.sin(t+q),u*3,0)}else papers.put(q,0,-9,0,0)}papers.done();
    }};
}
const bounce3=t=>{const n=7.5625,d=2.75;if(t<1/d)return n*t*t;if(t<2/d)return n*(t-=1.5/d)*t+.75;if(t<2.5/d)return n*(t-=2.25/d)*t+.9375;return n*(t-=2.625/d)*t+.984375};
StudyKit.mount({kupu:KUPU,scene3d:civics3d,
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
