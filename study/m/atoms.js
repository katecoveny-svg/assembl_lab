(()=>{
const EL=[["H","Hydrogen",1],["He","Helium",4],["Li","Lithium",7],["Be","Beryllium",9],["B","Boron",11],["C","Carbon",12],["N","Nitrogen",14],["O","Oxygen",16],["F","Fluorine",19],["Ne","Neon",20],
 ["Na","Sodium",23],["Mg","Magnesium",24],["Al","Aluminium",27],["Si","Silicon",28],["P","Phosphorus",31],["S","Sulfur",32],["Cl","Chlorine",35],["Ar","Argon",40],["K","Potassium",39],["Ca","Calcium",40]];
const s={p:6,n:6,e:6,spin:0,alphas:[],hits:{straight:0,small:0,back:0}};
const el=()=>EL[s.p-1];
function shells(e){const cap=[2,8,8,2],out=[];let left=e;for(const c of cap){if(left<=0)break;const k=Math.min(c,left);out.push(k);left-=k}return out}
const charge=()=>s.p-s.e;
const chargeStr=()=>{const c=charge();return c===0?"neutral":(c>0?"+":"−")+(Math.abs(c)>1?Math.abs(c):"")};
function sup(t){return t}
function setEl(p,n,e){s.p=p;s.n=n;s.e=e}
// ---------- gold foil
function fire(){const y=(Math.random()-0.5)*220;s.alphas.push({x:20,y:165+y,vx:220,vy:0,b:y,done:false})}
function tickFoil(dt){if(Math.random()<dt*14)fire();
  s.alphas.forEach(a=>{const nucs=[-80,-40,0,40,80];
    if(!a.done&&a.x>=318&&a.x<330){const near=nucs.map(c=>Math.abs((a.y-165)-c)).reduce((m,v)=>Math.min(m,v),99);
      if(near<1.2){a.vx=-200;a.vy=(Math.random()-.5)*80;s.hits.back++}else if(near<5){a.vy=(Math.random()<.5?-1:1)*(90+Math.random()*80);s.hits.small++}else s.hits.straight++;a.done=true}
    a.x+=a.vx*dt;a.y+=a.vy*dt});
  s.alphas=s.alphas.filter(a=>a.x>-10&&a.x<650&&a.y>-10&&a.y<340)}
// ---------- drawing (the bench figure look: StudyKit.fig)
const F=StudyKit.fig,PAL=F.palette,TINT=PAL.case.sky,AX="#8F9BAA";
// a painted sphere: body, a soft shade on the lower right and one highlight
const ball=(x,y,r,c)=>{x=+x;y=+y;const m=F.mat("painted",c);return `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" stroke="${m.stroke}" stroke-width=".8"/><path d="M${(x+r*0.15).toFixed(1)},${(y+r*0.95).toFixed(1)} a${r},${r} 0 0 0 ${(r*0.8).toFixed(1)},${(-r*1.3).toFixed(1)}" fill="none" stroke="${m.shade}" stroke-width="${(r*0.35).toFixed(1)}" opacity=".55"/><circle cx="${(x-r*0.35).toFixed(1)}" cy="${(y-r*0.38).toFixed(1)}" r="${(r*0.3).toFixed(1)}" fill="#fff" opacity=".85"/>`};
const COL={p:PAL.product.strawberry,n:PAL.steel,e:PAL.product.blueberry};
function drawAtom(st){
  let o=F.floor(640,330);const cx=250,cy=165,sh=shells(s.e);
  // a soft floor shadow under the floating atom, toward the lower right
  o+=`<ellipse cx="${cx+40}" cy="300" rx="104" ry="8" fill="${PAL.shadow}" opacity=".12"/>`;
  // shells: thin frosted orbits
  [42,72,102,132].forEach((r,i)=>{if(i<Math.max(sh.length,1))o+=i<sh.length?`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${F.deep(TINT)}" stroke-width="3" stroke-opacity=".35"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#fff" stroke-width="1" stroke-opacity=".9"/>`:`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${AX}" stroke-dasharray="3 4"/>`});
  // nucleus: protons and neutrons packed
  const N=s.p+s.n,R=Math.max(10,Math.sqrt(N)*4.2);const pts=[];
  for(let i=0;i<N;i++){const a=i*2.399,r=R*Math.sqrt((i+0.5)/N);pts.push([cx+Math.cos(a)*r,cy+Math.sin(a)*r])}
  // interleave protons and neutrons
  const kinds=[];let pp=s.p,nn=s.n;for(let i=0;i<N;i++){if(pp&&(!nn||i%2===0)){kinds.push("p");pp--}else{kinds.push("n");nn--}}
  // draw back to front (top-left first) so the packing reads as a cluster of balls
  pts.map((q,i)=>[q,kinds[i]]).sort((a,b)=>(a[0][0]+a[0][1])-(b[0][0]+b[0][1])).forEach(([q,k])=>o+=ball(q[0].toFixed(1),q[1].toFixed(1),4.8,COL[k]));
  // electrons
  sh.forEach((cnt,i)=>{const r=[42,72,102,132][i];for(let j=0;j<cnt;j++){const a=s.spin*(1.2-i*0.25)+j*2*Math.PI/cnt;o+=ball((cx+Math.cos(a)*r).toFixed(1),(cy+Math.sin(a)*r).toFixed(1),5,COL.e)}});
  // symbol card: a frosted acrylic tile standing on the floor
  const E=el(),A=s.p+s.n,c=charge();
  o+=F.acrylic(440,70,150,150,{tint:TINT,d:14,r:12,opacity:.34,shadowLen:34});
  o+=`<text x="470" y="104" style="font:500 15px var(--mono);fill:var(--ink)">${A}</text><text x="470" y="198" style="font:500 15px var(--mono);fill:var(--ink)">${s.p}</text>`;
  o+=`<text x="515" y="170" text-anchor="middle" style="font:600 56px var(--display);fill:var(--ink)">${E[0]}</text>`;
  if(c!==0)o+=`<text x="560" y="104" style="font:600 18px var(--mono);fill:var(--warn)">${Math.abs(c)>1?Math.abs(c):""}${c>0?"+":"−"}</text>`;
  o+=`<text class="t-big" x="515" y="250" text-anchor="middle">${E[1]}${c!==0?" ion":""}</text><text class="t-lab" x="515" y="268" text-anchor="middle">MASS NUMBER ${A} · ATOMIC NUMBER ${s.p}</text>`;
  o+=`<g class="t-lab">${ball(24,24,5.5,COL.p)}<text x="34" y="27">PROTON +</text>${ball(112,24,5.5,COL.n)}<text x="122" y="27">NEUTRON 0</text>${ball(206,24,5.5,COL.e)}<text x="216" y="27">ELECTRON −</text></g>`;
  o+=`<text class="t-ink" x="250" y="318" text-anchor="middle">Electron arrangement ${sh.join(",")||"none"}</text>`;
  return o;
}
function drawFoil(){
  let o=F.floor(640,330);
  // detector screen: a curved frosted band
  o+=`<path d="M600,30 A300,300 0 0,1 600,300" fill="none" stroke="${TINT}" stroke-width="12" opacity=".75"/><path d="M600,30 A300,300 0 0,1 600,300" fill="none" stroke="${F.deep(TINT)}" stroke-width="1.2" transform="translate(6,0)"/><path d="M596,36 A296,296 0 0,1 596,294" fill="none" stroke="#fff" stroke-width="1.6" opacity=".8"/>`;
  // alpha source: a lead box with a slit
  o+=F.box(10,135,24,60,{colour:"#6E7891",kind:"metal",d:10,r:3});
  o+=`<rect x="31" y="160" width="3" height="10" fill="${PAL.product.butter}"/>`;
  // gold foil: a thin gold sheet on edge
  o+=F.box(320,40,8,250,{colour:"#E9C46A",kind:"metal",d:10,shadowLen:40});
  [-80,-40,0,40,80].forEach(c=>o+=ball(324,165+c,2.6,PAL.product.strawberry));
  s.alphas.forEach(a=>o+=`<circle cx="${a.x.toFixed(1)}" cy="${a.y.toFixed(1)}" r="3" fill="${PAL.product.blueberry}" stroke="#4E6FA8" stroke-width=".9"/>`);
  o+=F.pill(10,104,"Alpha source",{ax:22,ay:132});
  o+=F.pill(338,10,"Gold foil",{ax:330,ay:38});
  o+=F.pill(632,6,"Detector screen",{anchor:"end",ax:606,ay:36});
  o+=`<text class="t-lab" x="16" y="318">THE NUCLEI ARE DRAWN FAR BIGGER THAN REAL: AN ATOM IS ABOUT 100,000 TIMES WIDER THAN ITS NUCLEUS</text>`;
  return o;
}
function drawClose(st0,st){
  let o=F.floor(420,260);
  if(st.k==="foil"){const h=s.hits,t=h.straight+h.small+h.back||1;o+=`<text class="t-lab" x="14" y="22">WHAT THE DETECTOR SEES</text>`;
    [["Straight through",h.straight,PAL.product.blueberry],["Bent a little",h.small,PAL.product.butter],["Bounced back",h.back,PAL.product.strawberry]].forEach(([n,v,c],i)=>{const w=v/t*260;o+=`<text class="t-ink" x="14" y="${62+i*40}">${n}</text><rect x="140" y="${50+i*40}" width="260" height="16" rx="8" fill="#fff" stroke="#DCD6EA"/><rect x="140" y="${50+i*40}" width="${Math.max(1,w)}" height="16" rx="8" fill="${c}" stroke="${F.mat("painted",c).stroke}" stroke-width=".8"/><text class="t-ink" x="140" y="${80+i*40}">${v} (${(v/t*100).toFixed(1)}%)</text>`});
    o+=`<text class="t-body" x="14" y="200">Most go straight through: the atom is mostly empty space.</text><text class="t-body" x="14" y="220">A few bounce back: there's a tiny, dense, positive nucleus.</text><text class="t-body" x="14" y="246">Ernest Rutherford, from Brightwater near Nelson, led this work.</text>`;return o}
  o+=`<text class="t-lab" x="14" y="22">FIRST 20 ELEMENTS · ROW = SHELLS</text>`;
  const pos={1:[0,0],2:[7,0]};for(let z=3;z<=10;z++)pos[z]=[z<=4?z-3:z-3+0,1];for(let z=11;z<=18;z++)pos[z]=[z-11,2];pos[19]=[0,3];pos[20]=[1,3];
  // groups 1,2,13..18 -> columns 0..7
  for(let z=3;z<=10;z++)pos[z]=[z-3,1];
  const W=46,H=44,x0=18,y0=36;
  for(let z=1;z<=20;z++){const [c,r]=pos[z];const on=z===s.p;o+=`<rect x="${x0+c*W}" y="${y0+r*H}" width="${W-4}" height="${H-4}" rx="5" fill="${on?PAL.product.butter:"#fff"}" stroke="${on?"#B08A2E":"#DCD6EA"}" stroke-width="${on?1.4:1}"/><text class="t-lab" x="${x0+c*W+4}" y="${y0+r*H+12}">${z}</text><text x="${x0+c*W+(W-4)/2}" y="${y0+r*H+31}" text-anchor="middle" style="font:600 14px var(--display);fill:var(--ink)">${EL[z-1][0]}</text>`}
  const sh=shells(s.p);o+=`<text class="t-body" x="14" y="230">${el()[1]}: period ${sh.length} (${sh.length} shell${sh.length>1?"s":""}), ${sh[sh.length-1]} electron${sh[sh.length-1]>1?"s":""} in the outer shell.</text>`;
  o+=`<text class="t-body" x="14" y="250">${[2,10,18].includes(s.p)?"Full outer shell: a noble gas that hardly reacts.":"Atoms react to get a full outer shell."}</text>`;
  return o;
}
const steps=[
 {k:"build",lab:"Build an atom",cap:"Add protons and the element changes. Protons decide what the atom is; neutrons add mass; electrons orbit in shells.",speed:1,speedLabel:"live",controls:["play","p","n","e"],
  big:"<b>The big idea:</b> an atom is a tiny nucleus of protons and neutrons with electrons around it. The number of protons is the atomic number, and it decides the element.",
  exam:"An atom has a nucleus containing protons (positive) and neutrons (no charge), with electrons (negative) moving around it in shells. A carbon atom has 6 protons, 6 neutrons and 6 electrons, so it has no overall charge.",
  trap:"Saying neutrons decide the element. Only the number of protons does.",chips:["el","pne","chg"],onStep:()=>setEl(6,6,6)},
 {k:"numbers",lab:"Mass and atomic number",cap:"The small top number is the mass number: protons plus neutrons. The bottom number is the atomic number: protons.",speed:1,speedLabel:"live",controls:["play","p","n","e"],
  big:"<b>The big idea:</b> neutrons = mass number − atomic number. Electrons have almost no mass, so they're not counted.",
  exam:"Sodium has an atomic number of 11 and a mass number of 23. So it has 11 protons, 23 − 11 = 12 neutrons and, as a neutral atom, 11 electrons.",
  trap:"Adding electrons into the mass number. Mass number counts only protons and neutrons.",chips:["el","mass","neut"],onStep:()=>setEl(11,12,11)},
 {k:"shells",lab:"Electron shells",cap:"Electrons fill shells from the inside out: 2 in the first, then 8, then 8. Watch calcium fill 2,8,8,2.",speed:1,speedLabel:"live",controls:["play","p","n","e"],
  big:"<b>The big idea:</b> the electron arrangement gives the period (number of shells) and group (outer electrons) on the periodic table.",
  exam:"Calcium has 20 electrons arranged 2,8,8,2. It has four shells, so it is in period 4, and two electrons in its outer shell, so it is in group 2.",
  trap:"Putting 8 electrons in the first shell. The first shell only holds 2.",chips:["el","arr"],onStep:()=>setEl(20,20,20)},
 {k:"ions",lab:"Ions",cap:"Take an electron away from sodium, or give one to chlorine. Atoms lose or gain electrons to get a full outer shell, becoming charged ions.",speed:1,speedLabel:"live",controls:["play","p","n","e"],
  big:"<b>The big idea:</b> metals lose electrons to form positive ions; non-metals gain electrons to form negative ions. The protons never change.",
  exam:"A sodium atom (2,8,1) loses its one outer electron to get a full outer shell. It now has 11 protons but only 10 electrons, so it is a sodium ion with a charge of 1+ (Na⁺).",
  trap:"Changing the protons to make an ion. Ions form by gaining or losing electrons only.",chips:["el","arr","chg"],onStep:()=>setEl(11,12,11)},
 {k:"isotopes",lab:"Isotopes",cap:"Same protons, different neutrons. Carbon-12 and carbon-14 are both carbon; carbon-14 is radioactive and is used to date old things.",speed:1,speedLabel:"live",controls:["play","p","n","e"],
  big:"<b>The big idea:</b> isotopes are atoms of the same element with different numbers of neutrons, so they have different mass numbers.",
  exam:"Carbon-12 and carbon-14 are isotopes of carbon. Both have 6 protons, so they are the same element, but carbon-12 has 6 neutrons and carbon-14 has 8, so their mass numbers are different.",
  trap:"Saying isotopes have different numbers of protons. Then they'd be different elements.",chips:["el","mass","neut"],onStep:()=>setEl(6,8,6)},
 {k:"foil",lab:"Rutherford's foil",cap:"Fire alpha particles at thin gold foil, like Ernest Rutherford's team did. Most go straight through. A very few bounce back.",speed:1,speedLabel:"live",controls:["play","reset"],
  big:"<b>The big idea:</b> the gold foil experiment showed atoms are mostly empty space with a tiny, dense, positive nucleus. Rutherford grew up near Nelson.",
  exam:"Most alpha particles passed straight through the gold foil, which showed that an atom is mostly empty space. A few were deflected or bounced back, which showed there is a very small, dense, positively charged nucleus that repels the positive alpha particles.",
  trap:"Saying the particles bounced off electrons. Electrons are far too light; it's the dense positive nucleus.",chips:["hits"],onStep:()=>{s.alphas=[];s.hits={straight:0,small:0,back:0}}},
 {k:"test",lab:"Test yourself",cap:"Set the protons, neutrons and electrons for each one, then press Check.",speed:1,speedLabel:"live",controls:["play","p","n","e"],
  big:"<b>Exam tip:</b> show your counting. Protons from the atomic number, neutrons by subtracting, electrons from the charge.",
  chips:["el","pne","chg"]}
];
// ---- kupu Māori: te reo terms for this machine, each checked in Te Aka Māori Dictionary (ta = word id). Sources and notes: te-reo-notes.md
const KUPU=[
 {mi:"ngota",en:"atom",ta:14992},
 {mi:"karihi",en:"nucleus",ta:15725},
 {mi:"iraoho",en:"proton",ta:40328},
 {mi:"iramoe",en:"neutron",ta:40330,chip:"neut"},
 {mi:"irahiko",en:"electron",ta:40517},
 {mi:"pūmotu",en:"element",ta:40052,chip:"el"},
 {mi:"tau iraoho",en:"atomic number",ta:40327},
 {mi:"tau karihi",en:"mass number",ta:40329,chip:"mass"}];
Object.entries({"build": ["ngota", "karihi", "iraoho", "iramoe", "irahiko"], "numbers": ["tau iraoho", "tau karihi", "pūmotu"], "shells": ["irahiko"], "isotopes": ["iramoe"], "foil": ["karihi", "ngota"]}).forEach(([k,a])=>{const st=steps.find(x=>x.k===k);if(st)st.kupu=a});
// ---------- the 3D bench: an atom you build with your hands, and Rutherford's gold foil experiment
function atoms3d(S){const {THREE,mat,PAL}=S;const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
  const ZA=V3(0,0,0),ZF=V3(15,0,0),TOP=.3;
  const plinth=(c,w,d,tint)=>{const p=S.rbox(w,.3,d,.12,mat("plastic",tint,{rough:.55,coat:.2}));p.position.set(c.x,.15,c.z);S.scene.add(p);return p};
  plinth(ZA,10.6,6.8,PAL.case.sky);plinth(V3(ZF.x-.5,0,0),9.8,7.8,PAL.case.lavender);
  const AC=V3(-2.1,3.05,-.3);            // the atom floats here
  const FONT="Instrument Sans, system-ui, sans-serif";
  const tmp=new THREE.Vector3(),tmp2=new THREE.Vector3();
  // ---------------------------------------------------------------- the nucleus: packed proton and neutron balls that jiggle
  const NR=.17,packCache={};
  function pack(N){if(packCache[N])return packCache[N];const P=[];const R=NR*Math.cbrt(N/.5);
    for(let i=0;i<N;i++){const r=R*Math.cbrt((i+.5)/N),y=1-2*(i+.5)/N,rr=Math.sqrt(Math.max(0,1-y*y)),a=i*2.39996;P.push(V3(Math.cos(a)*rr*r,y*r,Math.sin(a)*rr*r))}
    const d=NR*1.85;for(let it=0;it<140;it++){for(const p of P)p.multiplyScalar(.97);
      for(let i=0;i<N;i++)for(let j=i+1;j<N;j++){tmp.subVectors(P[j],P[i]);const L=tmp.length();if(L<d){if(L<1e-5)tmp.set(Math.sin(i+j),Math.cos(i*j),.3);tmp.setLength((d-L)*.5);P[j].add(tmp);P[i].sub(tmp)}}}
    return packCache[N]=P}
  const nucG=S.group();nucG.position.copy(AC);
  const ballGeo=new THREE.SphereGeometry(NR,24,18);
  const protons=S.swarm(20,ballGeo,mat("plastic",PAL.product.strawberry,{rough:.3}),{cast:true});
  const neutrons=S.swarm(22,ballGeo,mat("plastic","#E4DBF6",{rough:.3}),{cast:true});nucG.add(protons,neutrons);
  const mkN=n=>Array.from({length:n},(_,i)=>({cur:V3(0,0,0),on:false,sc:0,seed:i*1.7+Math.random()}));
  const P=mkN(20),Nn=mkN(22);
  const nucHalo=S.puffs(1,PAL.product.strawberry,{additive:true});nucG.add(nucHalo);
  const spark=S.puffs(40,"#C8F08A",{additive:true});nucG.add(spark);const spk=[];for(let i=0;i<40;i++)spk.push({p:V3(0,0,0),v:V3(0,0,0),life:0});
  // ---------------------------------------------------------------- electron shells: tilted frosted rings with glowing electron beads
  const RAD=[1.05,1.55,2.05,2.55],CAP=[2,8,8,2];
  const shG=S.group();shG.position.copy(AC);shG.rotation.set(-.98,.22,0);
  const ringTilt=[[.0,.0],[.1,-.14],[-.12,.1],[.08,.16]];
  const rings=RAD.map((r,i)=>{const g=new THREE.Group();g.rotation.set(ringTilt[i][0],ringTilt[i][1],0);shG.add(g);
    const solid=S.torus(r,.016,S.M.plastic(PAL.deep.sky,{rough:.35}),{cast:false,ts:128,rs:8});g.add(solid);
    const faint=S.torus(r,.012,mat("flat",PAL.steelDark,{opacity:.28,depthWrite:false}),{cast:false,ts:96,rs:6});g.add(faint);
    const full=S.torus(r,.05,new THREE.MeshBasicMaterial({color:PAL.product.lime,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}),{cast:false,ts:128,rs:8});g.add(full);
    return {g,r,solid,faint,full,glow:0}});
  const eGeo=new THREE.SphereGeometry(.085,18,14);
  const electrons=S.swarm(20,eGeo,S.M.glow("#4F86D9",4.5),{cast:false});shG.add(electrons);
  const eGlow=S.puffs(20*6,"#9CC8FF",{additive:true});shG.add(eGlow);
  const E=Array.from({length:20},(_,i)=>({cur:V3(0,0,0),on:false,sc:0}));
  const ghosts=Array.from({length:8},()=>({p:V3(0,0,0),v:V3(0,0,0),life:0}));let gi=0;
  const ghostM=S.swarm(8,eGeo,S.M.glow("#4F86D9",4.5),{cast:false});shG.add(ghostM);
  const ionHalo=S.puffs(1,"#ffffff",{additive:false});shG.add(ionHalo);
  // tap an electron to pull it off (the same as the Electrons slider going down by one)
  S.pick(electrons,()=>{const s=S.api.state;if(s.e>0)s.e--});
  // ---------------------------------------------------------------- the parts trays: protons, neutrons and electrons, each with + and − buttons
  const trays=[["p",PAL.product.strawberry,-3.75,1,20,"Protons"],["n","#E4DBF6",-2.1,0,22,"Neutrons"],["e",PAL.product.blueberry,-.45,0,20,"Electrons"]].map(([key,c,x,lo,hi,name])=>{
    const g=S.group();g.position.set(x,TOP,2.15);
    const prof=[V3(0,0,0),V3(.5,0,0),V3(.56,.06,0),V3(.6,.36,0),V3(.54,.36,0),V3(.5,.1,0),V3(0,.1,0)].map(v=>new THREE.Vector2(v.x,v.y));
    const cup=S.mesh(new THREE.LatheGeometry(prof,48),mat("plastic","#ffffff",{rough:.35}));g.add(cup);
    const bm=key==="e"?mat("glow",PAL.product.blueberry,1.3):mat("plastic",c,{rough:.3});
    [[0,0],[.2,.08],[-.18,.12],[.06,-.2],[-.1,-.1],[.2,-.14],[-.22,-.06]].forEach(([a,b],k)=>g.add(S.sphere(key==="e"?.085:NR,bm,{at:[a,.26+(k%3)*.05,b],seg:16})));
    const btn=(dx,col,plus)=>{const b=S.group(g);b.position.set(dx,0,.78);
      b.add(S.cyl(.2,.22,.12,mat("plastic","#ffffff",{rough:.4}),{at:[0,.06,0]}));const top=S.cyl(.17,.17,.08,mat("plastic",col,{rough:.3}),{at:[0,.15,0]});b.add(top);
      const icM=mat("plastic","#ffffff",{rough:.3});b.add(S.box(.18,.03,.05,icM,{at:[0,.2,0]}));if(plus)b.add(S.box(.05,.03,.18,icM,{at:[0,.2,0]}));
      b.userData.press=0;return b};
    const plus=btn(.26,PAL.product.lime,true),minus=btn(-.26,PAL.product.strawberry,false);
    const bump=d=>{const s=S.api.state;s[key]=S.clamp(s[key]+d,lo,hi)};
    S.pick(plus,()=>{bump(1);plus.userData.press=1});S.pick(minus,()=>{bump(-1);minus.userData.press=1});S.pick(cup,()=>bump(1));
    const lab=S.label({off:[0,-40]});
    return {key,g,plus,minus,lab,name,src:V3(x,TOP+.5,2.15)}});
  // ---------------------------------------------------------------- the element tile: a frosted acrylic card with the symbol on a screen
  const TL=V3(2.75,TOP,-1.55);
  const tileG=S.group();tileG.position.copy(TL);tileG.rotation.y=-.28;
  tileG.add(S.rbox(1.5,.16,.7,.06,mat("plastic","#ffffff",{rough:.4}),{at:[0,.08,0]}));
  const slab=S.rbox(2.3,2.3,.16,.12,mat("acrylic",PAL.case.sky,{opacity:.3}),{at:[0,1.33,0],cast:false});slab.renderOrder=2;tileG.add(slab);
  const tileP=S.panel(512,512,2.1);tileP.position.set(0,1.33,.09);tileG.add(tileP);let tileKey="";
  // ---------------------------------------------------------------- a periodic table of the first 20 elements: tap a square to build that atom
  const POS={1:[0,0],2:[7,0],19:[0,3],20:[1,3]};for(let z=3;z<=10;z++)POS[z]=[z-3,1];for(let z=11;z<=18;z++)POS[z]=[z-11,2];
  const CW=.42,ptG=S.group();ptG.position.set(2.75,TOP+.42,1.35);ptG.rotation.set(.42,-.12,0);
  ptG.add(S.rbox(3.62,.12,1.94,.06,mat("plastic","#ffffff",{rough:.45})));
  [[-1.3,.5],[1.3,.5]].forEach(([x])=>{const leg=S.cyl(.06,.08,.5,mat("metal"),{seg:12});leg.position.set(x,-.3,-.55);ptG.add(leg)});
  const rowC=[PAL.case.blush,PAL.case.mint,PAL.case.sky,PAL.case.peach];
  const cells=S.swarm(20,new S.RoundedBoxGeometry(CW-.05,.07,CW-.05,2,.025),mat("plastic","#ffffff",{rough:.4}),{colors:true});ptG.add(cells);
  const cellAt=z=>{const [c,r]=POS[z];return [(c-3.5)*CW,.095,(r-1.5)*CW]};
  for(let z=1;z<=20;z++){const [x,y,w]=cellAt(z);cells.put(z-1,x,y,w,1);cells.tint(z-1,rowC[POS[z][1]])}cells.done();
  const ptP=S.panel(1024,512,8*CW);ptP.rotation.x=-Math.PI/2;ptP.position.y=.135;ptG.add(ptP);
  ptP.redraw((g,w,h)=>{const cw=w/8,ch=h/4;g.textAlign="center";
    for(let z=1;z<=20;z++){const [c,r]=POS[z];g.fillStyle="#6E6A86";g.font=`600 26px ${FONT}`;g.fillText(String(z),c*cw+cw/2,r*ch+36);
      g.fillStyle="#222A55";g.font=`600 54px ${FONT}`;g.fillText(EL[z-1][0],c*cw+cw/2,r*ch+100)}});
  const cursor=S.group(ptG);cursor.add(S.mesh(new THREE.TorusGeometry(CW*.52,.025,8,4),mat("glow",PAL.product.butter,1.6),{rot:[Math.PI/2,0,Math.PI/4],cast:false}));
  S.pick(ptP,hit=>{if(!hit.uv)return;const c=Math.floor(hit.uv.x*8),r=Math.floor((1-hit.uv.y)*4);const z=+Object.keys(POS).find(k=>POS[k][0]===c&&POS[k][1]===r);
    if(z){const s=S.api.state;s.p=z;s.n=EL[z-1][2]-z;s.e=z}});
  // ---------------------------------------------------------------- isotope comparison: the element's common isotope on a little pedestal
  const CM=V3(.45,TOP,.35);
  const cmpG=S.group();cmpG.position.copy(CM);
  cmpG.add(S.cyl(.45,.55,.3,mat("plastic","#ffffff",{rough:.4}),{at:[0,.15,0]}));
  const dome=S.sphere(.62,mat("glass","#ffffff",{opacity:.14}),{at:[0,1.05,0],cast:false});dome.renderOrder=6;cmpG.add(dome);
  const cmpNuc=S.group(cmpG);cmpNuc.position.y=1.05;cmpNuc.scale.setScalar(.68);
  const cP=S.swarm(20,ballGeo,mat("plastic",PAL.product.strawberry,{rough:.3}),{cast:true}),cN=S.swarm(22,ballGeo,mat("plastic","#E4DBF6",{rough:.3}),{cast:true});cmpNuc.add(cP,cN);
  let cmpK=0,cmpKey="";
  // ---------------------------------------------------------------- labels
  const lNuc=S.label({off:[-44,30]}),lE=S.label({off:[40,-20]}),lName=S.label({cls:"big",off:[30,-30]});
  const SHA=[.55,-.35,2.55,-2.5];const lShell=RAD.map((r,i)=>S.label({off:[i>=2?-30:30,i%2?24:-24]}));
  const lMass=S.label({cls:"hot",off:[-40,-30]}),lAtomic=S.label({cls:"hot",off:[-40,20]}),lNeutEq=S.label({cls:"big",off:[-50,-40]});
  const lCharge=S.label({cls:"hot",off:[40,-40]}),lTap=S.label({off:[40,24]}).set("Tap an outer electron<small>to pull it off the atom</small>");
  const lIso=S.label({cls:"hot",off:[-46,-36]}),lCmp=S.label({off:[34,-34]}),lTable=S.label({off:[30,30]}).set("Tap an element<small>to build that atom</small>");

  // ---------------------------------------------------------------- Rutherford's gold foil experiment
  const FC=V3(ZF.x,1.65,0),R=3.0,K=R/276;     // foil centre, detector radius, model pixels → world units
  const fz=S.group();fz.position.set(FC.x,0,FC.z);
  // detector: a frosted ring of zinc-sulfide screen around the foil, with a narrow slot where the beam comes in
  const GAP=.09;
  const band=S.mesh(new THREE.CylinderGeometry(R,R,1.9,128,1,true,Math.PI*1.5+GAP,Math.PI*2-GAP*2),mat("acrylic","#F4F0FF",{opacity:.16}),{cast:false});band.position.y=FC.y;band.renderOrder=4;fz.add(band);
  for(const y of [FC.y-.95,FC.y+.95]){const rr=S.torus(R,.035,mat("plastic","#ffffff",{rough:.3}),{at:[0,y,0],rot:[Math.PI/2,0,0],arc:Math.PI*2-GAP*2,ts:128});rr.rotation.z=Math.PI+GAP;fz.add(rr)}
  for(let k=0;k<8;k++){const a=k/8*Math.PI*2+Math.PI/8;const post=S.cyl(.045,.06,FC.y-.95-TOP+.02,mat("metal"),{seg:12});post.position.set(Math.cos(a)*R,TOP+(FC.y-.95-TOP)/2,Math.sin(a)*R);fz.add(post)}
  // the source: a lead block with a collimator pointing at the foil and a hot radioactive sample inside
  const src=S.group(fz);src.position.set(-276*K-.62-.3,TOP,0);
  src.add(S.rbox(.95,1.0,.9,.08,mat("metal","#6E7891",{rough:.45}),{at:[0,FC.y-TOP,0]}));
  src.add(S.rbox(1.1,.18,1.0,.06,mat("plastic","#ffffff",{rough:.4}),{at:[0,.09,0]}));
  src.add(S.cyl(.2,.2,.32,mat("plastic","#ffffff",{rough:.4}),{at:[0,.3,0]}));
  const noz=S.cyl(.11,.15,.5,mat("metal","#59627A",{rough:.4}),{rot:[0,0,-Math.PI/2],at:[.7,FC.y-TOP,0]});src.add(noz);
  const coreM=S.M.glow(PAL.hot,5);src.add(S.sphere(.07,coreM,{at:[.96,FC.y-TOP,0],cast:false}));
  const srcGlow=S.puffs(1,PAL.hot,{additive:true});src.add(srcGlow);srcGlow.put(0,.98,FC.y-TOP,0,.9,340);srcGlow.done();
  S.pick(src,()=>{S.api.state.playing=!S.api.state.playing});
  // the gold foil, held in a steel frame
  const frame=S.group(fz);frame.position.set(0,0,0);
  const fm=mat("metal",PAL.steel,{rough:.3});
  for(const z of [-.75,.75])frame.add(S.cyl(.04,.04,FC.y+.7-TOP,fm,{at:[0,TOP+(FC.y+.7-TOP)/2,z],seg:12}));
  frame.add(S.cyl(.04,.04,1.5,fm,{at:[0,FC.y+.7,0],rot:[Math.PI/2,0,0],seg:12}));frame.add(S.rbox(.5,.1,1.9,.04,mat("plastic","#ffffff"),{at:[0,TOP+.05,0]}));
  const foil=S.box(.012,1.1,1.4,mat("metal","#E9C46A",{rough:.18}),{at:[0,FC.y,0]});frame.add(foil);
  const beam=S.cyl(.05,.05,276*K,new THREE.MeshBasicMaterial({color:PAL.hot,transparent:true,opacity:.12,depthWrite:false,blending:THREE.AdditiveBlending}),{rot:[0,0,Math.PI/2],at:[-276*K/2,FC.y,0],cast:false});fz.add(beam);
  // alpha particles (each one follows a model alpha) with glowing trails; flashes and lasting marks where they hit the screen
  const NA=160;
  const alphas=S.swarm(NA,new THREE.SphereGeometry(.05,12,10),S.M.glow("#FF9A5C",5),{cast:false});fz.add(alphas);
  const trail=S.puffs(NA*4,"#FFB27A",{additive:true});fz.add(trail);
  const flash=S.puffs(40,"#FFF2B0",{additive:true});fz.add(flash);const fls=Array.from({length:40},()=>({p:V3(0,0,0),life:0}));let fi=0;
  const MK={straight:S.puffs(200,"#7FA8F0",{additive:true}),small:S.puffs(120,"#F2C83C",{additive:true}),back:S.puffs(60,"#FF5C8A",{additive:true})};
  const marks={};for(const k in MK){fz.add(MK[k]);marks[k]={a:Array.from({length:MK[k].n},()=>({p:V3(0,0,0),life:0})),i:0}}
  const vis=new Map();
  // a score screen beside the ring
  const board=S.group(fz);board.position.set(-3.55,TOP,2.85);board.rotation.y=.35;
  board.add(S.cyl(.05,.07,.9,mat("metal"),{at:[0,.45,0]}));board.add(S.rbox(.8,.1,.5,.04,mat("plastic","#ffffff"),{at:[0,.05,0]}));
  board.add(S.rbox(2.0,1.2,.08,.06,mat("plastic","#ffffff",{rough:.35}),{at:[0,1.45,-.05]}));
  const score=S.panel(512,300,1.84);score.position.set(0,1.45,.0);board.add(score);let scoreKey="",scoreT=0;
  // a zoom bubble above the foil: three gold atoms, mostly empty space. Alpha paths are worked out with a real 1/r² push from each nucleus
  const bub=S.group(fz);bub.position.set(0,FC.y+2.3,0);const BR=.85;
  const glassB=S.sphere(BR,mat("glass","#ffffff",{opacity:.13}),{cast:false,seg:40});glassB.renderOrder=6;bub.add(glassB);
  bub.add(S.cyl(.012,.06,1.15,mat("glass","#ffffff",{opacity:.35}),{at:[0,-BR-.5,0],cast:false}));
  const NUC=[V3(0,.05,0),V3(0,.48,-.28),V3(0,-.44,.3)];
  NUC.forEach(n=>{bub.add(S.sphere(.035,S.M.glow("#E9B03A",4.2),{at:[n.x,n.y,n.z],cast:false,seg:12}));const cl=S.sphere(.3,mat("flat",PAL.product.butter,{opacity:.08,depthWrite:false}),{at:[n.x,n.y,n.z],cast:false,seg:20});cl.renderOrder=5;bub.add(cl)});
  const tracks=[];{const KC=.01,offs=[[.05+.005,0],[.05+.032,.0],[.25,.25],[-.2,-.05],[.3,-.35],[-.12,.5],[.0,-.62],[-.6,-.1],[.62,.2]];
    for(const [y0,z0] of offs){const p=V3(-Math.sqrt(Math.max(.01,BR*BR*.88-y0*y0-z0*z0)),y0,z0),v=V3(1,0,0),pts=[];for(let i=0;i<4000&&p.length()<BR*.97;i++){const a=V3(0,0,0);for(const n of NUC){tmp.subVectors(p,n);const r=Math.max(.012,tmp.length());a.addScaledVector(tmp,KC/(r*r*r))}
        v.addScaledVector(a,.0015);p.addScaledVector(v,.0015);if(i%6===0)pts.push(p.clone())}tracks.push({pts,ph:Math.random()})}}
  const zA=S.swarm(tracks.length,new THREE.SphereGeometry(.03,10,8),S.M.glow("#FF9A5C",5),{cast:false});bub.add(zA);
  const zT=S.puffs(tracks.length*6,"#FFB27A",{additive:true});bub.add(zT);
  const lZoom=S.label({off:[40,-20]}).set("Zoom into the foil<small>gold atoms are mostly empty space: only a near-miss with a nucleus bends an alpha</small>");
  const lSrc=S.label({off:[-30,-40]}).set("Alpha source<small>fires positive alpha particles</small>");
  const lFoil=S.label({off:[20,-50]}).set("Thin gold foil");
  const lDet=S.label({off:[30,-30]}).set("Detector screen<small>flashes where an alpha lands</small>");
  const lStraight=S.label({off:[24,30]}),lBack=S.label({cls:"hot",off:[-30,40]});
  const lScale=S.label({off:[0,30],lead:false}).set("<small>Zoomed view not to scale: an atom is about 100,000 times wider than its nucleus</small>");

  // ---------------------------------------------------------------- views
  S.view("build",[1.2,4.7,11.6],[-.2,1.95,0],{min:4,max:24});
  S.view("numbers",[2.2,3.6,8.2],[.9,2.0,-.6],{min:3,max:20});
  S.view("shells",[-1.6,6.4,8.6],[-2.0,2.7,-.2],{min:3,max:20});
  S.view("ions",[-.6,4.4,8.8],[-1.6,2.5,0],{min:3,max:20});
  S.view("isotopes",[.2,4.0,9.6],[-.9,2.1,.2],{min:3,max:20});
  S.view("foil",[FC.x-2.2,7.4,11.6],[FC.x-.5,2.0,0],{min:4,max:26});
  S.view("all",[7.2,10.5,22],[7.4,1.4,0],{min:6,max:50});
  const viewOf=k=>k==="foil"?"foil":k==="test"?"all":k;
  const atomL=[lNuc,lE,lName,...lShell,lMass,lAtomic,lNeutEq,lCharge,lTap,lIso,lCmp,lTable,...trays.map(t=>t.lab)],foilL=[lSrc,lFoil,lDet,lStraight,lBack,lScale,lZoom];
  let K0=null;
  const show={
    build:[lNuc,lE,lName,lTable,...trays.map(t=>t.lab)],
    numbers:[lName,lMass,lAtomic,lNeutEq],
    shells:[lName,...lShell],
    ions:[lName,lCharge,lTap,trays[2].lab],
    isotopes:[lName,lIso,lCmp,trays[1].lab],
    foil:foilL,
    test:[lName,...trays.map(t=>t.lab)]};
  S.goView("build",true);
  let lastE=-1,localSpin=0,lastP=-1,lastN=-1;
  const ident=new THREE.Quaternion();
  const shellOf=k=>{let i=0,c=0;for(;i<4;i++){if(k<c+CAP[i])return [i,k-c];c+=CAP[i]}return [3,k-c]};
  function ringPoint(i,a,out){const r=RAD[i];out.set(Math.cos(a)*r,Math.sin(a)*r,0).applyEuler(rings[i].g.rotation);return out}
  function drawTile(s){const E0=EL[s.p-1],A=s.p+s.n,c=s.p-s.e;const key=[s.p,s.n,s.e].join();if(key===tileKey)return;tileKey=key;
    tileP.redraw((g,w,h)=>{g.fillStyle="rgba(255,255,255,.93)";g.beginPath();g.roundRect(10,10,w-20,h-20,36);g.fill();g.strokeStyle=PAL.deep.sky;g.lineWidth=5;g.stroke();
      g.fillStyle="#222A55";g.textAlign="left";g.font=`600 70px ${FONT}`;g.fillText(String(A),52,110);g.fillText(String(s.p),52,h-56);
      g.textAlign="center";g.font=`600 250px ${FONT}`;g.fillText(E0[0],w/2+40,h/2+88);
      if(c!==0){g.fillStyle=PAL.deep.blush;g.textAlign="right";g.font=`700 80px ${FONT}`;g.fillText((Math.abs(c)>1?Math.abs(c):"")+(c>0?"+":"−"),w-44,116)}
      g.fillStyle="#6E6A86";g.font=`600 26px ${FONT}`;g.textAlign="left";g.fillText("MASS NUMBER",52,148);g.fillText("ATOMIC NUMBER",52,h-118)})}
  function burst(n){for(let k=0;k<n;k++){const p=spk.find(q=>q.life<=0);if(!p)break;p.p.set(0,0,0);p.v.set(Math.random()-.5,Math.random()-.5,Math.random()-.5).setLength(1.2+Math.random());p.life=.8}}
  let sparkT=0;
  return {
    step(st){const v=viewOf(st.k);S.goView(v);if(v==="foil")S.setShadowBox(6,[FC.x,0,0]);else if(v==="all")S.setShadowBox(14,[7,0,0]);else S.setShadowBox(6.5,[0,0,0]);
      K0=st.k;atomL.forEach(l=>l.hide());foilL.forEach(l=>l.hide());(show[st.k]||[]).forEach(l=>l.show());
      if(st.k==="foil")vis.clear()},
    update(s,st,dt,t){const k=st.k,foilOn=k==="foil"||k==="test";
      // ---- nucleus
      const N=s.p+s.n,slots=pack(Math.max(1,N));
      const kinds=[];let pp=s.p,nn=s.n;for(let i=0;i<N;i++){if(pp&&(!nn||i%2===0)){kinds.push("p");pp--}else{kinds.push("n");nn--}}
      nucG.rotation.y+=dt*(S.REDUCED?0:.35);nucG.rotation.x=Math.sin(t*.3)*.25;
      const binLocal=i=>nucG.worldToLocal(tmp2.copy(trays[i].src));
      let ip=0,inn=0;const kk=1-Math.exp(-dt*7),jig=S.REDUCED?0:.016;
      for(let i=0;i<N;i++){const isP=kinds[i]==="p";const arr=isP?P:Nn,idx=isP?ip++:inn++;const o=arr[idx];
        if(!o.on){o.on=true;o.cur.copy(binLocal(isP?0:1));o.sc=.6}
        o.cur.lerp(slots[i],kk);o.sc+=(1-o.sc)*kk;o.seed+=dt*9}
      [[P,ip,protons,0],[Nn,inn,neutrons,1]].forEach(([arr,n,sw,bi])=>{for(let i=0;i<arr.length;i++){const o=arr[i];
        if(i>=n){if(o.on){o.on=false}o.sc+=(0-o.sc)*kk;o.cur.lerp(binLocal(bi),kk)}
        sw.put(i,o.cur.x+Math.sin(o.seed*1.3)*jig,o.cur.y+Math.cos(o.seed*1.7)*jig,o.cur.z+Math.sin(o.seed*1.1+1)*jig,Math.max(.001,o.sc))}sw.done()});
      const nucR=NR*Math.cbrt(Math.max(1,N)/.5);
      nucHalo.put(0,0,0,0,.18+.05*Math.sin(t*3),nucR*900+300);nucHalo.done();
      // carbon-14 is radioactive: the odd spark leaves its nucleus
      sparkT-=dt;if(k==="isotopes"&&s.p===6&&s.n===8&&sparkT<=0&&!S.REDUCED){burst(6);sparkT=1.4+Math.random()*1.2}
      for(let i=0;i<spk.length;i++){const p=spk[i];if(p.life>0){p.life-=dt;p.p.addScaledVector(p.v,dt)}spark.put(i,p.p.x,p.p.y,p.p.z,Math.max(0,p.life),160)}spark.done();
      // ---- electrons
      const sh=shells(s.e),spin=s.spin+localSpin;if(!s.playing&&!S.REDUCED)localSpin+=dt*1.4;
      const binE=shG.worldToLocal(tmp2.copy(trays[2].src)).clone();
      if(lastE>=0&&s.e<lastE){for(let q=s.e;q<lastE;q++){const o=E[q];const g=ghosts[gi=(gi+1)%ghosts.length];g.p.copy(o.cur);g.v.copy(o.cur).setLength(2.4).add(V3(0,.8,1.2));g.life=1.3}}
      lastE=s.e;
      let q=0;
      sh.forEach((cnt,i)=>{for(let j=0;j<cnt;j++,q++){const a=spin*(1.2-i*.25)+j*2*Math.PI/cnt;const o=E[q];ringPoint(i,a,tmp);
        if(!o.on){o.on=true;o.cur.copy(binE);o.sc=.7}o.cur.lerp(tmp,1-Math.exp(-dt*5));o.sc+=(1-o.sc)*kk;
        electrons.put(q,o.cur.x,o.cur.y,o.cur.z,o.sc);
        const settled=o.cur.distanceTo(tmp)<.08;
        for(let m=0;m<5;m++){ringPoint(i,a-(m+1)*.09/(1+i*.3),tmp2);eGlow.put(q*6+m,tmp2.x,tmp2.y,tmp2.z,settled?.32*(1-m/5):0,150-m*18)}
        eGlow.put(q*6+5,o.cur.x,o.cur.y,o.cur.z,.55,260)}});
      for(;q<20;q++){E[q].on=false;electrons.put(q,0,0,0,.001);for(let m=0;m<6;m++)eGlow.put(q*6+m,0,0,0,0,1)}
      electrons.done();eGlow.done();electrons.boundingSphere=null;
      ghosts.forEach((g,i)=>{if(g.life>0){g.life-=dt;g.p.addScaledVector(g.v,dt)}ghostM.put(i,g.p.x,g.p.y,g.p.z,g.life>0?Math.min(1,g.life*1.5):.001)});ghostM.done();
      const fullOuter=sh.length>0&&sh.length<=3&&sh[sh.length-1]===CAP[sh.length-1];
      rings.forEach((r,i)=>{const on=i<sh.length;r.solid.visible=on;r.faint.visible=!on&&i<=sh.length;const want=(fullOuter&&i===sh.length-1&&(k==="ions"||k==="shells"||k==="test"||k==="build"))?.35:0;
        r.glow+=(want-r.glow)*kk;r.full.material.opacity=r.glow*(.75+.25*Math.sin(t*3))});
      const c=s.p-s.e;ionHalo.material.uniforms.color.value.set(c>0?PAL.product.strawberry:PAL.product.blueberry);ionHalo.put(0,0,0,0,c===0?0:.14,3600);ionHalo.done();
      // ---- trays (button press bounce) and tile, table, comparison
      trays.forEach(tr=>{[tr.plus,tr.minus].forEach(b=>{b.userData.press=Math.max(0,b.userData.press-dt*5);b.position.y=-.06*Math.sin(b.userData.press*Math.PI)});
        tr.lab.at(tmp.set(tr.g.position.x,TOP+.55,tr.g.position.z)).set(`${tr.name}<b>${s[tr.key]}</b>`)});
      drawTile(s);
      const [cx,cy,cz]=cellAt(s.p);cursor.position.set(cx,cy+.04+.02*Math.sin(t*4),cz);
      const ckey=s.p+"|"+s.n+"|"+s.e;if(ckey!==lastP){lastP=ckey;for(let z=1;z<=20;z++){const [x,y,w]=cellAt(z);cells.put(z-1,x,y+(z===s.p?.03:0),w,1);cells.tint(z-1,z===s.p?PAL.product.butter:rowC[POS[z][1]])}cells.done()}
      const n0=EL[s.p-1][2]-s.p;cmpK+=((k==="isotopes"?1:0)-cmpK)*(S.REDUCED?1:.08);cmpG.visible=cmpK>.02;cmpG.scale.setScalar(Math.max(.001,cmpK));
      if(cmpG.visible){const key=s.p+"|"+n0;if(key!==cmpKey){cmpKey=key;const NN=s.p+n0,sl=pack(NN);let a=0,b=0;let p2=s.p,n2=n0;
          for(let i=0;i<NN;i++){if(p2&&(!n2||i%2===0)){cP.put(a++,sl[i].x,sl[i].y,sl[i].z,1);p2--}else{cN.put(b++,sl[i].x,sl[i].y,sl[i].z,1);n2--}}
          for(;a<20;a++)cP.put(a,0,0,0,.001);for(;b<22;b++)cN.put(b,0,0,0,.001);cP.done();cN.done()}
        cmpNuc.rotation.y+=dt*.35}
      // ---- atom labels
      const El=EL[s.p-1],A=s.p+s.n,ion=c!==0;
      lName.at(tmp.set(TL.x+.9,TOP+2.5,TL.z)).set(`${El[1]}${ion?" ion":""}<small>${ion?"charge "+(Math.abs(c)>1?Math.abs(c):"")+(c>0?"+":"−"):"neutral atom"}${k==="shells"?` · ${shells(s.p).length} shells, ${shells(s.p).slice(-1)[0]} outer electron${shells(s.p).slice(-1)[0]>1?"s":""}`:""}</small>`);
      lNuc.at(tmp.copy(AC).add(V3(-nucR*.7,-nucR*.6,0))).set(`Nucleus<small>${s.p} proton${s.p!==1?"s":""} (+) · ${s.n} neutron${s.n!==1?"s":""}</small>`);
      const oi=sh.length-1;if(oi>=0){ringPoint(oi,.35,tmp);shG.localToWorld(tmp)}else tmp.copy(AC);
      lE.at(tmp).set(`${s.e} electron${s.e!==1?"s":""} (−)<small>in shells ${sh.join(",")||"none"}</small>`);
      lShell.forEach((L,i)=>{if(k!=="shells"){return}const on=i<sh.length;L.show(on);if(!on)return;ringPoint(i,SHA[i],tmp);shG.localToWorld(tmp);L.at(tmp).set(`Shell ${i+1}<b>${sh[i]} of ${CAP[i]}</b>`)});
      lMass.at(tmp.set(TL.x-.72,TOP+2.15,TL.z+.28)).set(`Mass number <b>${A}</b><small>${s.p} protons + ${s.n} neutrons</small>`);
      lAtomic.at(tmp.set(TL.x-.72,TOP+.6,TL.z+.28)).set(`Atomic number <b>${s.p}</b><small>protons: decides the element</small>`);
      lNeutEq.at(tmp.copy(AC).add(V3(-nucR*.5,nucR*.6,0))).set(`Neutrons = ${A} − ${s.p} = <b>${s.n}</b>`);
      const sym=El[0]+(ion?(Math.abs(c)>1?Math.abs(c):"")+(c>0?"⁺":"⁻"):"");
      lCharge.at(tmp.copy(AC).add(V3(.3,.5,0))).set(`${sym}<small>${s.p} protons (+), ${s.e} electrons (−): ${c===0?"no overall charge":"charge "+(Math.abs(c)>1?Math.abs(c):"")+(c>0?"+":"−")}</small>`);
      if(oi>=0){ringPoint(oi,Math.PI*1.15,tmp);shG.localToWorld(tmp)}lTap.at(tmp);lTap.show(k==="ions"&&s.e>0);
      lIso.at(tmp.copy(AC).add(V3(-nucR*.6,nucR*.5,0))).set(`${El[1]}-${A}<small>${s.p} protons · ${s.n} neutrons${s.p===6&&s.n===8?" · radioactive":""}</small>`);
      lCmp.at(tmp.set(CM.x+.3,TOP+1.5,CM.z)).set(`${El[1]}-${El[2]}<small>${s.p} protons · ${n0} neutrons${n0===s.n?" · same as yours":""}</small>`);
      lTable.at(tmp.set(ptG.position.x+1.5,ptG.position.y+.3,ptG.position.z+.6));
      // ---- gold foil
      fz.visible=true;
      const live=new Set();const playing=s.playing&&st.speed;
      for(const a of s.alphas){live.add(a);let r=vis.get(a);if(!r){const ang=Math.random()*Math.PI*2,rr=Math.sqrt(Math.random())*.07,phi=(Math.random()-.5)*1.0+(Math.random()<.5?0:Math.PI);
          r={x:a.x,vx:a.vx,vy:a.vy,done:false,jy:Math.sin(ang)*rr,jz:Math.cos(ang)*rr,phi,dy:(Math.random()-.5)*.05,dz:(Math.random()-.5)*.05,cat:null,dead:false,px:0,py:0,pz:0};vis.set(a,r)}
        r.x=a.x;r.vx=a.vx;r.vy=a.vy;if(a.done&&!r.done){r.done=true;r.cat=a.vx<0?"back":a.vy!==0?"small":"straight"}}
      let ai=0,ti=0;
      for(const [a,r] of vis){if(r.dead){vis.delete(a);continue}
        if(!live.has(a)){if(!r.done){vis.delete(a);continue}if(playing)r.x+=r.vx*dt*st.speed}
        let x,y,z;
        if(!r.done){x=(r.x-324)*K;y=r.jy;z=r.jz}
        else{const tt=Math.max(0,(r.x-324)/r.vx),L=Math.hypot(r.vx,r.vy),d=tt*L*K;
          let dx=r.vx/L,dy=r.vy/L*Math.sin(r.phi),dz=r.vy/L*Math.cos(r.phi);if(r.cat==="straight"){dy+=r.dy;dz+=r.dz}
          x=dx*d;y=r.jy+dy*d;z=r.jz+dz*d;
          if(Math.hypot(x,z)>=R){const f=R/Math.hypot(x,z);x*=f;z*=f;r.dead=true;
            const fl=fls[fi=(fi+1)%fls.length];fl.p.set(x,FC.y+y,z);fl.life=.6;const M=marks[r.cat];const m=M.a[M.i=(M.i+1)%M.a.length];m.p.set(x*.985,FC.y+y,z*.985);m.life=1;continue}}
        if(ai>=NA)continue;alphas.put(ai,x,FC.y+y,z,1);
        const vx=r.done?r.vx:220,vy=r.done?r.vy:0,L=Math.hypot(vx,vy)*K;
        for(let m=1;m<=4;m++){const back=m*.05;let tx,ty,tz;
          if(r.done){const L2=Math.hypot(r.vx,r.vy);tx=x-r.vx/L2*back*4.4;ty=y-r.vy/L2*Math.sin(r.phi)*back*4.4;tz=z-r.vy/L2*Math.cos(r.phi)*back*4.4;if(Math.sign(tx)!==Math.sign(x)&&Math.abs(x)<.3){tx=x;ty=y;tz=z}}
          else{tx=x-back*4.4*L/L;ty=y;tz=z}
          trail.put(ti++,tx,FC.y+ty,tz,.5*(1-m/5),120-m*16)}
        ai++}
      for(let i=ai;i<NA;i++)alphas.put(i,0,-5,0,.001);alphas.done();for(;ti<trail.n;ti++)trail.put(ti,0,-5,0,0,1);trail.done();
      fls.forEach((f,i)=>{if(f.life>0)f.life-=dt;flash.put(i,f.p.x,f.p.y,f.p.z,Math.max(0,f.life)*1.4,520*(1.2-f.life))});flash.done();
      for(const kname in marks){const M=marks[kname];M.a.forEach((m,i)=>{if(m.life>0&&playing)m.life-=dt*.06;MK[kname].put(i,m.p.x,m.p.y,m.p.z,Math.max(0,m.life)*.85,kname==="straight"?70:110)});MK[kname].done()}
      tracks.forEach((tr,i)=>{tr.ph+=dt*(playing?.32:0);const u=tr.ph%1.25,n=tr.pts.length,j=Math.min(n-1,Math.floor(u*n)),on=u<1;const p=tr.pts[j];zA.put(i,p.x,p.y,p.z,on?1:.001);
        for(let m=1;m<=6;m++){const q=tr.pts[Math.max(0,j-m*3)];zT.put(i*6+m-1,q.x,q.y,q.z,on?.45*(1-m/7):0,70)}});zA.done();zT.done();
      lZoom.at(tmp.set(FC.x+BR*.7,FC.y+2.3+BR*.6,0));
      coreM.emissiveIntensity=4.5+1.5*Math.sin(t*6);
      const h=s.hits,tot=h.straight+h.small+h.back;
      scoreT-=dt;const skey=tot+"";if(foilOn&&skey!==scoreKey&&scoreT<=0){scoreKey=skey;scoreT=.25;
        score.redraw((g,w,hh)=>{g.fillStyle="#fff";g.fillRect(0,0,w,hh);g.fillStyle="#6E6A86";g.font=`600 22px ${FONT}`;g.textAlign="left";g.fillText("WHAT THE DETECTOR SEES",24,38);
          [["Straight through",h.straight,"#6FA3E8"],["Bent a little",h.small,"#F2C83C"],["Bounced back",h.back,"#E8688A"]].forEach(([n,v,col],i)=>{const y=70+i*74,f=tot?v/tot:0;
            g.fillStyle="#222A55";g.font=`600 24px ${FONT}`;g.textAlign="left";g.fillText(n,24,y+18);g.textAlign="right";g.fillText(`${v} (${(f*100).toFixed(1)}%)`,w-24,y+18);
            g.fillStyle="#EEEAF6";g.beginPath();g.roundRect(24,y+30,w-48,18,9);g.fill();g.fillStyle=col;g.beginPath();g.roundRect(24,y+30,Math.max(18,(w-48)*f),18,9);g.fill()})})}
      lSrc.at(tmp.set(FC.x+src.position.x,FC.y+.5,0));lFoil.at(tmp.set(FC.x,FC.y+.55,-.5));lDet.at(tmp.set(FC.x+R*Math.cos(-.9),FC.y+.95,R*Math.sin(-.9)));
      lStraight.at(tmp.set(FC.x+R,FC.y-.3,0)).set(`Straight through<b>${tot?(h.straight/tot*100).toFixed(1):"0"}%</b>`);
      lBack.at(tmp.set(FC.x-R*.97,FC.y-.6,R*.24)).set(`Bounced back<b>${h.back} of ${tot}</b>`);
      lScale.at(tmp.set(FC.x,TOP,R+.4));
    }};
}
StudyKit.mount({kupu:KUPU,scene3d:atoms3d,
  eyebrow:"Science · Atoms", title:"The atom machine", crumb:"Year 9–10 science · atoms, the periodic table, ions and isotopes", homeHash:"y9",
  fig:"FIG. 08 · BUILD AN ATOM", railTitle:"What everything is made of",
  mainBox:"0 0 640 330", mainPhoneBig:true, mainLabel:"An atom with its nucleus and electron shells", closeBox:"0 0 420 260",
  state:s, steps,
  controls:[{type:"play"},{type:"button",id:"reset",label:"Clear screen",onClick:()=>{s.alphas=[];s.hits={straight:0,small:0,back:0}}},
    {type:"range",id:"p",label:"Protons",min:1,max:20,step:1,get:()=>s.p,set:(x,v)=>{s.p=v},fmt:()=>String(s.p)},
    {type:"range",id:"n",label:"Neutrons",min:0,max:22,step:1,get:()=>s.n,set:(x,v)=>{s.n=v},fmt:()=>String(s.n)},
    {type:"range",id:"e",label:"Electrons",min:0,max:20,step:1,get:()=>s.e,set:(x,v)=>{s.e=v},fmt:()=>String(s.e)}],
  tick:(x,dt,st)=>{if(st.k==="foil")tickFoil(dt);else s.spin+=dt*1.4},
  drawMain:(x,st)=>st.k==="foil"?drawFoil():drawAtom(st), drawClose,
  chips:()=>{const sh=shells(s.e),h=s.hits;return{el:["ELEMENT",el()[1],true],pne:["P · N · E",`${s.p} · ${s.n} · ${s.e}`],chg:["CHARGE",chargeStr()],mass:["MASS NUMBER",String(s.p+s.n)],neut:["NEUTRONS",String(s.n)],
    arr:["ARRANGEMENT",sh.join(",")||"none"],hits:["BOUNCED BACK",`${h.back} of ${h.straight+h.small+h.back}`]}},
  challenges:[
    {q:"Build a chloride ion, Cl⁻ (chlorine-35).",check:()=>s.p===17&&s.n===18&&s.e===18,ok:"Yes: 17 protons, 18 neutrons, 18 electrons. One extra electron gives a full outer shell (2,8,8) and a 1− charge.",no:()=>`Not yet: you have ${s.p} protons, ${s.n} neutrons, ${s.e} electrons.`},
    {q:"Build carbon-14.",check:()=>s.p===6&&s.n===8&&s.e===6,ok:"Yes: 6 protons and 8 neutrons give mass number 14.",no:"Not yet. Carbon always has 6 protons; the mass number is protons plus neutrons."},
    {q:"Build a neutral atom with three shells and a full outer shell.",check:()=>s.p===18&&s.e===18,ok:"Yes: argon, 2,8,8. A noble gas, so it hardly reacts.",no:"Not yet. Which element fills its third shell exactly?"}],
  papers:[{label:"Te Ara: Ernest Rutherford",url:"https://teara.govt.nz/en/biographies/3r37/rutherford-ernest"}],
  truth:"Electrons are drawn as dots in fixed shells, a simplified model used at school. Sizes are not to scale. The gold foil simulation is a picture of the result, not a physics model.",
  footer:"Atomic structure, ions and isotopes are Year 9–10 science (matter and the periodic table) and lead into NCEA Level 1 Chemistry and Biology."
});
})();
