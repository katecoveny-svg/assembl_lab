(()=>{
// The vending machine: NCEA Level 2 Physics, AS91171 Mechanics. A see-through 3D figure of a spiral vending machine
// (m/vend3d.js, parts list in m/vend.parts.md) that the step rail drives: coin drop, coil turning, the can's fall,
// the impulse on landing, the "twice as fast" trade-off and the running cost. Figures from the NCEA Everyday-Engineering
// Practice Pack where it states them (350 g can, 0.80 m drop, 0.050 s stop); the rest are labelled estimates.
const g=9.8, M_CAN=0.350, R_COIL=0.072, COIN_M=0.010, COIN_H=0.15, PRICE=0.30, P_COMP=120, P_LIGHT=20, P_STANDBY=10;
const esc=StudyKit.esc;
const fmt=(x,d=0)=>{let v=Number(x);if(!isFinite(v))v=0;if(Math.abs(v)<0.5*Math.pow(10,-d))v=0;return v.toLocaleString("en-NZ",{maximumFractionDigits:d,minimumFractionDigits:d})};
const REDUCED=matchMedia("(prefers-reduced-motion: reduce)").matches;
const LITE=/[?&]lite\b/.test(location.search);
const s={h:0.8,dt:0.05,n:7,mu:0.3,rpm:30,vends:40,duty:50,explode:0,view:"front",
  // animation
  phase:"idle",t:0,coilA:0,pdz:0,pdy:0,flap:0,coinY:null,coinT:0,coinSpin:0,lever:0,fanA:0,compOn:true,compT:0,landed:false,vendDone:false};
// ---- physics
const vFall=h=>Math.sqrt(2*g*h), tFall=h=>Math.sqrt(2*h/g), pFall=h=>M_CAN*vFall(h), ekFall=h=>M_CAN*g*h;
const Fimp=()=>pFall(s.h)/s.dt;
const Ffric=()=>s.mu*s.n*M_CAN*g, torque=()=>Ffric()*R_COIL, omega=()=>2*Math.PI*s.rpm/60, power=()=>torque()*omega();
const kWhDay=()=>(P_COMP*s.duty/100+P_LIGHT+P_STANDBY)*24/1000, costDay=()=>kWhDay()*PRICE, costVend=()=>costDay()/s.vends;
const BASE=0.8;
const trayFor=h=>Math.min(5,Math.max(0,Math.round(h/0.2)-1));  // 0.2 m → tray 0 … 1.2 m → tray 5
// ---- the figure
let fig=null,glCanvas=null,figReady=false,api=null,ov=null;
const {TRAY_Y,COIL_X,PAD_TOP,CAN_Z,HELIX}=Vend3D.CONST;
function mountFigure(){const host=document.querySelector(".playmain .canvas");if(!host)return;
  // keep the (empty) SVG in the layout, invisible: the kit's visibility observer watches it, and a display:none element never "intersects", which would stop the animation ticking
  const svg=document.getElementById("k-main");if(svg)svg.style.cssText="position:absolute;inset:0;width:100%;height:100%;opacity:0;pointer-events:none";
  host.classList.add("vend-stage");
  if(LITE||!window.WebGLRenderingContext){const img=document.createElement("img");img.src="vend-poster.jpg";img.alt="A see-through vending machine: coils of cans on six trays, the coin mechanism and keypad in the right-hand column, the delivery bin and flap at the bottom, and the fridge deck behind.";img.className="vend-poster";host.appendChild(img);
    const n=document.createElement("p");n.className="vend-note";n.textContent=LITE?"Lite mode: a still of the figure. Remove ?lite from the address for the 3D model you can turn.":"3D isn't available in this browser, so here is a still of the figure.";host.appendChild(n);return}
  glCanvas=document.createElement("canvas");glCanvas.id="vend-gl";glCanvas.tabIndex=0;glCanvas.setAttribute("role","img");
  ov=document.createElementNS("http://www.w3.org/2000/svg","svg");ov.setAttribute("class","vend-ov");ov.setAttribute("aria-hidden","true");
  glCanvas.setAttribute("aria-label","A see-through 3D vending machine you can turn: drag or use the arrow keys to orbit, + and − to zoom, Home to reset the view.");
  host.appendChild(glCanvas);host.appendChild(ov);
  const hint=document.createElement("p");hint.className="vend-note";hint.textContent="Drag to turn · scroll to zoom · arrow keys, + − and Home work too";host.appendChild(hint);
  const sc=document.createElement("script");sc.src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
  sc.onload=()=>{try{fig=Vend3D.create(window.THREE,glCanvas,{onFrame:()=>anno()});figReady=true;window.__VEND=fig;fig.view(api&&api.step&&api.step.k==="apart"?"apart":s.view);poseNow()}catch(e){console.warn("vend3d failed",e);lite(host,"The 3D model couldn't start here, so here is a still of the figure.")}};
  sc.onerror=()=>lite(host,"The 3D library didn't load (offline?), so here is a still of the figure.");
  document.head.appendChild(sc)}
function lite(host,msg){if(glCanvas)glCanvas.remove();const img=document.createElement("img");img.src="vend-poster.jpg";img.alt="A see-through vending machine with its coils, coin mechanism, delivery bin and fridge deck visible.";img.className="vend-poster";host.insertBefore(img,host.firstChild);const n=host.querySelector(".vend-note");if(n)n.textContent=msg}
const CSS=`.vend-stage{aspect-ratio:16/10;min-height:260px;display:grid}
.vend-ov{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible}
.vend-ov text{font:600 10px var(--as-font,var(--mono));letter-spacing:.06em;fill:var(--as-ink,#2E2A47)}
.vend-ov text.sub{font-weight:500;letter-spacing:.02em;fill:var(--as-muted,#7C7895)}.vend-ov text.big{font-size:13px;letter-spacing:0}
.vend-ov .pill{fill:#fff;stroke:#DCD6EA;stroke-width:1}.vend-ov .lead{fill:none;stroke-width:1.2}.vend-ov .vec{fill:none;stroke-width:2.4;stroke-linecap:round}
@media (max-width:820px){.vend-ov text{font-size:9px}.vend-ov text.big{font-size:11px}}.vend-stage canvas,.vend-stage img.vend-poster{display:block;width:100%;height:100%;object-fit:cover;border-radius:22px;outline:none}
.vend-stage canvas:focus-visible{box-shadow:inset 0 0 0 3px var(--as-focus,#2F8FD8)}
.vend-note{position:absolute;left:12px;bottom:10px;margin:0;font:600 11px var(--as-font);letter-spacing:.04em;text-transform:uppercase;color:var(--as-muted,#7C7895);background:rgba(255,255,255,.82);padding:4px 9px;border-radius:999px;pointer-events:none}
@media (max-width:820px){.vend-stage{aspect-ratio:4/3}}`;
// ---- animation: one vend, slowed so a 0.4 s fall can be seen
const SLOW=0.35;
function resetVend(){Object.assign(s,{phase:"idle",t:0,coilA:0,pdz:0,pdy:0,flap:0,landed:false,vendDone:false})}
function resetCoin(){Object.assign(s,{coinY:null,coinT:0,coinSpin:0,lever:0})}
function tickVend(dt){const k=trayFor(s.h),h0=(k+1)*0.2,raise=Math.max(0,s.h-h0);// metres above the tray if h > 1.2
  if(s.phase==="idle"){s.phase="coil";s.t=0}
  if(s.phase==="coil"){s.coilA+=omega()*dt;if(s.coilA>=2*Math.PI){s.coilA=2*Math.PI;s.phase="tip";s.t=0}}
  else if(s.phase==="tip"){s.t+=dt;s.pdz=Math.min(99,s.t/0.25*99);s.pdy=raise*1000;if(s.t>=0.25){s.phase="fall";s.t=0}}
  else if(s.phase==="fall"){s.t+=dt*SLOW;const d=0.5*g*s.t*s.t;s.pdy=(raise-d)*1000;if(d>=s.h){s.pdy=-h0*1000;s.phase="land";s.t=0;s.landed=true;StudyKit.sfx("pop")}}
  else if(s.phase==="land"){s.t+=dt;if(s.t>0.8){s.phase="flap";s.t=0}}
  else if(s.phase==="flap"){s.t+=dt;s.flap=s.t<0.5?s.t/0.5:s.t<1.2?1:Math.max(0,1-(s.t-1.2)/0.5);if(s.t>=1.7){s.flap=0;s.phase="done";s.vendDone=true;s.playing=false}}}
function tickCoin(dt){if(s.coinY===null&&s.coinT===0){s.coinY=1390;s.coinSpin=0}
  s.coinT+=dt*SLOW;const y=1390-0.5*g*s.coinT*s.coinT*1000;s.coinSpin+=dt*6;
  if(y<=1390-COIN_H*1000){s.coinY=null;s.coinT=1e-9;s.lever=0;s.playing=false;StudyKit.sfx("tick")}else s.coinY=y}
function tickCold(dt){if(!REDUCED)s.fanA+=dt*(s.compOn?18:0)+dt*4;s.compT+=dt;const T=8;if(s.compT>=T)s.compT-=T;s.compOn=s.compT<T*s.duty/100}
function poseNow(){if(!fig)return;const st=api?api.step:null;if(!st)return;
  const P={explode:0,coil:null,coilAngle:0,product:null,coin:null,flap:s.flap,lever:s.lever,fan:s.fanA,compOn:s.compOn};
  if(st.k==="apart")P.explode=s.explode;
  if(["coil","fall","impact","faster","test"].includes(st.k)){P.coil={k:trayFor(s.h),i:2};P.coilAngle=s.coilA;if(s.phase!=="idle"&&s.phase!=="coil")P.product={j:0,dz:s.pdz,dy:s.pdy,visible:true}}
  if(st.k==="coin"&&s.coinY!==null)P.coin={y:s.coinY,spin:s.coinSpin};
  fig.setPose(P)}
// ---- in-scene annotations: part labels with thin leaders, concept callouts, vectors on the surface where the physics happens,
// and a small data card, drawn as an SVG overlay projected from the figure (crisp text, nothing baked into the model)
const ACC=()=>(getComputedStyle(document.documentElement).getPropertyValue("--acc")||"#2F8FD8").trim();
const esv=esc;
function pillAt(x,y,text,sub,ax,ay,acc){const w=Math.max(text.length*6.6,(sub||"").length*5.6)+16,h=sub?30:18;const px=Math.max(4,Math.min(x,W_()-w-4)),py=Math.max(4,Math.min(y,H_()-h-4));
  return `${ax!=null?`<path class="lead" stroke="${acc}" d="M${ax.toFixed(1)},${ay.toFixed(1)} L${(px+(ax<px?0:w)).toFixed(1)},${(py+h/2).toFixed(1)}"/><circle cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="2.6" fill="${acc}"/>`:""}<rect class="pill" x="${px}" y="${py}" width="${w}" height="${h}" rx="${h/2}"/><text x="${px+8}" y="${py+12}">${esv(text).toUpperCase()}</text>${sub?`<text class="sub" x="${px+8}" y="${py+24}">${esv(sub)}</text>`:""}`}
const W_=()=>glCanvas?glCanvas.clientWidth:800,H_=()=>glCanvas?glCanvas.clientHeight:500;
const arrow=(a,b,acc,lab)=>{const dx=b.x-a.x,dy=b.y-a.y,L=Math.hypot(dx,dy)||1,ux=dx/L,uy=dy/L;const hx=b.x-ux*9,hy=b.y-uy*9;
  return `<path class="vec" stroke="${acc}" d="M${a.x.toFixed(1)},${a.y.toFixed(1)} L${hx.toFixed(1)},${hy.toFixed(1)}"/><path d="M${b.x.toFixed(1)},${b.y.toFixed(1)} L${(hx-uy*5).toFixed(1)},${(hy+ux*5).toFixed(1)} L${(hx+uy*5).toFixed(1)},${(hy-ux*5).toFixed(1)}Z" fill="${acc}"/>${lab?`<text class="big" x="${(b.x+ux*6+8).toFixed(1)}" y="${(b.y+uy*6+4).toFixed(1)}" fill="${acc}" style="fill:${acc}">${esv(lab)}</text>`:""}`};
function card(rows,title){const w=172,h=22+rows.length*17;let o=`<g transform="translate(14,14)"><rect class="pill" width="${w}" height="${h}" rx="10"/><text x="12" y="15">${esv(title||"Physics data")}</text>`;rows.forEach((r,i)=>{o+=`<text class="sub" x="12" y="${32+i*17}">${esv(r[0])}</text><text class="big" x="${w-12}" y="${33+i*17}" text-anchor="end">${esv(r[1])}</text>`});return o+"</g>"}
const LOOK_LABELS=["validator","keypad","coil32","motor32","bin","compressor","condenser","led_l"];
function anno(){if(!fig||!ov||!api)return;const st=api.step;const W=W_(),H=H_();ov.setAttribute("viewBox",`0 0 ${W} ${H}`);const acc=ACC();let o="";
  if(st.k==="look"||st.k==="apart"||st.k==="cold"){const want=st.k==="apart"?null:st.k==="cold"?["compressor","condenser","evap","efan","cfan","lines"]:LOOK_LABELS;
    const SUB={validator:"coin slot · validator · return",bills:"note reader",keypad:"select · pay · collect",coil32:"spiral, 70 mm pitch",motor32:"24 V gearmotor",bin:"rubber pad · flap",compressor:"compressor, ~120 W",condenser:"heat out, fan",evap:"heat in, behind the trays",led_l:"LED strip",cashbox:"brushed steel",vmc:"controller board",psu:"24 V supply",efan:"evaporator fan",cfan:"condenser fan",lines:"copper refrigerant lines"};
    const NAME={efan:"Evaporator fan",cfan:"Condenser fan",lines:"Refrigerant lines"};
    const L=fig.labels().filter(l=>l.visible&&(!want||want.includes(l.id)));
    if(want)for(const id of want)if(!L.some(l=>l.id===id)){const c=fig.partCentre(id);if(c){const q=fig.project(c);if(q.visible)L.push({id,text:NAME[id]||id,x:q.x,y:q.y,visible:true})}}
    const left=L.filter(l=>l.x<W*0.5).sort((a,b)=>a.y-b.y),right=L.filter(l=>l.x>=W*0.5).sort((a,b)=>a.y-b.y);
    const lay=(arr,side)=>{let last=-99;arr.forEach(l=>{const w=Math.max(l.text.length*6.6,(SUB[l.id]||"").length*5.6)+16;let y=Math.max(l.y-15,last+36);last=y;const x=side<0?Math.max(6,Math.min(l.x-60,W*0.5)-w-30):Math.min(W-w-6,Math.max(l.x+60,W*0.5)+30);o+=pillAt(x,y,l.text,SUB[l.id]||"",l.x,l.y,acc)})};
    lay(left,-1);lay(right,1)}
  if(["coil","fall","impact","faster","test"].includes(st.k)){const k=trayFor(s.h),h0=(k+1)*0.2,raise=Math.max(0,s.h-h0);const cx=COIL_X(2),yT=TRAY_Y(k)+4,adv=s.coilA/(2*Math.PI)*HELIX;
    const canC=[cx,yT+57+(s.phase!=="idle"&&s.phase!=="coil"?s.pdy:0),CAN_Z(0)+adv+(s.phase!=="idle"&&s.phase!=="coil"?s.pdz:0)];const pc=fig.project(canC);
    if(st.k==="coil"){const c=fig.project([cx,TRAY_Y(k)+4+5+72,270]);if(c.visible){o+=pillAt(c.x+40,c.y-60,"Coil","torque τ = Fr = "+fmt(torque(),2)+" N m",c.x,c.y,acc);const r=26;o+=`<path class="vec" stroke="${acc}" stroke-dasharray="4 3" d="M${c.x-r},${c.y} A${r},${r} 0 1 1 ${c.x},${c.y+r}"/>`;o+=arrow({x:c.x-2,y:c.y+r},{x:c.x+14,y:c.y+r-2},acc,`ω = ${fmt(omega(),1)} rad/s`)}}
    else{const top=fig.project([cx,yT+(raise*1000),356]),bot=fig.project([cx,PAD_TOP,356]);
      if(top.visible&&bot.visible){o+=`<path class="vec" stroke="${acc}" stroke-width="1.4" stroke-dasharray="5 4" d="M${top.x.toFixed(1)},${top.y.toFixed(1)} L${bot.x.toFixed(1)},${bot.y.toFixed(1)}"/><path d="M${top.x-6},${top.y} h12 M${bot.x-6},${bot.y} h12" stroke="${acc}" stroke-width="1.4"/>`;
        o+=pillAt(top.x+22,(top.y+bot.y)/2-9,"Drop height",`h = ${fmt(s.h,2)} m · tray ${k}`,top.x,(top.y+bot.y)/2,acc)}
      if(s.phase==="fall"&&pc.visible){const vNow=Math.sqrt(2*g*Math.max(0,(raise*1000-s.pdy)/1000));const len=Math.min(90,vNow*16);o+=arrow({x:pc.x,y:pc.y},{x:pc.x,y:pc.y+len},acc,`v = ${fmt(vNow,2)} m/s`)}
      if((s.phase==="land"||s.phase==="flap"||s.phase==="done")&&bot.visible){o+=arrow({x:bot.x,y:bot.y+6},{x:bot.x,y:bot.y-Math.min(80,Fimp()*2.2)},"#E8664A",`F = ${fmt(Fimp(),1)} N`);o+=pillAt(bot.x-190,bot.y+10,"Impulse","Δp = FΔt: longer Δt, smaller F",bot.x,bot.y,"#E8664A")}
      if(st.k==="impact"&&s.phase==="idle"&&bot.visible)o+=pillAt(bot.x-200,bot.y+10,"Rubber pad",`stops the can in ${fmt(s.dt,3)} s`,bot.x,bot.y,acc);
      const rows=st.k==="impact"?[["Δp = mv",fmt(pFall(s.h),2)+" kg m/s"],["Δt",fmt(s.dt,3)+" s"],["F = Δp/Δt",fmt(Fimp(),1)+" N"],["F ÷ weight",fmt(Fimp()/(M_CAN*g),1)+"×"]]
        :st.k==="faster"?[["h",fmt(s.h,2)+" m"],["v = √(2gh)",fmt(vFall(s.h),2)+" m/s"],["v ÷ v(0.80 m)","×"+fmt(Math.sqrt(s.h/BASE),2)],["Ek ÷ Ek(0.80 m)","×"+fmt(s.h/BASE,2)]]
        :[["h",fmt(s.h,2)+" m"],["v = √(2gh)",fmt(vFall(s.h),2)+" m/s"],["t = √(2h/g)",fmt(tFall(s.h),2)+" s"],["Ek = mgh",fmt(ekFall(s.h),2)+" J"]];
      o+=card(rows,st.k==="impact"?"Impulse data":"Physics data")}}
  if(st.k==="coin"){const c=fig.project([383,1390-75,340]);if(c.visible){o+=pillAt(c.x-230,c.y-10,"Coin drop",`s = ½gt² · ${fmt(COIN_H,2)} m in ${fmt(tFall(COIN_H),3)} s`,c.x,c.y,acc);if(s.coinY!==null){const q=fig.project([383,s.coinY,340]);const vNow=Math.sqrt(2*g*(1390-s.coinY)/1000);o+=arrow({x:q.x,y:q.y},{x:q.x,y:q.y+20+vNow*20},acc,`v = ${fmt(vNow,2)} m/s`)}}}
  ov.innerHTML=o}
// ---- steps
const steps=[
 {k:"look",lab:"Look inside",cap:"A real spiral vending machine, drawn see-through so you can watch it work. Drag to turn it. Six trays of coils, a coin mechanism in the right-hand column, a delivery bin at the bottom and a fridge deck behind.",speed:0,controls:["vfront","vside","vinside"],
  big:"<b>The big idea:</b> every question in this machine is about one object at a time: a coin, a can, a coil. Pick the object, draw its forces, choose the equation.",
  exam:"Gravitational potential energy Ep = mgh, measured from the level where the object stops. A 0.350 kg can on tray 3, 0.80 m above the landing pad, has Ep = 0.350 × 9.8 × 0.80 = 2.74 J relative to the pad.",
  trap:"Measuring h from the floor instead of from where the can stops. The h in Ep = mgh is the drop, so choose your reference level and say what it is.",chips:["h","mass","ep"]},
 {k:"apart",lab:"Take it apart",cap:"Slide the parts out to see how it fits together: the glass door and the service panel come forward, the trays spread out, the coils and cans slide out of their trays, the fridge deck drops below.",speed:0,controls:["explode","vfront","vside","vinside"],
  big:"<b>The big idea:</b> a vending machine is a chain of simple mechanisms. The motor applies a torque to the coil (τ = Fr), the coil does work pushing a can forward (W = Fd), gravity does the rest once the can leaves the tray.",
  exam:"The motor exerts a torque on the coil, τ = Fr. Each turn of the coil moves the row of cans forward one pitch (70 mm), doing work W = Fd against friction. Once the front can leaves the tray its only significant force is gravity, so it accelerates downwards at 9.8 m s⁻².",
  trap:"Treating the whole machine as one object. Pick the object the question is about (the can, the coin, the coil) and draw the forces on it alone.",chips:["parts","coils","cans"]},
 {k:"coin",lab:"The coin drop",cap:"Press play to post a $2 coin (10 g). It falls about 0.15 m past the validator's sensors, which time it to check it's real. How long does that take, and how fast is it going at the bottom?",speed:1,speedLabel:"slowed ×3",controls:["play","restart"],
  big:"<b>The big idea:</b> the kinematic equations. With u = 0 and a = g you can find time from distance (s = ½gt²) and speed from either (v = gt, or v² = 2gs). The coin's mass never appears.",
  exam:"Taking down as positive with u = 0: s = ut + ½at², so t = √(2s ÷ g) = √(2 × 0.15 ÷ 9.8) = 0.175 s, and v = u + at = 9.8 × 0.175 = 1.71 m s⁻¹ (or v² = u² + 2as). The mass of the coin does not appear, because all objects fall with the same acceleration.",
  trap:"Mixing units (15 cm must become 0.15 m) and choosing an equation that needs a quantity you don't have. If you have no time, use v² = u² + 2as.",chips:["coinh","coint","coinv"],onStep:()=>{resetCoin()}},
 {k:"coil",lab:"The coil turns",cap:"The motor turns the coil one full turn and the whole row of cans moves forward 70 mm. The more cans in the coil and the rougher the tray, the more friction the motor must overcome, and the more torque it needs.",speed:1,speedLabel:"real time",controls:["play","restart","n","mu","rpm"],
  big:"<b>The big idea:</b> torque is force times radius, τ = Fr. Rotating things also have power: P = τω, with ω in radians per second.",
  exam:"To push 7 cans with μ = 0.3, the friction to overcome is F = μmg × 7 = 0.3 × 0.350 × 9.8 × 7 = 7.2 N, acting at the coil radius r = 0.072 m, so the motor's torque is τ = Fr = 0.52 N m. At 30 rpm, ω = 2π × 30 ÷ 60 = 3.14 rad s⁻¹, so the power is P = τω ≈ 1.6 W.",
  trap:"Using rpm as ω. Convert: ω = 2π × (rpm ÷ 60) in rad s⁻¹. One full turn is 2π radians.",chips:["force","torque","omega","power","turn"],onStep:()=>{resetVend()}},
 {k:"fall",lab:"The can falls",cap:"The front can tips off the tray and free-falls to the rubber pad. Change the drop height (which tray) and watch the speed it lands at. Tray 3 is the pack's 0.80 m drop.",speed:1,speedLabel:"fall slowed ×3",controls:["play","restart","h"],
  big:"<b>The big idea:</b> v² = u² + 2as. Dropped from rest, landing speed depends only on height and g, not on mass.",
  exam:"v² = u² + 2as = 0 + 2 × 9.8 × 0.80 = 15.68, so v = 3.96 ≈ 4.0 m s⁻¹. The fall takes t = √(2h ÷ g) = √(1.6 ÷ 9.8) = 0.40 s. The can's kinetic energy on landing equals the potential energy it lost, ½mv² = mgh = 2.7 J.",
  trap:"Forgetting the square root (giving 15.7 m s⁻¹), or rounding too early. Keep 3.96 for the next step and round the final answer.",chips:["h","v","t","ek"],onStep:()=>{resetVend()}},
 {k:"impact",lab:"Landing: impulse",cap:"The can is brought to rest by the pad. Momentum has to go to zero either way; the time it takes decides the force. Compare the rubber pad (0.050 s) with a bare steel tray.",speed:1,speedLabel:"fall slowed ×3",controls:["play","restart","h","dt","rubber","steel"],
  big:"<b>The big idea:</b> impulse. Δp = FΔt, so F = Δp ÷ Δt. Longer stopping time, smaller force, for the same change in momentum.",
  exam:"Δp = mΔv = 0.350 × 3.96 = 1.39 kg m s⁻¹. F = Δp ÷ Δt = 1.39 ÷ 0.050 ≈ 27.7 N. The rubber pad lengthens Δt, so for the same change in momentum the average force is smaller and the can (and the machine) survives. On a steel tray the stop might take 0.010 s, five times the force.",
  trap:"Confusing impulse with force. The impulse (Δp) is fixed by the landing speed; the stopping time decides the force. If you ignore the can's weight (3.4 N) in the net force, say so.",chips:["v","dp","dt","F","fw"],onStep:()=>{resetVend()}},
 {k:"faster",lab:"\"Twice as fast\"",cap:"A student claims the machine could dispense \"twice as fast\" by doubling the drop height. Set the drop to 1.60 m and compare with the 0.80 m baseline: speed, momentum, energy and time saved.",speed:1,speedLabel:"fall slowed ×3",controls:["play","restart","h","dt"],
  big:"<b>The big idea:</b> v ∝ √h. Doubling the height multiplies the landing speed by √2 ≈ 1.41, the momentum by 1.41 and the energy by 2. Excellence answers quantify the trade-off.",
  exam:"Doubling h to 1.6 m gives v = √(2 × 9.8 × 1.6) = 5.6 m s⁻¹, only √2 ≈ 1.41 times faster, because v ∝ √h, not h. The impact momentum rises by 41 % and the kinetic energy doubles (Ek = mgh). The can arrives only 0.17 s sooner but hits harder: louder, dented cans and broken bottles. \"Faster\" is a worse design outcome.",
  trap:"\"Double the height, double the speed.\" Speed grows with the square root of height; energy grows in proportion to it.",chips:["h","vratio","pratio","eratio","tsave"],onStep:()=>{resetVend();if(Math.abs(s.h-BASE)<1e-6)s.h=1.6}},
 {k:"cold",lab:"Keeping it cold",cap:"Behind the bin, a compressor pumps refrigerant to the evaporator at the back of the trays; the fans move the air. It cycles on and off. What does a day cost, and what is that per can sold? (Powers are estimates.)",speed:1,speedLabel:"real time",controls:["play","duty","vends"],
  big:"<b>The big idea:</b> energy = power × time. Power is a rate (W or kW); energy is an amount (J or kWh). Electricity is sold by the kilowatt-hour.",
  exam:"Energy = power × time. A 120 W compressor running 50 % of the day uses 0.120 kW × 12 h = 1.44 kWh; with 20 W of lights and 10 W standby all day the machine uses about 2.2 kWh a day, costing about 65 cents at 30 c/kWh. Spread over 40 vends that is about 1.6 cents a can.",
  trap:"kW and kWh. kW is a rate (power); kWh is an amount of energy. A 120 W compressor does not \"use 120 W per hour\".",chips:["comp","kwh","cost","pervend"]},
 {k:"test",lab:"Test yourself",cap:"Five challenges. Use the controls from any step, then press Check. The machine marks you with the same physics that moves the figure.",controls:["h","dt","n","mu","rpm","vends","duty"],chips:["v","F","torque","pervend"],
  big:"<b>Exam tip:</b> state the equation, substitute with units, then answer the question that was asked: a number with a unit, or a comparison with a reason."}];
// ---- kupu Māori: te reo terms for this machine, each checked in Te Aka Māori Dictionary (ta = word id). Sources and notes: te-reo-notes.md
const KUPU=[
 {mi:"tōpana",en:"force",ta:40375,chip:["force","F"]},
 {mi:"papatipu",en:"mass",ta:5179,chip:"mass",note:"Papatipu also means ancestral land. In science it means mass."},
 {mi:"tere",en:"speed",ta:7953,chip:["v","coinv"],note:"Also means quick or fast."},
 {mi:"whakahohoro",en:"acceleration, speeding up",ta:12447,note:"A general word for speeding up. Science classes may use another term, so check with your teacher."},
 {mi:"tō ā-papa",en:"gravity",ta:12845,note:"Te Aka also lists kume ā-papa."},
 {mi:"pūngao neke",en:"kinetic energy",ta:47721,chip:"ek",note:"Te Aka also lists pūngao konikoni."},
 {mi:"pūngao moe",en:"potential energy",ta:47720,chip:"ep"},
 {mi:"teitei",en:"height",ta:7895,chip:["h","coinh"]}];
Object.entries({"look":["teitei","papatipu","pūngao moe"],"apart":["tōpana"],"coin":["tō ā-papa","whakahohoro","tere"],"coil":["tōpana"],"fall":["tere","tō ā-papa","pūngao neke"],"impact":["tōpana","tere"],"faster":["tere","pūngao neke","teitei"]}).forEach(([k,a])=>{const st=steps.find(x=>x.k===k);if(st)st.kupu=a});
const CH=[
  {q:"Choose the drop height that makes the can land at about 4.0 m s⁻¹.",check:()=>Math.abs(s.h-0.8)<1e-6,ok:()=>`Yes: tray 3, h = 0.80 m. v = √(2gh) = √(2 × 9.8 × 0.80) = ${fmt(vFall(0.8),2)} m s⁻¹.`,no:()=>`Not yet: from ${fmt(s.h,2)} m the can lands at ${fmt(vFall(s.h),2)} m s⁻¹. Rearrange v² = 2gh for h.`},
  {q:"Keep the 0.80 m drop, and set a stopping time that keeps the average force on the can under 15 N.",check:()=>Math.abs(s.h-0.8)<1e-6&&Fimp()<15,ok:()=>`Yes: Δt = ${fmt(s.dt,3)} s gives F = ${fmt(pFall(0.8),2)} ÷ ${fmt(s.dt,3)} = ${fmt(Fimp(),1)} N. Same impulse, longer time, smaller force.`,no:()=>Math.abs(s.h-0.8)>1e-6?"Set the drop to 0.80 m first.":`Not yet: F = ${fmt(pFall(0.8),2)} ÷ ${fmt(s.dt,3)} = ${fmt(Fimp(),1)} N. You need Δt > 1.39 ÷ 15 = 0.093 s.`},
  {q:"Load the coil so the motor has to supply more than 0.5 N m of torque.",check:()=>torque()>0.5,ok:()=>`Yes: F = μ n m g = ${fmt(s.mu,2)} × ${s.n} × 0.350 × 9.8 = ${fmt(Ffric(),2)} N, so τ = Fr = ${fmt(Ffric(),2)} × 0.072 = ${fmt(torque(),2)} N m.`,no:()=>`Not yet: τ = ${fmt(torque(),2)} N m. τ = μ n m g r, so add cans or make the tray rougher (μ).`},
  {q:"Double the drop to 1.60 m. By what factor does the landing speed rise, and the kinetic energy?",check:()=>Math.abs(s.h-1.6)<1e-6,ok:()=>`Yes: v = ${fmt(vFall(1.6),2)} m s⁻¹, ${fmt(vFall(1.6)/vFall(0.8),2)}× the 0.80 m speed (√2, not 2), while Ek doubles to ${fmt(ekFall(1.6),2)} J and the impact momentum is up ${fmt((vFall(1.6)/vFall(0.8)-1)*100)}%.`,no:()=>`Set the drop to 1.60 m (twice 0.80 m), then check. v ∝ √h.`},
  {q:"Bring the running cost under 1 cent per can sold (keep the compressor duty at 50%).",check:()=>s.duty===50&&costVend()<0.01,ok:()=>`Yes: ${fmt(kWhDay(),2)} kWh a day costs $${fmt(costDay(),2)}; over ${s.vends} vends that is ${fmt(costVend()*100,2)} c each. The fridge runs whether or not anyone buys.`,no:()=>s.duty!==50?"Set the compressor duty to 50% first.":`Not yet: $${fmt(costDay(),2)} a day ÷ ${s.vends} vends = ${fmt(costVend()*100,1)} c a can. You need more than ${Math.ceil(costDay()/0.01)} vends a day.`}];
// ---- mount
const PARTS_N=Vend3D.PARTS.filter(p=>!p.virtual).length;
api=StudyKit.mount({kupu:KUPU,caseTint:"mint",
  eyebrow:"Physics · Mechanics", title:"The vending machine", crumb:"NCEA Level 2 Physics · AS91171 Demonstrate understanding of mechanics", homeHash:"l2",
  fig:"FIG. 24 · A SPIRAL VENDING MACHINE, SEE-THROUGH", railTitle:"One object at a time",
  badge:{label:"NCEA L2 Physics 91171",exam:"2026-11-18T14:00:00+13:00",examText:"Wed 18 Nov, 2pm"},
  mainBox:"0 0 800 500", mainLabel:"A see-through 3D vending machine",
  state:s, steps,
  onStep:(x,st)=>{if(fig)fig.view(st.k==="apart"?"apart":s.view)},
  controls:[{type:"play"},{type:"button",id:"restart",label:"Restart",onClick:(x,api)=>{const st=api.step;st.onStep&&st.onStep();s.playing=true}},
    {type:"button",id:"vfront",label:"Front",onClick:()=>{s.view="front";fig&&fig.view("front")}},
    {type:"button",id:"vside",label:"Side",onClick:()=>{s.view="side";fig&&fig.view("side")}},
    {type:"button",id:"vinside",label:"Look inside",onClick:()=>{s.view="inside";fig&&fig.view("inside")}},
    {type:"range",id:"explode",label:"Take apart",min:0,max:100,step:1,get:()=>Math.round(s.explode*100),set:(x,v)=>{s.explode=v/100},fmt:()=>Math.round(s.explode*100)+"%"},
    {type:"range",id:"h",label:"Drop height",min:0.2,max:1.6,step:0.2,get:()=>s.h,set:(x,v)=>{s.h=Math.round(v*10)/10;resetVend()},fmt:()=>`${fmt(s.h,2)} m${s.h<=1.2?` · tray ${trayFor(s.h)}`:" · above the top tray"}`},
    {type:"range",id:"dt",label:"Stopping time",min:0.01,max:0.2,step:0.005,get:()=>s.dt,set:(x,v)=>{s.dt=Math.round(v*1000)/1000},fmt:()=>fmt(s.dt,3)+" s"},
    {type:"button",id:"rubber",label:"Rubber pad (0.050 s)",onClick:()=>{s.dt=0.05}},
    {type:"button",id:"steel",label:"Steel tray (0.010 s)",onClick:()=>{s.dt=0.01}},
    {type:"range",id:"n",label:"Cans in the coil",min:1,max:7,step:1,get:()=>s.n,set:(x,v)=>{s.n=v},fmt:()=>s.n+""},
    {type:"range",id:"mu",label:"Tray friction μ",min:0.1,max:0.6,step:0.05,get:()=>s.mu,set:(x,v)=>{s.mu=Math.round(v*100)/100},fmt:()=>fmt(s.mu,2)},
    {type:"range",id:"rpm",label:"Coil speed",min:10,max:60,step:1,get:()=>s.rpm,set:(x,v)=>{s.rpm=v},fmt:()=>s.rpm+" rpm"},
    {type:"range",id:"duty",label:"Compressor duty",min:20,max:80,step:5,get:()=>s.duty,set:(x,v)=>{s.duty=v},fmt:()=>s.duty+"% of the day"},
    {type:"range",id:"vends",label:"Cans sold a day",min:10,max:200,step:5,get:()=>s.vends,set:(x,v)=>{s.vends=v},fmt:()=>s.vends+""}],
  tick:(x,dt,st)=>{if(st.k==="coin")tickCoin(dt);else if(["coil","fall","impact","faster"].includes(st.k)){if(s.phase!=="done")tickVend(dt);if(st.k==="coil"&&s.phase==="done"){resetVend()}}else if(st.k==="cold")tickCold(dt)},
  drawMain:(x,st)=>{poseNow();try{anno()}catch(e){}return ""},
  chips:()=>{const k=trayFor(s.h),v=vFall(s.h),r=Math.sqrt(s.h/BASE);return{
    h:["DROP",`${fmt(s.h,2)} m`,true],mass:["CAN",`${fmt(M_CAN*1000)} g`],ep:["Ep ON THE TRAY",`${fmt(ekFall(s.h),2)} J`],
    parts:["PARTS",`${PARTS_N} drawn`],coils:["COILS","6 trays × 5"],cans:["PRODUCTS",`${6*5*7} in the coils`],
    coinh:["COIN DROP",`${fmt(COIN_H,2)} m`],coint:["TIME",`${fmt(tFall(COIN_H),3)} s`,true],coinv:["SPEED AT THE BOTTOM",`${fmt(g*tFall(COIN_H),2)} m/s`],
    force:["FRICTION",`${fmt(Ffric(),1)} N`],torque:["TORQUE",`${fmt(torque(),2)} N m`,true],omega:["ω",`${fmt(omega(),2)} rad/s`],power:["MOTOR POWER",`${fmt(power(),1)} W`],turn:["ONE TURN",`${fmt(60/s.rpm,1)} s · 70 mm`],
    v:["LANDING SPEED",`${fmt(v,2)} m/s`,true],t:["FALL TIME",`${fmt(tFall(s.h),2)} s`],ek:["Ek ON LANDING",`${fmt(ekFall(s.h),2)} J`],
    dp:["Δp",`${fmt(pFall(s.h),2)} kg m/s`],dt:["Δt",`${fmt(s.dt,3)} s`],F:["AVERAGE FORCE",`${fmt(Fimp(),1)} N`,true],fw:["F ÷ WEIGHT",`${fmt(Fimp()/(M_CAN*g),1)}×`],
    vratio:["SPEED vs 0.80 m",`×${fmt(r,2)}`,true],pratio:["MOMENTUM",`×${fmt(r,2)}`],eratio:["ENERGY",`×${fmt(s.h/BASE,2)}`],tsave:["FALL TIME",`${fmt(tFall(s.h),2)} s (${tFall(s.h)<tFall(BASE)?"−":"+"}${fmt(Math.abs(tFall(BASE)-tFall(s.h)),2)} s)`],
    comp:["COMPRESSOR",s.compOn?"running · 120 W":"off",s.compOn],kwh:["A DAY",`${fmt(kWhDay(),2)} kWh`],cost:["COST A DAY",`$${fmt(costDay(),2)}`],pervend:["PER CAN SOLD",`${fmt(costVend()*100,1)} c`,true]}},
  challenges:CH,
  papers:[{label:"NZQA: Physics past exams and exemplars",url:"https://www2.nzqa.govt.nz/ncea/subjects/past-exams-and-exemplars/physics/"},{label:"NZQA: AS91171 standard and specifications",url:"https://www.nzqa.govt.nz/ncea/assessment/view-detailed.do?standardNumber=91171"}],
  truth:"A stylised model of a spiral vending machine: cabinet 1830 × 990 × 850 mm, 6 trays × 5 coils, a 350 g can dropping 0.80 m from tray 3 and stopping in 0.050 s on a rubber pad (figures from the practice pack). Coil radius, tray friction (μ), motor speed, the coin's 0.15 m drop and the fridge powers (120 W compressor, 20 W lights, 10 W standby, 30 c/kWh) are estimates. g = 9.8 m s⁻², no air resistance, and the falls are slowed about three times so you can see them. Parts list: vend.parts.md.",
  footer:"Covers AS91171 (L2 Mechanics): kinematic equations and free fall, Ep and Ek, momentum and impulse (F = Δp/Δt), torque (τ = Fr) and rotational power (P = τω), and energy, power and cost (E = Pt). Add ?lite to the address for a still image instead of the 3D model."
});
const style=document.createElement("style");style.textContent=CSS;document.head.appendChild(style);
mountFigure();
window.__VEND_STATE=s;window.__VEND_STATS=()=>fig?fig.stats():null;
})();
