/* The engine machine: real car parts (NVIDIA SimReady models, CC BY 4.0, see ../refs/simready/CREDITS.md) shown see-through
   and cut open, driven by a simplified physics model for NCEA Level 1–2 forces and energy. Pressure → force on a piston,
   force × distance → work, force × radius → torque, torque × spin → power, friction on a brake disc → heat, a spring → stored
   energy. Every number is the model's own; the 3D parts are the picture, not the data. */
(()=>{
const s={P:30,bore:86,stroke:86,rpm:3000,m:1400,v:50,mu:0.4,k:40,x:0,
  pos:0,ang:0,brakeAng:0,vb:50/3.6,braking:false,heat:0,dist:0,playing:true};
const fmt=(x,d=0)=>Number(x).toLocaleString("en-NZ",{maximumFractionDigits:d,minimumFractionDigits:d});
const area=()=>Math.PI*Math.pow(s.bore/2000,2);            // m²
const force=()=>s.P*1e5*area();                             // N (1 bar = 100 000 Pa)
const work=()=>force()*s.stroke/1000;                       // J per power stroke
const torque=()=>force()*s.stroke/2000;                     // N m, crank radius = half the stroke
const omega=()=>s.rpm*2*Math.PI/60;                         // rad/s
const power=()=>work()*s.rpm/120;                           // W: one power stroke every two turns (4-stroke, one cylinder)
const Ek=()=>0.5*s.m*Math.pow(s.v/3.6,2);                   // J at the chosen speed
const friction=()=>s.mu*s.m*9.8;                            // N, treating the whole car as braked
const stopD=()=>Ek()/friction();                            // m, W = Fd
const Es=()=>0.5*s.k*1000*Math.pow(s.x/1000,2);            // J in the spring, k in kN/m, x in mm
const Fs=()=>s.k*1000*s.x/1000;                             // N
const kJ=J=>J>=1e6?fmt(J/1e6,2)+" MJ":J>=1000?fmt(J/1000,1)+" kJ":fmt(J)+" J";
const set=k=>(x,v)=>{s[k]=v};
function resetBrake(){s.vb=s.v/3.6;s.braking=false;s.heat=0;s.dist=0}
// ---------------------------------------------------------------- the drawings (the fallback, and the whole picture under ?lite)
const F=StudyKit.fig,PAL=F.palette,TINT="#F9D2B8";
function drawPiston(st){let o=F.floor(640,330);
  const cx=200,top=60,H=200,bw=110;const t=st.k==="piston"?0.25:0.5+0.5*Math.sin(s.pos*Math.PI*2);
  o+=F.acrylic(cx-bw/2-10,top-10,bw+20,H+20,{tint:TINT,d:14,r:10});
  const py=top+H*0.12+t*H*0.55;
  o+=F.cyl(cx,py,bw/2-6,34,{colour:PAL.steel,kind:"metal",shadow:false});
  o+=`<rect x="${cx-7}" y="${py+34}" width="14" height="${top+H-py-30}" fill="#8F9BAA" stroke="#5E6873"/>`;
  for(let i=0;i<6;i++){const a=Math.PI*(i/6);o+=`<path d="M${cx+Math.cos(a)*(bw/2-14)},${py-16-Math.sin(a)*18} v8" stroke="${PAL.copper}" stroke-width="3" stroke-linecap="round"/>`}
  o+=`<rect x="${cx-bw/2+2}" y="${top}" width="${bw-4}" height="${py-top-6}" fill="${PAL.product.peach}" opacity="${0.25+0.5*(s.P/60)}"/>`;
  o+=F.pill(360,70,"Pressure",{sub:`${fmt(s.P)} bar = ${fmt(s.P*1e5/1000)} kPa`,ax:cx,ay:top+20});
  o+=F.pill(360,120,"Area",{sub:`π × (${fmt(s.bore/2)} mm)² = ${fmt(area()*1e4,1)} cm²`,ax:cx+bw/2-6,ay:py+2});
  o+=F.pill(360,170,"Force",{sub:`${fmt(s.P)} × 10⁵ × ${fmt(area(),5)} = ${fmt(force()/1000,1)} kN`,ax:cx,ay:py+20,lead:PAL.copper});
  if(st.k==="stroke")o+=F.pill(360,220,"Work per stroke",{sub:`${fmt(force()/1000,1)} kN × ${fmt(s.stroke/1000,3)} m = ${kJ(work())}`});
  o+=`<text class="t-lab" x="16" y="22">${st.k==="piston"?"GAS PRESSURE PUSHES ON THE PISTON CROWN":"THE PISTON TRAVELS ONE STROKE"}</text>`;return o}
function drawCrank(){let o=F.floor(640,330);const cx=250,cy=180,r=70;
  o+=F.cyl(cx,cy-12,110,24,{colour:PAL.steel,kind:"metal",ry:34});
  const a=s.ang;o+=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#8F9BAA" stroke-dasharray="4 4"/>`;
  const px=cx+Math.cos(a)*r,py=cy+Math.sin(a)*r;o+=`<line x1="${cx}" y1="${cy}" x2="${px}" y2="${py}" stroke="${PAL.copper}" stroke-width="10" stroke-linecap="round"/><circle cx="${px}" cy="${py}" r="12" fill="${PAL.steel}" stroke="#5E6873"/>`;
  o+=`<path d="M${px},${py-40} v30" stroke="${"#B5466F"}" stroke-width="4" marker-end="url(#arr)"/>`;
  o+=F.pill(400,70,"Torque",{sub:`${fmt(force()/1000,1)} kN × ${fmt(s.stroke/2000,3)} m = ${fmt(torque())} N m`,ax:px,ay:py});
  o+=F.pill(400,120,"Spin",{sub:`${fmt(s.rpm)} rpm = ${fmt(omega(),1)} rad/s`});
  o+=F.pill(400,170,"Power",{sub:`${kJ(work())} × ${fmt(s.rpm/120,1)} strokes/s = ${fmt(power()/1000,1)} kW`});
  o+=`<text class="t-lab" x="16" y="22">FORCE ON THE CRANK PIN TURNS THE SHAFT</text>`;return o}
function drawBrake(){let o=F.floor(640,330);const cx=230,cy=175,R=95;
  const hot=Math.min(1,s.heat/Ek());o+=`<circle cx="${cx}" cy="${cy}" r="${R}" fill="${hot>0.05?`rgb(${200+55*hot},${190-110*hot},${190-150*hot})`:PAL.steel}" stroke="#5E6873" stroke-width="2"/><circle cx="${cx}" cy="${cy}" r="${R*.45}" fill="${PAL.paper}" stroke="#8F9BAA"/>`;
  for(let i=0;i<5;i++){const a=s.brakeAng+i*Math.PI*2/5;o+=`<circle cx="${cx+Math.cos(a)*R*.3}" cy="${cy+Math.sin(a)*R*.3}" r="6" fill="#8F9BAA"/>`}
  o+=`<path d="M${cx-30},${cy-R-14} h60 v40 h-60z" fill="${PAL.product.strawberry}" stroke="#A8455E" stroke-width="1.5" rx="6"/>`;
  o+=F.pill(400,70,"Kinetic energy",{sub:`½ × ${fmt(s.m)} × ${fmt(s.v/3.6,1)}² = ${kJ(Ek())}`});
  o+=F.pill(400,120,"Friction",{sub:`${fmt(s.mu,2)} × ${fmt(s.m)} × 9.8 = ${fmt(friction()/1000,1)} kN`,ax:cx,ay:cy-R+10,lead:"#A8455E"});
  o+=F.pill(400,170,"Stopping distance",{sub:`${kJ(Ek())} ÷ ${fmt(friction()/1000,1)} kN = ${fmt(stopD(),1)} m`});
  o+=F.pill(400,220,"Heat in the disc",{sub:`${kJ(s.heat)} so far · ${fmt(s.dist,1)} m travelled`});
  o+=`<text class="t-lab" x="16" y="22">${s.braking?"BRAKING: KINETIC ENERGY BECOMES HEAT":"PRESS PLAY TO BRAKE FROM "+fmt(s.v)+" KM/H"}</text>`;return o}
function drawStrut(){let o=F.floor(640,330);const cx=220,base=290,free=200,L=free-s.x*1.3;
  o+=F.box(cx-50,base,100,14,{colour:"#E3DCCF",kind:"painted",d:10});
  o+=F.cyl(cx,base-L*.45,16,L*.45,{colour:PAL.steel,kind:"metal",shadow:false});
  const n=9;for(let i=0;i<=n;i++){const y=base-L*(i/n);o+=`<ellipse cx="${cx}" cy="${y}" rx="34" ry="8" fill="none" stroke="${PAL.copper}" stroke-width="4"/>`}
  o+=F.box(cx-40,base-L-16,80,16,{colour:PAL.case.sky,kind:"plastic",d:8,r:4,shadow:false});
  o+=`<path d="M${cx},${base-L-60} v36" stroke="${"#B5466F"}" stroke-width="4"/>`;
  o+=F.pill(400,70,"Spring force",{sub:`${fmt(s.k)} kN/m × ${fmt(s.x)} mm = ${fmt(Fs()/1000,2)} kN`,ax:cx,ay:base-L-20});
  o+=F.pill(400,120,"Stored energy",{sub:`½ × ${fmt(s.k*1000)} × ${fmt(s.x/1000,3)}² = ${kJ(Es())}`});
  o+=F.pill(400,170,"Twice the squash",{sub:`${kJ(0.5*s.k*1000*Math.pow(2*s.x/1000,2))} (four times the energy)`});
  o+=`<text class="t-lab" x="16" y="22">A COIL-OVER STRUT: THE SPRING STORES ENERGY</text>`;return o}
// ---------------------------------------------------------------- the real-time 3D bench
function engine3d(S){const {THREE,mat,PAL}=S;const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
  const REF="../refs/simready/";
  const plinth=S.rbox(7,.34,5.4,.14,mat("plastic",PAL.case.peach,{rough:.55,coat:.2}));plinth.position.y=.17;S.scene.add(plinth);
  S.view("part",[6.4,4.4,7.4],[0,1.9,0],{min:3,max:16});S.view("close",[4.6,3.6,5.6],[0,2,0],{min:2.5,max:12});
  const stage=S.group();stage.position.y=.34;
  // the four parts load on demand (each under 2 MB); a frosted block stands in until the model arrives
  const ghost=S.rbox(2.6,2.6,2.6,.3,mat("acrylic",PAL.case.peach,{opacity:.22}),{cast:false});ghost.position.y=1.6;stage.add(ghost);
  const credit=document.createElement("p");credit.className="s3-badge";credit.style.cssText="right:auto;left:12px;top:10px;text-transform:none;letter-spacing:0";credit.textContent="Loading the real part…";S.canvas.parentNode.appendChild(credit);
  const parts={},want={piston:"engineComponent_cylinder_piston_a01",stroke:"engineComponent_cylinder_piston_a01",crank:"engineComponent_crankshaft_b01",brake:"brakeSystem_brakes_assembly_b01",strut:"suspension_strut_assembly_a01",test:"engineComponent_cylinder_piston_a01"};
  const fit={engineComponent_cylinder_piston_a01:3.4,engineComponent_crankshaft_b01:4.6,brakeSystem_brakes_assembly_b01:3.2,suspension_strut_assembly_a01:3.6};
  let shown=null,cut=null,glassAmt=.6;
  const lab=S.label({cls:"big"}),lab2=S.label(),lab3=S.label();
  const arrowF=S.arrow("#B5466F",{r:.05});S.scene.add(arrowF);
  async function show(key){const name=want[key];if(!name)return;
    if(!parts[name]){credit.textContent="Loading the real part…";credit.hidden=false;
      try{const g=await S.glb(REF+name+".glb",{fit:fit[name]});parts[name]=g;}catch(e){console.warn("GLB failed, keeping the drawing",e);credit.textContent="3D part unavailable here; the drawing below shows the idea.";return}}
    if(shown&&shown!==parts[name]){stage.remove(shown)}
    shown=parts[name];if(!shown.parent)stage.add(shown);ghost.visible=false;
    credit.hidden=false;credit.textContent="3D part: NVIDIA SimReady (CC BY 4.0), browser GLB by CodePawl · Simulated";
    S.seeThrough(shown,glassAmt);cut=S.cutaway(shown,[1,0,0]);cut.set(cutAmt);
    S.goView(key==="stroke"||key==="piston"?"close":"part")}
  let cutAmt=0;
  // the piston head slides on its joint; the crank and the disc turn. Node names come from the GLB (…_obj_00).
  const node=(g,re)=>{let f=null;g&&g.traverse(n=>{if(!f&&re.test(n.name||""))f=n});return f};
  const world={
    step(st){show(st.k);cutAmt=0;cut&&cut.set(0)},
    setCut(t){cutAmt=t;cut&&cut.set(t)},setGlass(a){glassAmt=a;shown&&S.seeThrough(shown,a)},
    update(state,st,dt,t){if(!shown)return;const k=st.k;const sz=shown.userData.size;
      arrowF.visible=false;lab.hide();lab2.hide();lab3.hide();
      if(k==="piston"||k==="stroke"||k==="test"){const head=node(shown,/^head_/);const tr=k==="piston"?0:0.5-0.5*Math.cos(s.pos*Math.PI*2);
        if(head){if(head.userData.y0==null)head.userData.y0=head.position.y;head.position.y=head.userData.y0-tr*(s.stroke/1000)/shown.userData.k*0.5}
        const top=V3(0,sz.y*.95,0);arrowF.set(top.clone().add(V3(0,.9,0)),V3(0,-1,0),.3+force()/40000);arrowF.visible=true;
        lab.at(V3(0,sz.y*.78,sz.z*.5)).set(`Force on the piston<b>${fmt(force()/1000,1)} kN</b><small>${fmt(s.P)} bar × ${fmt(area()*1e4,1)} cm²</small>`).show();
        if(k!=="piston")lab2.at(V3(sz.x*.5,sz.y*.4,0)).set(`One stroke<b>${kJ(work())}</b><small>${fmt(s.stroke)} mm</small>`).show()}
      if(k==="crank"){shown.rotation.z=0;const sh=node(shown,/^crankshaft_/)||shown;sh.rotation.x=s.ang;
        lab.at(V3(0,sz.y*.9,0)).set(`Torque<b>${fmt(torque())} N m</b><small>${fmt(force()/1000,1)} kN × ${fmt(s.stroke/2,0)} mm</small>`).show();
        lab2.at(V3(sz.x*.45,sz.y*.3,0)).set(`Power<b>${fmt(power()/1000,1)} kW</b><small>${fmt(s.rpm)} rpm</small>`).show()}
      if(k==="brake"){const disc=node(shown,/^disc_/);if(disc)disc.rotation.y=s.brakeAng;
        const hot=Math.min(1,s.heat/Math.max(1,Ek()));disc&&disc.traverse(m=>{if(m.isMesh&&m.material&&m.material.emissive){m.material.emissive.setRGB(hot,hot*.25,0);m.material.emissiveIntensity=hot*1.4}});
        lab.at(V3(0,sz.y*.95,0)).set(`${s.braking?"Heat in the disc":"Kinetic energy"}<b>${kJ(s.braking?s.heat:Ek())}</b><small>${s.braking?fmt(s.vb*3.6)+" km/h left":fmt(s.v)+" km/h"}</small>`).show();
        lab2.at(V3(sz.x*.4,sz.y*.5,0)).set(`Friction<b>${fmt(friction()/1000,1)} kN</b><small>μ = ${fmt(s.mu,2)}</small>`).show();
        lab3.at(V3(-sz.x*.4,sz.y*.2,0)).set(`Stops in<b>${fmt(stopD(),1)} m</b>`).show()}
      if(k==="strut"){shown.scale.y=shown.userData.k*(1-s.x/600);
        lab.at(V3(0,sz.y*.95,0)).set(`Spring force<b>${fmt(Fs()/1000,2)} kN</b><small>${fmt(s.k)} kN/m × ${fmt(s.x)} mm</small>`).show();
        lab2.at(V3(sz.x*.5,sz.y*.4,0)).set(`Stored<b>${kJ(Es())}</b><small>½kx²</small>`).show()}
    }};
  window.__engineWorld=world;return world;
}
// the see-through and cut-open sliders only mean something on the 3D bench; under ?lite (or without WebGL) they stay off the page
const HAS3D=!/[?&]lite\b/.test(location.search)&&(()=>{try{const c=document.createElement("canvas");return !!(c.getContext("webgl2")||c.getContext("webgl"))}catch(e){return false}})();
const C3=(...a)=>HAS3D?a:a.filter(x=>x!=="glass"&&x!=="cutp");
const steps=[
 {k:"piston",lab:"Push",cap:"Hot gas pushes on the piston. Force = pressure × area. Turn up the pressure, or fit a wider piston, and watch the force.",controls:C3("P","bore","glass","cutp"),speed:0,
  big:"<b>The big idea:</b> pressure is force spread over an area, so F = P × A. Double the area at the same pressure and you double the force.",
  exam:()=>`F = P × A = ${fmt(s.P)} × 10⁵ Pa × ${fmt(area(),5)} m² = ${fmt(force())} N, about ${fmt(force()/1000,1)} kN on the piston crown.`,
  trap:"Mixing units. Pressure in pascals needs area in square metres: 1 bar = 100 000 Pa, and 86 mm is 0.086 m.",chips:["P","A","F"]},
 {k:"stroke",lab:"Stroke",cap:"The piston travels one stroke. Work = force × distance, and that work is the energy one bang gives the engine.",controls:C3("play","P","bore","stroke","glass","cutp"),speed:1,
  big:"<b>The big idea:</b> work done = force × distance moved in the direction of the force, W = Fd. The result is energy, in joules.",
  exam:()=>`W = Fd = ${fmt(force())} N × ${fmt(s.stroke/1000,3)} m = ${fmt(work())} J per power stroke. (Simplified: a real cylinder's pressure falls as the piston moves.)`,
  trap:"Using the whole bore as the distance. Distance is how far the piston moves (the stroke), not how wide it is.",chips:["F","d","W"]},
 {k:"crank",lab:"Crank",cap:"The con-rod pushes the crank pin round. Force × radius is torque; torque × spin rate is power.",controls:C3("play","P","rpm","glass","cutp"),speed:1,
  big:"<b>The big idea:</b> power is how fast work is done, P = W ÷ t. Spin faster (more strokes a second) and the same work per stroke makes more power.",
  exam:()=>`Torque = F × r = ${fmt(force())} × ${fmt(s.stroke/2000,3)} = ${fmt(torque())} N m. Power = work per stroke × strokes per second = ${fmt(work())} J × ${fmt(s.rpm/120,1)} /s = ${fmt(power()/1000,1)} kW (one cylinder, four-stroke).`,
  trap:"Confusing torque with power. Torque is the twist (N m); power is how fast that twist does work (W = J/s).",chips:["T","rpm","Pw"]},
 {k:"brake",lab:"Brake",cap:"Press play to brake. The pads rub the disc, friction does work on the car, and the kinetic energy turns into heat in the disc.",controls:C3("play","restart","m","v","mu","glass","cutp"),speed:1,
  big:"<b>The big idea:</b> energy is conserved. ½mv² of kinetic energy becomes heat; the friction force times the stopping distance equals that energy, so d = Ek ÷ F.",
  exam:()=>`Ek = ½mv² = ½ × ${fmt(s.m)} × ${fmt(s.v/3.6,1)}² = ${fmt(Ek())} J. Friction F = μN = ${fmt(s.mu,2)} × ${fmt(s.m)} × 9.8 = ${fmt(friction())} N. Stopping distance d = Ek ÷ F = ${fmt(stopD(),1)} m. Double the speed and d is four times longer.`,
  trap:"Doubling the speed doubles the stopping distance. It does not: Ek depends on v², so it is four times.",chips:["Ek","Ff","d2","heat"],onStep:()=>resetBrake()},
 {k:"strut",lab:"Spring",cap:"A coil-over strut. Squash the spring: the force grows with the squash (F = kx) and the stored energy grows with its square.",controls:C3("k","x","glass","cutp"),speed:0,
  big:"<b>The big idea:</b> a spring stores elastic potential energy, Es = ½kx². Twice the squash is four times the energy.",
  exam:()=>`F = kx = ${fmt(s.k*1000)} N/m × ${fmt(s.x/1000,3)} m = ${fmt(Fs())} N. Es = ½kx² = ½ × ${fmt(s.k*1000)} × ${fmt(s.x/1000,3)}² = ${fmt(Es(),1)} J.`,
  trap:"Forgetting to square x. The energy is half k x squared, so the units only work with x in metres.",chips:["Fs","Es"]},
 {k:"test",lab:"Test yourself",cap:"Set the controls so each statement is true, then press Check. Allen can give a hint.",controls:["P","bore","stroke","rpm","m","v","mu","k","x"],speed:0,chips:["F","Ek","Es"]}
];
const KUPU=[{mi:"pēhanga",en:"pressure",ta:"pēhanga",chip:"P"},{mi:"tōpana",en:"force",ta:"tōpana",chip:"F"},{mi:"pūngao",en:"energy",ta:"pūngao",chip:"Ek"},{mi:"wera",en:"heat",ta:"wera",chip:"heat"}];
StudyKit.mount({kupu:KUPU,scene3d:engine3d,
  eyebrow:"Physics · Forces and energy", title:"The engine machine", homeHash:"l2",
  fig:"FIG. 06 · PISTON, CRANK, DISC BRAKE, STRUT", railTitle:"Inside a car",
  badge:{label:"NCEA L2 Physics 91171",exam:"2026-11-18T14:00:00+13:00",examText:"Wed 18 Nov, 2pm"},
  mainBox:"0 0 640 330", mainLabel:"Real car parts: a piston in its cylinder, a crankshaft, a disc brake and a strut",
  state:s, steps,
  controls:[{type:"play"},{type:"button",id:"restart",label:"Restart",onClick:()=>resetBrake()},
    {type:"range",id:"P",label:"Pressure",min:5,max:60,step:1,get:()=>s.P,set:set("P"),fmt:()=>fmt(s.P)+" bar"},
    {type:"range",id:"bore",label:"Bore",min:60,max:100,step:1,get:()=>s.bore,set:set("bore"),fmt:()=>s.bore+" mm"},
    {type:"range",id:"stroke",label:"Stroke",min:60,max:100,step:1,get:()=>s.stroke,set:set("stroke"),fmt:()=>s.stroke+" mm"},
    {type:"range",id:"rpm",label:"Spin",min:800,max:7000,step:100,get:()=>s.rpm,set:set("rpm"),fmt:()=>fmt(s.rpm)+" rpm"},
    {type:"range",id:"m",label:"Car mass",min:800,max:2500,step:50,get:()=>s.m,set:(x,v)=>{s.m=v;resetBrake()},fmt:()=>fmt(s.m)+" kg"},
    {type:"range",id:"v",label:"Speed",min:10,max:120,step:5,get:()=>s.v,set:(x,v)=>{s.v=v;resetBrake()},fmt:()=>s.v+" km/h"},
    {type:"range",id:"mu",label:"Grip μ",min:0.1,max:0.9,step:0.05,get:()=>s.mu,set:(x,v)=>{s.mu=v;resetBrake()},fmt:()=>fmt(s.mu,2)+(s.mu<.25?" (ice)":s.mu<.5?" (wet)":" (dry)")},
    {type:"range",id:"k",label:"Stiffness",min:10,max:100,step:5,get:()=>s.k,set:set("k"),fmt:()=>s.k+" kN/m"},
    {type:"range",id:"x",label:"Squash",min:0,max:120,step:5,get:()=>s.x,set:set("x"),fmt:()=>s.x+" mm"},
    {type:"range",id:"glass",label:"See-through",min:0,max:100,step:5,get:()=>Math.round(s.glass??60),set:(x,v)=>{s.glass=v;window.__engineWorld&&window.__engineWorld.setGlass(v/100)},fmt:()=>Math.round(s.glass??60)+"%"},
    {type:"range",id:"cutp",label:"Cut open",min:0,max:100,step:5,get:()=>Math.round(s.cut||0),set:(x,v)=>{s.cut=v;window.__engineWorld&&window.__engineWorld.setCut(v/100)},fmt:()=>Math.round(s.cut||0)+"%"}],
  tick:(x,dt,st)=>{if(st.k==="stroke"||st.k==="test")s.pos=(s.pos+dt*0.5)%1;
    if(st.k==="crank")s.ang+=omega()*dt*0.15;
    if(st.k==="brake"){if(!s.braking){s.braking=true}const a=s.mu*9.8;const v0=s.vb;s.vb=Math.max(0,s.vb-a*dt*0.6);const dd=(v0+s.vb)/2*dt*0.6;s.dist+=dd;s.heat=Math.min(Ek(),s.heat+friction()*dd);s.brakeAng+=s.vb*dt*2;if(s.vb<=0)s.playing=false}},
  drawMain:(x,st)=>st.k==="crank"?drawCrank():st.k==="brake"?drawBrake():st.k==="strut"?drawStrut():drawPiston(st),
  chips:()=>({P:["PRESSURE",fmt(s.P)+" bar"],A:["AREA",fmt(area()*1e4,1)+" cm²"],F:["FORCE",fmt(force()/1000,1)+" kN",true],d:["STROKE",s.stroke+" mm"],W:["WORK",kJ(work()),true],
    T:["TORQUE",fmt(torque())+" N m"],rpm:["SPIN",fmt(s.rpm)+" rpm"],Pw:["POWER",fmt(power()/1000,1)+" kW",true],Ek:["KINETIC",kJ(Ek()),true],Ff:["FRICTION",fmt(friction()/1000,1)+" kN"],d2:["STOPS IN",fmt(stopD(),1)+" m"],heat:["HEAT",kJ(s.heat)],
    Fs:["SPRING FORCE",fmt(Fs()/1000,2)+" kN"],Es:["STORED",kJ(Es()),true]}),
  challenges:[
    {q:"Set the pressure and bore so the force on the piston is between 20 and 22 kN.",check:()=>force()>=20000&&force()<=22000,ok:()=>`Yes: ${fmt(s.P)} bar × ${fmt(area()*1e4,1)} cm² gives ${fmt(force()/1000,1)} kN.`,no:()=>`Not yet: ${fmt(force()/1000,1)} kN. F = P × A, so raise the pressure or widen the bore (area goes with the radius squared).`},
    {q:"Make the car's stopping distance under 25 m from 80 km/h.",check:()=>s.v===80&&stopD()<25,ok:()=>`Yes: with μ = ${fmt(s.mu,2)} it stops in ${fmt(stopD(),1)} m.`,no:()=>s.v!==80?"Set the speed to 80 km/h first.":`Not yet: ${fmt(stopD(),1)} m. d = Ek ÷ F, and F = μmg, so more grip is the only lever (mass cancels).`},
    {q:"Store at least 100 J in the spring with a squash of 60 mm or less.",check:()=>s.x<=60&&Es()>=100,ok:()=>`Yes: ½ × ${fmt(s.k*1000)} × ${fmt(s.x/1000,3)}² = ${fmt(Es())} J.`,no:()=>s.x>60?"Keep the squash at 60 mm or less.":`Not yet: ${fmt(Es())} J. Es = ½kx², so with x fixed you need a stiffer spring.`}],
  retrieval:{q:"A car doubles its speed. How does its stopping distance change (same brakes, same road)?",options:["Four times as long","Twice as long","The same","Eight times as long"],answer:0,why:"Kinetic energy goes with v², and the friction force is the same, so d = Ek ÷ F is four times longer."},
  papers:[{label:"NZQA: Physics",url:"https://www2.nzqa.govt.nz/ncea/subjects/past-exams-and-exemplars/physics/"}],
  truth:"A one-cylinder, four-stroke simplification: pressure is treated as constant through the stroke, the whole car is braked by one disc, and the spring is ideal. The 3D parts are NVIDIA SimReady models (CC BY 4.0, browser GLBs by CodePawl); they are the picture, not the source of any number.",
  footer:"Covers forces and energy for NCEA Level 1 Science/Physics (92047) and Level 2 Physics 91171: F = PA, W = Fd, torque, P = W/t, Ek = ½mv², friction, Es = ½kx²."
});
})();
