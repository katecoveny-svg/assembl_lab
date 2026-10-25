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
StudyKit.mount({kupu:KUPU,
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
