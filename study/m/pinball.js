(()=>{
// The Physics Lab pinball: NCEA Level 2 Physics, AS91171 Mechanics. A playable, see-through tabletop pinball machine
// (physics and figure in m/pinball3d.js, parts list in m/pinball.parts.md). The game loop is "call the shot":
// set the controls, say what the physics predicts, fire, and the table measures it. Rounds: the spring launch
// (½kx² = ½mv²), a pop bumper (elastic bounce plus a kick, momentum change), the lock kicker's projectile across the
// sloped table (R = v² sin 2θ / g_eff), flipper timing (impulse J = FΔt), and an energy audit of a whole ball.
const T=Pinball3D.TABLE,GE=Pinball3D.GE/1000,g=T.G,M=T.BALL_M,K=T.K;
const esc=StudyKit.esc;
const fmt=(x,d=0)=>{let v=Number(x);if(!isFinite(v))v=0;if(Math.abs(v)<0.5*Math.pow(10,-d))v=0;return v.toLocaleString("en-NZ",{maximumFractionDigits:d,minimumFractionDigits:d})};
const REDUCED=matchMedia("(prefers-reduced-motion: reduce)").matches;
const LITE=/[?&]lite\b/.test(location.search);
const sim=new Pinball3D.Sim();
const s={x:40,callV:3.0,u0:1.5,callReb:2.4,kickV:0.5,kickTh:35,callR:0.2,view:"look",
  callPts:0,streak:0,best:0,balls:3,gameOver:false,mode:"free",result:"",resultOk:null,resultAt:0,
  playing:true,hold:false,pullX:0,acc:0,lastLaunch:null,lastBumper:null,lastKick:null,lastLanding:null,lastFlip:null,flipShot:null,ledger0:null,audit:null,ballPts0:0,
  round:{launch:null,bumper:null,ramp:null,flipper:null,audit:null}};
try{s.best=+localStorage.getItem("pinball.best")||0}catch(e){}
// ---- physics the student is asked to call
const vLaunch=x=>Math.sqrt(K*(x/1000)**2/M);             // ½kx² = ½mv²  (the sim also loses a little to the slope during the 25 ms stroke)
const uImpact=u0=>Math.sqrt(Math.max(0,u0*u0-2*GE*(T.BUMPERS[2].c[1]-T.BUMPERS[2].r-T.BALL_R-560)/1000));
const rangeOf=(v,th)=>v*v*Math.sin(2*th*Math.PI/180)/GE;
const total=()=>sim.score+s.callPts;
// ---- the figure
let fig=null,glCanvas=null,api=null,ov=null,hud=null;
function mountFigure(){const host=document.querySelector(".playmain .canvas");if(!host)return;
  const svg=document.getElementById("k-main");if(svg)svg.style.cssText="position:absolute;inset:0;width:100%;height:100%;opacity:0;pointer-events:none";
  host.classList.add("pb-stage");
  hud=document.createElement("div");hud.className="pb-hud";host.parentNode.insertBefore(hud,host.nextSibling);
  if(LITE||!window.WebGLRenderingContext){const n=document.createElement("p");n.className="pb-note";n.textContent=LITE?"Lite mode: the table runs without the 3D view. Remove ?lite from the address to see it.":"3D isn't available in this browser; the table still runs and the readouts update.";host.appendChild(n);drawFlat(host);return}
  glCanvas=document.createElement("canvas");glCanvas.id="pb-gl";glCanvas.tabIndex=0;glCanvas.setAttribute("role","img");
  glCanvas.setAttribute("aria-label","A see-through 3D pinball table you can turn: drag or use the arrow keys to orbit, + and − to zoom, Home to reset the view. Z and / flip, hold Space to pull the plunger.");
  ov=document.createElementNS("http://www.w3.org/2000/svg","svg");ov.setAttribute("class","pb-ov");ov.setAttribute("aria-hidden","true");
  host.appendChild(glCanvas);host.appendChild(ov);touchControls(host);
  const hint=document.createElement("p");hint.className="pb-note";hint.textContent="Z and / flip · hold Space to pull, release to fire · P pauses · drag to turn the table";host.appendChild(hint);
  const sc=document.createElement("script");sc.src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
  sc.onload=()=>{try{fig=Pinball3D.create(window.THREE,glCanvas,{onFrame:()=>anno()});window.__PINBALL=fig;fig.view(s.view);fig.pose(sim)}catch(e){console.warn("pinball3d failed",e);flat(host,"The 3D model couldn't start here; the table still runs and the readouts update.")}};
  sc.onerror=()=>flat(host,"The 3D library didn't load (offline?); the table still runs and the readouts update.");
  document.head.appendChild(sc)}
function flat(host,msg){if(glCanvas)glCanvas.remove();if(ov)ov.remove();ov=null;const n=host.querySelector(".pb-note");if(n)n.textContent=msg;drawFlat(host)}
// a plain top-down drawing of the table for lite mode and GL failures (the physics is identical)
let flatSvg=null;
function drawFlat(host){flatSvg=document.createElementNS("http://www.w3.org/2000/svg","svg");flatSvg.setAttribute("class","pb-flat");flatSvg.setAttribute("viewBox","-20 -40 560 880");flatSvg.setAttribute("aria-hidden","true");host.insertBefore(flatSvg,host.firstChild)}
function flatFrame(){if(!flatSvg)return;const b=sim.ball,A=T.ARCH,P=p=>`${p[0]},${800-p[1]}`;let o=`<rect x="-12" y="-12" width="544" height="824" rx="18" fill="${StudyKit.figMat.palette.case.sky}" fill-opacity=".35" stroke="#9CC4EC"/><path d="M0,${800-540} A260,260 0 0 1 520,${800-540}" fill="none" stroke="#8F9BAA" stroke-width="3"/>`;
  for(const sg of Pinball3D.COL.segs)if(sg.id!=="arch")o+=`<line x1="${sg.a[0]}" y1="${800-sg.a[1]}" x2="${sg.b[0]}" y2="${800-sg.b[1]}" stroke="${sg.kind==="sling"?"#E8664A":sg.kind==="rubber"?"#3C4557":"#8F9BAA"}" stroke-width="${sg.kind==="rail"?4:3}" stroke-linecap="round"/>`;
  for(const c of Pinball3D.COL.circ)o+=`<circle cx="${c.c[0]}" cy="${800-c.c[1]}" r="${c.r}" fill="${c.kind==="bumper"?{b1:"#F3B8C8",b2:"#F3D56E",b3:"#AFD873"}[c.id]:"#3C4557"}" stroke="#4E4868"/>`;
  for(const side of ["L","R"]){const f=sim.flip[side],Pv=T.FLIP[side].pivot;o+=`<line x1="${Pv[0]}" y1="${800-Pv[1]}" x2="${Pv[0]+T.FLIP.len*Math.cos(f.a)}" y2="${800-(Pv[1]+T.FLIP.len*Math.sin(f.a))}" stroke="#CFECDD" stroke-width="16" stroke-linecap="round"/><line x1="${Pv[0]}" y1="${800-Pv[1]}" x2="${Pv[0]+T.FLIP.len*Math.cos(f.a)}" y2="${800-(Pv[1]+T.FLIP.len*Math.sin(f.a))}" stroke="#4E4868" stroke-width="2" stroke-linecap="round"/>`}
  o+=`<rect x="${T.LOCK.c[0]-16}" y="${800-T.LOCK.c[1]-16}" width="32" height="32" rx="16" fill="#CFECDD" stroke="#4E4868"/>`;T.ROLLOVERS.xs.forEach((x,i)=>o+=`<circle cx="${x}" cy="${800-T.ROLLOVERS.y}" r="9" fill="${sim.lit.has(i)?"#B69BFF":"#D9CBF2"}"/>`);
  const px=b.mode==="lane"?sim.plunger.x:0;o+=`<rect x="${T.PLUNGER.x-10}" y="${800-(T.PLUNGER.restY-px)}" width="20" height="60" fill="#CBD3DD" stroke="#4E4868"/>`;
  if(b.mode!=="none"&&b.mode!=="drained")o+=`<circle cx="${b.x}" cy="${800-b.y}" r="${T.BALL_R}" fill="#DDE4EC" stroke="#4E4868" stroke-width="1.5"/>`;
  flatSvg.innerHTML=o}
const CSS=`.pb-stage{aspect-ratio:16/10;min-height:280px;display:grid;background:#F7F3EC}
.pb-ov{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible}
.pb-ov text{font:600 10px var(--as-font,var(--mono));letter-spacing:.06em;fill:var(--as-ink,#2E2A47)}
.pb-ov text.sub{font-weight:500;letter-spacing:.02em;fill:var(--as-muted,#7C7895)}.pb-ov text.big{font-size:13px;letter-spacing:0}
.pb-ov .pill{fill:#fff;stroke:#DCD6EA;stroke-width:1}.pb-ov .lead{fill:none;stroke-width:1.2}.pb-ov .vec{fill:none;stroke-width:2.4;stroke-linecap:round}
.pb-stage canvas,.pb-stage .pb-flat{display:block;width:100%;height:100%;object-fit:cover;border-radius:22px;outline:none}
.pb-stage .pb-flat{position:absolute;inset:0;padding:8px;box-sizing:border-box}
.pb-stage canvas:focus-visible{box-shadow:inset 0 0 0 3px var(--as-focus,#2F8FD8)}
.pb-note{position:absolute;left:12px;bottom:10px;margin:0;font:600 11px var(--as-font);letter-spacing:.04em;text-transform:uppercase;color:var(--as-muted,#7C7895);background:rgba(255,255,255,.82);padding:4px 9px;border-radius:999px;pointer-events:none;max-width:60%}
.pb-touch{position:absolute;bottom:12px;appearance:none;border:0;border-radius:999px;background:rgba(255,255,255,.88);color:var(--as-ink);font:700 14px var(--as-display);padding:0;width:58px;height:58px;box-shadow:0 2px 10px -4px rgba(42,33,64,.4);touch-action:none;user-select:none;-webkit-user-select:none;cursor:pointer}
.pb-touch:active,.pb-touch.on{background:var(--acc);color:#fff}.pb-touch.l{left:12px;bottom:56px}.pb-touch.r{right:12px;bottom:56px}.pb-touch.p{right:12px;bottom:120px;width:58px;height:58px;font-size:11px;letter-spacing:.04em}
@media (max-width:820px){.pb-stage{aspect-ratio:4/5}.pb-ov text{font-size:9px}.pb-ov text.big{font-size:11px}.pb-note{display:none}}
.pb-hud{display:grid;grid-template-columns:1fr auto;gap:8px 14px;align-items:center;background:var(--as-card);border:1px solid var(--as-line);border-radius:18px;padding:10px 14px;font-size:14px;min-width:0}
.pb-hud .say{min-width:0;color:var(--as-ink)}.pb-hud .say b{font-family:var(--as-display);font-weight:600}.pb-hud .say .ok{color:var(--as-good)}.pb-hud .say .no{color:var(--as-warn)}
.pb-hud .sc{display:flex;gap:14px;font:600 11px var(--as-font);letter-spacing:.04em;text-transform:uppercase;color:var(--as-muted);white-space:nowrap}.pb-hud .sc b{display:block;font:600 20px/1 var(--as-display);color:var(--as-ink);font-variant-numeric:tabular-nums}
@media (max-width:820px){.pb-hud{grid-template-columns:1fr}.pb-hud .sc{justify-content:space-between}}
.pb-wf text{font:600 10px var(--as-font);fill:var(--as-ink)}.pb-wf text.v{font-family:var(--mono);font-weight:500}.pb-wf text.t{font-size:12px}.pb-wf text.sub{fill:var(--as-muted);font-weight:500}`;
// ---- touch controls (also handy with a mouse)
let touchBtns=null;
function touchControls(host){const mk=(cls,label,aria)=>{const b=document.createElement("button");b.type="button";b.className="pb-touch "+cls;b.textContent=label;b.setAttribute("aria-label",aria);host.appendChild(b);return b};
  const L=mk("l","◀","Left flipper"),Rb=mk("r","▶","Right flipper"),P=mk("p","PULL","Pull the plunger: hold, then release to fire");
  const bind=(b,down,up)=>{const on=e=>{e.preventDefault();b.classList.add("on");down();try{b.setPointerCapture(e.pointerId)}catch(err){}};const off=e=>{b.classList.remove("on");up()};
    b.addEventListener("pointerdown",on);b.addEventListener("pointerup",off);b.addEventListener("pointercancel",off);b.addEventListener("lostpointercapture",off);b.addEventListener("contextmenu",e=>e.preventDefault())};
  bind(L,()=>flip("L",true),()=>flip("L",false));bind(Rb,()=>flip("R",true),()=>flip("R",false));bind(P,()=>pullStart(),()=>pullEnd());touchBtns={L,R:Rb,P}}
function flip(side,on){sim.setFlipper(side,on);if(on)StudyKit.sfx("tick")}
function pullStart(){if(sim.ball.mode==="drained"||sim.ball.mode==="none")readyBall();if(sim.ball.mode!=="lane")return;s.hold=true;s.pullX=Math.max(2,sim.plunger.x)}
function pullEnd(){if(!s.hold)return;s.hold=false;if(sim.ball.mode==="lane"&&sim.plunger.x>0){s.x=Math.round(sim.plunger.x);launchNow()}}
function readyBall(){if(s.gameOver&&api&&api.step.k==="free")return;sim.newBall();s.ledger0=JSON.parse(JSON.stringify(sim.ledger));s.ballPts0=sim.score;s.audit=null}
function launchNow(){if(sim.ball.mode!=="lane")readyBall();if(sim.ball.mode!=="lane")return;sim.pull(s.x);if(sim.fire()){StudyKit.sfx("whoosh");s.lastLaunch=null}}
// ---- keyboard
document.addEventListener("keydown",e=>{const t=e.target,tag=t&&t.tagName;if(tag==="INPUT"||tag==="SELECT"||tag==="TEXTAREA"||e.metaKey||e.ctrlKey||e.altKey)return;
  if(e.key==="z"||e.key==="Z"){if(!e.repeat)flip("L",true);e.preventDefault()}
  else if(e.key==="/"||e.key==="?"){if(!e.repeat)flip("R",true);e.preventDefault()}
  else if(e.key===" "){if(tag==="BUTTON"&&!(t.classList&&t.classList.contains("pb-touch")))return;if(!e.repeat)pullStart();e.preventDefault()}
  else if(e.key==="p"||e.key==="P"){s.playing=!s.playing;api&&api.redraw()}});
document.addEventListener("keyup",e=>{if(e.key==="z"||e.key==="Z")flip("L",false);else if(e.key==="/"||e.key==="?")flip("R",false);else if(e.key===" "){const t=e.target,tag=t&&t.tagName;if(tag==="INPUT"||tag==="SELECT"||tag==="TEXTAREA")return;pullEnd()}});
window.addEventListener("blur",()=>{flip("L",false);flip("R",false);s.hold=false});
// ---- scoring a call: closeness bands, a streak multiplier
function bands(err){return err<=0.02?1000:err<=0.05?700:err<=0.10?400:err<=0.20?150:0}
function scoreCall(key,called,measured,unit,d){const err=Math.abs(measured-called)/Math.max(1e-9,Math.abs(measured));const base=bands(err);
  if(base>=400)s.streak++;else s.streak=0;const mult=Math.min(2,1+0.1*Math.max(0,s.streak-1));const pts=Math.round(base*mult);s.callPts+=pts;
  s.round[key]={called,measured,err,pts};
  const within=`${fmt(err*100,err<0.1?1:0)}% off`;
  say(`${base>=400?"<span class=ok>Good call.</span>":base>0?"Close.":"<span class=no>Not this time.</span>"} You called <b>${fmt(called,d)} ${unit}</b>, the table measured <b>${fmt(measured,d)} ${unit}</b> (${within}) → <b>+${fmt(pts)}</b>${s.streak>1?` · streak ×${fmt(mult,1)}`:""}`,base>=400);
  StudyKit.sfx(base>=400?"win":base>0?"ding":"buzz");if(base>=400&&!REDUCED&&hud)StudyKit.burst(hud);saveBest()}
function say(html,ok){s.result=html;s.resultOk=ok;s.resultAt=sim.t}
function saveBest(){if(total()>s.best){s.best=total();try{localStorage.setItem("pinball.best",String(s.best))}catch(e){}}}
// ---- the tick: fixed 240 Hz physics, however the frame rate behaves
function tick(dt,st){if(s.hold&&sim.ball.mode==="lane"){s.pullX=Math.min(T.X_MAX,s.pullX+60*dt);sim.pull(s.pullX);s.x=Math.round(s.pullX)}
  s.acc+=dt;let n=0;while(s.acc>=T.DT&&n<30){sim.step();s.acc-=T.DT;n++;for(const e of sim.events)onEvent(e,st);sim.events.length=0}
  if(st.k==="ramp"&&s.lockFireAt&&sim.ball.mode==="locked"&&sim.t>=s.lockFireAt){s.lockFireAt=0;sim.kick(s.kickV*1000,s.kickTh)}
  // a drained ball comes back to the plunger by itself, except in the audit (keep the books on screen) and after game over
  if(sim.ball.mode==="drained"&&sim.t-s.drainT>1.2){if(["launch","bumper","ramp","flipper"].includes(st.k)||(st.k==="free"&&!s.gameOver))readyBall()}}
function onEvent(e,st){const k=st.k;
  if(e.kind==="launch"){s.lastLaunch={v:e.v,x:e.x,t:sim.t};if(k==="launch")scoreCall("launch",s.callV,e.v,"m/s",2);else if(k==="free"||k==="audit")say(`Launched at <b>${fmt(e.v,2)} m/s</b> from ${fmt(e.x)} mm of spring.`)}
  else if(e.kind==="bumper"&&e.kick){s.lastBumper={...e,t:sim.t};if(k==="bumper"&&e.id==="b3"&&!s.round.bumperDone){s.round.bumperDone=true;scoreCall("bumper",s.callReb,e.v,"m/s",2)}StudyKit.sfx("pop")}
  else if(e.kind==="sling")StudyKit.sfx("tick");
  else if(e.kind==="lock"){if(k==="ramp"){sim.lockAuto=false;s.lockFireAt=sim.t+0.8;say("In the lock. The kicker fires in a moment…")}else sim.lockAuto=true}
  else if(e.kind==="kick"){s.lastKick={...e,t:sim.t};s.lastLanding=null;StudyKit.sfx("whoosh")}
  else if(e.kind==="landing"){s.lastLanding={...e,t:sim.t};if(k==="ramp"&&!s.round.rampDone){s.round.rampDone=true;if(e.deflected)say("<span class=no>Deflected</span> before it came back to the line: no clean landing to measure. Fire again.",false);else scoreCall("ramp",s.callR,e.R,"m",3)}}
  else if(e.kind==="ramp"){if(!e.crest){if(k==="ramp")say("<span class=no>Rolled back</span>: not enough speed to clear the hump. Fire again.",false);StudyKit.sfx("buzz")}else StudyKit.sfx("ding")}
  else if(e.kind==="flipper"&&e.active&&e.J>0.02){s.lastFlip={...e,t:sim.t};if(k==="flipper"&&!s.flipShot)s.flipShot={J:e.J,dt:e.dt,F:e.F,t:sim.t,hit:false}}
  else if(e.kind==="target"){StudyKit.sfx("ding");if(k==="flipper"&&s.flipShot&&!s.flipShot.hit&&sim.t-s.flipShot.t<2){s.flipShot.hit=true;const J=s.flipShot.J;const base=Math.round(1000*Math.max(0.2,Math.min(1,1-(J-0.10)/0.45)));s.streak++;const mult=Math.min(2,1+0.1*Math.max(0,s.streak-1));const pts=Math.round(base*mult);s.callPts+=pts;
      const prev=s.round.flipper;if(!prev||J<prev.J)s.round.flipper={J,dt:s.flipShot.dt,F:s.flipShot.F,pts};say(`<span class=ok>Target.</span> Impulse <b>${fmt(J,3)} N s</b> over ${fmt(s.flipShot.dt*1000,0)} ms, so the flipper's average force was <b>${fmt(s.flipShot.F,1)} N</b> → <b>+${fmt(pts)}</b>. Less impulse, more points.`,true);StudyKit.sfx("win");if(!REDUCED&&hud)StudyKit.burst(hud);saveBest()}}
  else if(e.kind==="drain"){s.drainT=sim.t;StudyKit.sfx("buzz");
    if(k==="flipper"&&s.flipShot&&!s.flipShot.hit){say(`<span class=no>Missed.</span> That flip delivered <b>${fmt(s.flipShot.J,3)} N s</b> in ${fmt(s.flipShot.dt*1000,0)} ms. Feed another ball and try the timing.`,false)}
    s.flipShot=null;
    const L=sim.ledger,L0=s.ledger0||{};const d={};for(const key in L)d[key]=L[key]-(L0[key]||0);d.drainKE=e.E;s.audit=d;
    if(k==="audit"){const pts=sim.score-s.ballPts0;s.round.audit={pts,audit:d};say(`Ball over. It arrived at the drain with <b>${fmt(e.E*1000,0)} mJ</b> of kinetic energy; the audit on the right shows where the rest went. Table points this ball: <b>+${fmt(pts)}</b>.`)}
    if(k==="free"){s.balls--;if(s.balls<=0){s.gameOver=true;saveBest();say(`<b>Game over.</b> ${fmt(total())} points${total()>=s.best?" · a new best":""}. Press New game to go again.`)}else say(`Ball drained. ${s.balls} ball${s.balls===1?"":"s"} left.`)}}
  else if(e.kind==="rollover")StudyKit.sfx("tick")}
// ---- in-scene annotations (an SVG overlay projected from the figure): labels with leaders, vectors on the ball, the data card
const ACC=()=>(getComputedStyle(document.documentElement).getPropertyValue("--acc")||"#2F8FD8").trim();
const W_=()=>glCanvas?glCanvas.clientWidth:800,H_=()=>glCanvas?glCanvas.clientHeight:500;
function pillAt(x,y,text,sub,ax,ay,acc){const w=Math.max(text.length*6.6,(sub||"").length*5.6)+16,h=sub?30:18;const px=Math.max(4,Math.min(x,W_()-w-4)),py=Math.max(4,Math.min(y,H_()-h-4));
  return `${ax!=null?`<path class="lead" stroke="${acc}" d="M${ax.toFixed(1)},${ay.toFixed(1)} L${(px+(ax<px?0:w)).toFixed(1)},${(py+h/2).toFixed(1)}"/><circle cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="2.6" fill="${acc}"/>`:""}<rect class="pill" x="${px}" y="${py}" width="${w}" height="${h}" rx="${h/2}"/><text x="${px+8}" y="${py+12}">${esc(text).toUpperCase()}</text>${sub?`<text class="sub" x="${px+8}" y="${py+24}">${esc(sub)}</text>`:""}`}
const arrow=(a,b,acc,lab)=>{const dx=b.x-a.x,dy=b.y-a.y,L=Math.hypot(dx,dy)||1,ux=dx/L,uy=dy/L;if(L<6)return "";const hx=b.x-ux*9,hy=b.y-uy*9;
  return `<path class="vec" stroke="${acc}" d="M${a.x.toFixed(1)},${a.y.toFixed(1)} L${hx.toFixed(1)},${hy.toFixed(1)}"/><path d="M${b.x.toFixed(1)},${b.y.toFixed(1)} L${(hx-uy*5).toFixed(1)},${(hy+ux*5).toFixed(1)} L${(hx+uy*5).toFixed(1)},${(hy-ux*5).toFixed(1)}Z" fill="${acc}"/>${lab?`<text class="big" x="${(b.x+ux*6+6).toFixed(1)}" y="${(b.y+uy*6+4).toFixed(1)}" style="fill:${acc}">${esc(lab)}</text>`:""}`};
function card(rows,title){const w=176,h=22+rows.length*17;const nar=W_()<560;let o=`<g transform="translate(${nar?8:14},${nar?H_()-h*0.8-8:14})${nar?" scale(.8)":""}"><rect class="pill" width="${w}" height="${h}" rx="10"/><text x="12" y="15">${esc(title||"Physics data")}</text>`;rows.forEach((r,i)=>{o+=`<text class="sub" x="12" y="${32+i*17}">${esc(r[0])}</text><text class="big" x="${w-12}" y="${33+i*17}" text-anchor="end">${esc(r[1])}</text>`});return o+"</g>"}
const LOOK=[["plunger","Ball launcher"],["flipL","Flipper"],["solL","Solenoid"],["b2","Pop bumper"],["slingR","Slingshot"],["ramp","Ramp"],["lock","Lock and kicker"],["rollovers","Rollover lane"],["target","Standup target"],["outlaneL","Outlane"],["drain","Drain"],["gate","One-way gate"],["pcb","Circuit board"],["led","LED"],["backbox","Scoreboard"]];
const SUB={plunger:`spring k = ${K} N/m · up to ${T.X_MAX} mm`,flipL:"pivot mechanism · rubber edge",solL:"coil pulls the link",b2:"elastic cap + 1.0 m/s kick",slingR:"kicker rubber · e = 1.1",ramp:"wire-form hump, 24 mm rise",lock:"catches the ball · kicker fires it",rollovers:"the landing line",target:"hit it with the flipper",outlaneL:"no way back · drain",drain:"ball over",gate:"up only",pcb:"sensor inputs · LED driver",led:"one soft indicator",backbox:"score · ball · streak"};
function anno(){if(!fig||!ov||!api)return;const st=api.step;const W=W_(),H=H_();ov.setAttribute("viewBox",`0 0 ${W} ${H}`);const acc=ACC();let o="";const b=sim.ball;
  const pr=(x,y,z)=>fig.project(x,y,z||0);
  // the scoreboard, as a pill on the backbox display
  const narrow=W<560;
  {const q=pr(260,812,95);if(narrow)o+=pillAt(W-150,6,`Score ${fmt(total())}`,`ball ${st.k==="free"?Math.max(0,4-s.balls):"—"} · streak ${s.streak}`,null,null,acc);else if(q.visible)o+=pillAt(q.x-70,q.y-30,`Score ${fmt(total())}`,`ball ${st.k==="free"?Math.max(0,4-s.balls):"—"} · streak ${s.streak} · best ${fmt(s.best)}`,null,null,acc)}
  if(st.k==="look"){const L=fig.labels(LOOK).filter(l=>l.visible);const left=L.filter(l=>l.x<W*0.5).sort((a,b2)=>a.y-b2.y),right=L.filter(l=>l.x>=W*0.5).sort((a,b2)=>a.y-b2.y);
    const lay=(arr,side)=>{let last=-99;arr.forEach(l=>{const w=Math.max(l.text.length*6.6,(SUB[l.id]||"").length*5.6)+16;let y=Math.max(l.y-15,last+36);last=y;const x=side<0?Math.max(6,Math.min(l.x-60,W*0.5)-w-30):Math.min(W-w-6,Math.max(l.x+60,W*0.5)+30);o+=pillAt(x,y,l.text,SUB[l.id]||"",l.x,l.y,acc)})};
    lay(left,-1);lay(right,1);ov.innerHTML=o;return}
  // the trail of the ball (its path on the playfield)
  if(sim.trail.length>2){let d="";sim.trail.forEach((p,i)=>{const q=pr(p[0],p[1],T.BALL_R);d+=(i?"L":"M")+q.x.toFixed(1)+","+q.y.toFixed(1)});o+=`<path d="${d}" fill="none" stroke="${acc}" stroke-width="1.4" stroke-dasharray="3 4" opacity=".7"/>`}
  const live=b.mode==="free"||b.mode==="ramp"||b.mode==="stroke";
  const bq=pr(b.x,b.y,T.BALL_R+(b.h||0));
  if(live&&bq.visible){const v=Math.hypot(b.vx,b.vy)/1000;
    if(v>0.05){const q2=pr(b.x+b.vx*0.09,b.y+b.vy*0.09,T.BALL_R+(b.h||0));o+=arrow(bq,q2,acc,`v = ${fmt(v,2)} m/s`)}
    const qa=pr(b.x,b.y-70,T.BALL_R+(b.h||0));o+=arrow({x:bq.x,y:bq.y},qa,"#8E7CC3","");if(st.k==="ramp"||st.k==="launch")o+=`<text class="sub" x="${(qa.x-70).toFixed(1)}" y="${(qa.y+14).toFixed(1)}" style="fill:#8E7CC3">a = g sin 6.5° = ${fmt(GE,2)} m/s²</text>`}
  // round-specific callouts
  if(st.k==="launch"&&!narrow){const q=pr(T.PLUNGER.x,T.PLUNGER.restY-sim.plunger.x-40,T.BALL_R);if(q.visible)o+=pillAt(q.x-250,q.y-70,"Ball launcher",`x = ${fmt(s.x)} mm · ½kx² = ${fmt(0.5*K*(s.x/1000)**2,3)} J`,q.x,q.y,acc);
    if(s.lastLaunch&&sim.t-s.lastLaunch.t<2.5){const q3=pr(T.PLUNGER.x,T.PLUNGER.restY+T.BALL_R+30,T.BALL_R);if(q3.visible)o+=pillAt(q3.x-210,q3.y-40,"Measured",`v = ${fmt(s.lastLaunch.v,2)} m/s at release`,q3.x,q3.y,"#E8664A")}}
  if(st.k==="bumper"){const B=T.BUMPERS[2];const q=pr(B.c[0],B.c[1],50);if(q.visible&&!narrow)o+=pillAt(q.x+50,q.y-60,"Pop bumper",`e = ${fmt(T.BUMPER.e,1)} + ${fmt(T.BUMPER.kick/1000,1)} m/s kick · momentum`,q.x,q.y,acc);
    if(b.mode==="free"&&b.vy>0&&b.y<B.c[1]-B.r-T.BALL_R&&b.x>200&&b.x<300&&!s.round.bumperDone&&bq.visible)o+=pillAt(bq.x+30,bq.y+10,"Approach",`u at impact ≈ ${fmt(uImpact(s.u0),2)} m/s`,null,null,acc);
    if(s.lastBumper&&sim.t-s.lastBumper.t<3&&s.lastBumper.id==="b3"){const q2=pr(B.c[0],B.c[1]-B.r-40,T.BALL_R);if(q2.visible)o+=pillAt(q2.x-220,q2.y+10,"Rebound",`v' = ${fmt(s.lastBumper.v,2)} m/s · Δp = ${fmt(s.lastBumper.dp,3)} kg m/s`,q2.x,q2.y,"#E8664A")}}
  if(st.k==="ramp"){const Lk=T.LOCK;const q=pr(Lk.c[0],Lk.c[1],8);if(q.visible&&!narrow)o+=pillAt(q.x-40,q.y-70,"Lock and kicker",`v = ${fmt(s.kickV,2)} m/s at θ = ${s.kickTh}°`,q.x,q.y,acc);
    // the called distance and the measured one, as ticks on the landing line
    const tick=(xm,lab,col,below)=>{const a=pr(Lk.c[0]+xm*1000,Lk.c[1]-14,2),c=pr(Lk.c[0]+xm*1000,Lk.c[1]+14,2);if(a.visible)o+=`<path d="M${a.x.toFixed(1)},${a.y.toFixed(1)} L${c.x.toFixed(1)},${c.y.toFixed(1)}" stroke="${col}" stroke-width="2.4"/><text class="big" x="${(c.x+6).toFixed(1)}" y="${(below?c.y+14:a.y-6).toFixed(1)}" style="fill:${col}">${esc(lab)}</text>`};
    tick(s.callR,`your call · ${fmt(s.callR,3)} m`,acc,false);if(s.lastLanding&&!s.lastLanding.deflected)tick(s.lastLanding.R,`landed · ${fmt(s.lastLanding.R,3)} m`,"#E8664A",true);
    const l0=pr(Lk.c[0],Lk.c[1],2),l1=pr(T.LANE_X-10,Lk.c[1],2);o+=`<path d="M${l0.x.toFixed(1)},${l0.y.toFixed(1)} L${l1.x.toFixed(1)},${l1.y.toFixed(1)}" stroke="${acc}" stroke-width="1" stroke-dasharray="2 4" opacity=".7"/>`}
  if(st.k==="flipper"){const Pv=T.FLIP.L.pivot;const q=pr(Pv[0]+30,Pv[1]-10,10);const f=s.flipShot||s.lastFlip;if(q.visible&&!narrow)o+=pillAt(q.x-250,q.y-120,"Impulse meter",f?`J = FΔt = ${fmt(f.J,3)} N s · Δt ${fmt(f.dt*1000,0)} ms · F ${fmt(f.F,1)} N`:"J = FΔt · press Z as the ball arrives",q.x,q.y,acc);
    const tq=pr((T.TARGET.x0+T.TARGET.x1)/2,T.TARGET.y,14);if(tq.visible)o+=pillAt(tq.x+40,tq.y-50,"Target",sim.flash.target?"hit":"aim here",tq.x,tq.y,sim.flash.target?"#E8664A":acc)}
  // the data card
  const v=live?Math.hypot(b.vx,b.vy)/1000:0,hm=Math.max(0,b.y)/1000;
  const rows=st.k==="launch"?[["x",`${fmt(s.x)} mm`],["½kx²",`${fmt(0.5*K*(s.x/1000)**2,3)} J`],["v now",`${fmt(v,2)} m/s`],["Ek = ½mv²",`${fmt(0.5*M*v*v,3)} J`]]
    :st.k==="bumper"?[["u₀",`${fmt(s.u0,2)} m/s`],["u at impact",`${fmt(uImpact(s.u0),2)} m/s`],["p = mv now",`${fmt(M*v,3)} kg m/s`],["v now",`${fmt(v,2)} m/s`]]
    :st.k==="ramp"?[["kick v",`${fmt(s.kickV,2)} m/s`],["θ",`${s.kickTh}°`],["g sin 6.5°",`${fmt(GE,2)} m/s²`],["apex so far",`${s.lastKick&&sim.flight?fmt((sim.flight.apex-sim.flight.y0)/1000,3):"—"} m`]]
    :st.k==="flipper"?[["J so far",`${s.flipShot?fmt(s.flipShot.J,3):"—"} N s`],["v now",`${fmt(v,2)} m/s`],["p = mv",`${fmt(M*v,3)} kg m/s`],["Ek",`${fmt(0.5*M*v*v,3)} J`]]
    :[["h up the table",`${fmt(hm,2)} m`],["v",`${fmt(v,2)} m/s`],["p = mv",`${fmt(M*v,3)} kg m/s`],["Ek = ½mv²",`${fmt(0.5*M*v*v,3)} J`]];
  o+=card(rows,"Physics data");
  ov.innerHTML=o}
// ---- the HUD strip under the table
const ROUND_HELP={look:"Drag the table to look around. The labels name the parts; every one of them is a piece of 91171.",
  launch:"Set the spring, call the launch speed from ½kx² = ½mv², then fire (or hold Space).",
  bumper:"Choose the approach speed, call the rebound speed (elastic bounce + the kick), then fire the test ball at bumper 3.",
  ramp:"Set the kicker, call how far along the line the ball comes back (R = v² sin 2θ ÷ g sin 6.5°), then fire.",
  flipper:"Feed a ball to the left flipper and hit the standup target with the smallest impulse you can.",
  audit:"Play one whole ball, then read where its energy went.",free:"Three balls. Z and / flip, hold Space (or Pull) for the plunger. Points for everything you hit.",test:"Set the controls to answer each challenge, then press Check."};
function drawHud(st){if(!hud)return;const r=s.result&&sim.t-s.resultAt<14?s.result:ROUND_HELP[st.k]||"";
  hud.innerHTML=`<div class="say">${r}</div><div class="sc"><span>Score<b>${fmt(total())}</b></span><span>Streak<b>${s.streak}</b></span>${st.k==="free"?`<span>Balls<b>${s.balls}</b></span>`:""}<span>Best<b>${fmt(s.best)}</b></span></div>`}
// ---- the energy audit: a waterfall drawn in the close-up canvas
function drawWaterfall(){const d=s.audit||(s.ledger0?Object.fromEntries(Object.keys(sim.ledger).map(k=>[k,sim.ledger[k]-(s.ledger0[k]||0)])):null);
  if(!d){return `<g class="pb-wf"><text class="t" x="16" y="30">Energy audit</text><text class="sub" x="16" y="52">Fire a ball to see where its energy goes: spring in, kicks added,</text><text class="sub" x="16" y="68">rubber and friction out, and what is left at the drain.</text></g>`}
  const live=!s.audit;const E=sim.energy();const left=live?E.total:(d.drainKE||0);
  const items=[["Spring",d.spring],["Bumpers",d.bumper],["Slingshots",d.sling],["Flippers",d.flipper],["Kicker",d.kicker],["Rails & rubber",d.rails],["Friction",d.friction],["Lock",d.lock]].filter(x=>Math.abs(x[1])>1e-6||x[0]==="Spring");
  if(d.nudge)items.push(["Nudge",d.nudge]);
  const maxE=Math.max(0.05,items.reduce((a,x)=>a+Math.max(0,x[1]),0));const x0=92,x1=330,y0=48,barH=18,gap=8;const sx=(x1-x0)/maxE;let run=0,o=`<g class="pb-wf"><text class="t" x="16" y="30">Energy audit · ${live?"this ball so far":"last ball"}</text><text class="sub" x="384" y="30" text-anchor="end">running total</text>`;
  items.forEach((it,i)=>{const y=y0+i*(barH+gap);const a=run,b2=run+it[1];run=b2;const xa=x0+Math.min(a,b2)*sx,w=Math.max(1.5,Math.abs(b2-a)*sx);const col=it[1]>=0?(it[0]==="Spring"?"var(--acc)":"#3DB36B"):"#E8664A";
    const lab=`${it[1]>=0?"+":"−"}${fmt(Math.abs(it[1])*1000,0)} mJ`;const right=it[1]>=0||xa<x0+70;
    o+=`<text x="${x0-8}" y="${y+13}" text-anchor="end" class="sub">${esc(it[0])}</text><rect x="${xa.toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="${barH}" rx="4" fill="${col}" opacity=".9"/><text class="v" x="${(right?xa+w+6:xa-6).toFixed(1)}" y="${y+13}"${right?"":' text-anchor="end"'}>${lab}</text>`});
  const y=y0+items.length*(barH+gap);o+=`<text x="${x0-8}" y="${y+13}" text-anchor="end">${live?"Ball now":"At the drain"}</text><rect x="${x0}" y="${y}" width="${Math.max(1.5,left*sx).toFixed(1)}" height="${barH}" rx="4" fill="var(--as-ink)"/><text class="v" x="${(x0+left*sx+6).toFixed(1)}" y="${y+13}">${fmt(left*1000,0)} mJ${live?" (Ek + Ep)":" of Ek"}</text>`;
  o+=`<text class="sub" x="16" y="${y+46}">Energy is conserved: spring + kicks − losses = what the ball has.</text><text class="sub" x="16" y="${y+62}">The rubber and rails take far more than rolling friction does.</text></g>`;return o}
// ---- steps
const steps=[
 {k:"look",lab:"Look inside",cap:"A tabletop pinball machine with a see-through sky-blue case, so you can watch the mechanism. Drag to turn it. A spring launcher, two flippers on pivots with solenoids under the playfield, three pop bumpers, two slingshots, a wire ramp into a lock with a kicker, a row of rollovers, a standup target, the outlanes and the drain.",speed:1,controls:["vlook","vside","vabove"],
  big:"<b>The big idea:</b> a pinball table is a mechanics exam laid out flat. The playfield slopes 6.5°, so the ball's acceleration down the table is g sin 6.5° = 1.11 m s⁻², and everything else (springs, collisions, impulses, projectiles) happens on that slope.",
  exam:"On a slope of angle θ the component of gravity along the slope is g sin θ. The playfield slopes at 6.5°, so a free ball accelerates down the table at a = 9.8 × sin 6.5° = 1.11 m s⁻², whatever its mass. The 80 g steel ball weighs 0.78 N; the component along the slope is 0.089 N.",
  trap:"Using g = 9.8 m s⁻² for motion along a slope. Only the component along the slope accelerates the ball: g sin θ. (The component into the table, g cos θ, is what the playfield pushes back against.)",chips:["tilt","mass","geff"]},
 {k:"launch",lab:"Launch: ½kx²",cap:"Round 1. Pull the plunger back a distance x and the spring (k = 400 N m⁻¹) stores ½kx². On release that becomes the ball's kinetic energy. Call the launch speed before you fire; the table measures the real one at the moment the ball leaves the plunger.",speed:1,controls:["x","callV","fire","vplay","vlook"],
  big:"<b>The big idea:</b> elastic potential energy, Ep = ½kx², and energy conservation: ½kx² = ½mv², so v = x√(k ÷ m). Double x and you double v (and quadruple the energy).",
  exam:"The spring stores Ep = ½kx² = ½ × 400 × 0.040² = 0.32 J. If all of it becomes kinetic energy, ½mv² = 0.32 J, so v = √(2 × 0.32 ÷ 0.080) = 2.8 m s⁻¹. (The real launch is a little slower because the ball climbs 40 mm of slope during the stroke, and the plunger rod has mass.)",
  trap:"Forgetting to square x, or leaving it in millimetres. 40 mm is 0.040 m; ½kx² with x in mm gives an answer 10⁶ times too big.",chips:["x","Es","callV","measV","streak"],onStep:()=>{readyBall();s.round.bumperDone=false}},
 {k:"bumper",lab:"Bumper: momentum",cap:"Round 2. A pop bumper's cap is almost perfectly elastic (e = 1.0), and when its skirt switch closes a solenoid kicks the ball away at an extra 1.0 m s⁻¹. The test rig sends the ball straight up at bumper 3. Call the rebound speed; the readout shows the speed it will arrive at after slowing on the slope.",speed:1,controls:["u0","callReb","fire","vplay","vabove"],
  big:"<b>The big idea:</b> in a collision with something fixed and heavy, momentum is still conserved: the table takes the ball's momentum change. An elastic bounce reverses the ball's velocity (v′ = u); the kick adds to it. The change in momentum Δp = m(v′ + u) is what the bumper's impulse supplies.",
  exam:"The ball (0.080 kg) arrives at 1.41 m s⁻¹ and leaves at 2.41 m s⁻¹ in the opposite direction. Taking away from the bumper as positive, Δp = m(v′ − u) = 0.080 × (2.41 − (−1.41)) = 0.31 kg m s⁻¹. Momentum is conserved in the collision: the bumper, bolted to the table (and the Earth), gains an equal and opposite momentum that we never notice.",
  trap:"Saying momentum is not conserved because the ball bounces back faster. The system is ball + bumper + table; the ball's momentum changes, the system's does not. And remember the sign: a reversal of direction makes Δp bigger than either momentum alone.",chips:["u0","uImp","callReb","measReb","dp"],onStep:()=>{s.round.bumperDone=false;if(sim.ball.mode!=="lane")readyBall()}},
 {k:"ramp",lab:"Ramp: projectile",cap:"Round 3. The ball rides the wire ramp into the lock. The kicker then fires it across the sloping table at a speed v and angle θ to the landing line. On the slope it is a projectile with g_eff = g sin 6.5°, and it comes back to the line a distance R = v² sin 2θ ÷ g_eff along it. Call R, then fire.",speed:1,controls:["kickV","kickTh","callR","fire","vabove","vplay"],
  big:"<b>The big idea:</b> projectile motion is two independent motions. Along the line, constant speed v cos θ; across it, constant acceleration g_eff. Time of flight t = 2v sin θ ÷ g_eff, so R = v cos θ × t = v² sin 2θ ÷ g_eff. Biggest range at 45°.",
  exam:"Kicked at 0.50 m s⁻¹ at 35° to the line, with g_eff = 9.8 sin 6.5° = 1.11 m s⁻²: time of flight t = 2 × 0.50 × sin 35° ÷ 1.11 = 0.52 s, and R = 0.50 × cos 35° × 0.52 = 0.21 m (or R = v² sin 2θ ÷ g_eff = 0.25 × 0.94 ÷ 1.11 = 0.21 m). The apex is v² sin² θ ÷ 2g_eff = 0.037 m above the line.",
  trap:"Using sin 2θ as 2 sin θ, or plugging 9.8 in for g_eff on a slope. Also: the range formula only works when the ball lands back at the level it left from, which is why the lock sits on the landing line.",chips:["kickV","kickTh","callR","measR","apex"],onStep:()=>{s.round.rampDone=false;s.lastLanding=null;sim.lockAuto=false;if(sim.ball.mode!=="lane")readyBall()}},
 {k:"flipper",lab:"Flipper: impulse",cap:"Round 4. Impulse is force × time, J = FΔt, and it equals the ball's change in momentum. The flipper is in contact with the ball for only a few milliseconds, so even a small impulse means a large force. Feed a ball, press Z as it arrives, and hit the standup target using as little impulse as you can.",speed:1,controls:["feed","vplay","vabove"],
  big:"<b>The big idea:</b> J = FΔt = Δp. The meter integrates the force the flipper applies over the contact time. Same impulse, shorter contact, bigger force; a well-timed gentle flip moves the ball with far less force than a wild one.",
  exam:"The flipper changes the ball's velocity by 2.5 m s⁻¹ in 0.012 s. Impulse J = Δp = mΔv = 0.080 × 2.5 = 0.20 N s. Average force F = J ÷ Δt = 0.20 ÷ 0.012 = 17 N, about 21 times the ball's weight. The force is not constant during the contact; 17 N is the average.",
  trap:"Confusing impulse with force. Impulse is the whole effect of a force over the time it acts (N s, the same unit as kg m s⁻¹). The force is impulse ÷ time, so it depends on how long the contact lasts.",chips:["J","dt","F","dv","bestJ"],onStep:()=>{s.flipShot=null;if(sim.ball.mode!=="lane")readyBall()}},
 {k:"audit",lab:"Energy audit",cap:"Round 5. Energy is never lost, only moved. Play one whole ball and the table keeps the books: ½kx² in from the spring, energy added by every bumper, slingshot and flipper kick, energy taken by the rubber, the rails and rolling friction, and what is left when the ball reaches the drain.",speed:1,controls:["x","fire","vplay","vlook"],
  big:"<b>The big idea:</b> conservation of energy as an audit. Kicks are work done on the ball (energy from the solenoids' electricity). Inelastic bounces turn kinetic energy into heat and sound. On this table the rubber and rails take far more than friction does.",
  exam:"Mechanical energy is not conserved in an inelastic collision: with e = 0.7 the ball keeps e² = 49% of the kinetic energy associated with its motion into the rubber; the rest becomes heat and sound. Momentum, though, is conserved in every collision, elastic or not: that is the difference between the two conservation laws.",
  trap:"Treating \"energy is conserved\" as \"kinetic energy is conserved\". Only elastic collisions conserve kinetic energy. Momentum is conserved in all of them (when no outside force acts during the collision).",chips:["Es","kicks","losses","leftover"],onStep:()=>{readyBall()}},
 {k:"free",lab:"Free play",cap:"Three balls, full table, nothing to predict. Z and / for the flippers, hold Space (or the Pull button) to pull the plunger and release to fire. Bumpers 100, slingshots 50, rollovers 25, the lock 250, the standup target 300, the ramp 500. Your points from the rounds carry over.",speed:1,controls:["newgame","fire","x","vplay","vabove"],
  big:"<b>The big idea:</b> everything you see now is the five rounds happening at once. Watch the speed arrow and the data card: the ball slows as it climbs (Ek → Ep), speeds up as it falls, loses a little at every rubber and gains at every kick.",
  exam:"A ball moving up the table at 2.0 m s⁻¹ climbs until its kinetic energy has become potential energy along the slope: ½mv² = m g sin θ × d, so d = v² ÷ (2 g sin θ) = 4.0 ÷ (2 × 1.11) = 1.8 m. Longer than the table, so it reaches the top; a 1.0 m s⁻¹ ball climbs only 0.45 m.",
  trap:"Reading \"height\" straight off a sloping table. On the slope the vertical rise is d sin θ, and the potential energy is m g d sin θ, which is why a pinball needs so little speed to reach the top.",chips:["score","balls","best","h","v"],onStep:()=>{if(sim.ball.mode!=="lane"&&!s.gameOver)readyBall()}},
 {k:"test",lab:"Test yourself",cap:"Five challenges. Set the controls from any round, then press Check. The machine marks you with the same physics that moves the ball.",controls:["x","u0","kickV","kickTh"],chips:["Es","uImp","measR","bestJ"],
  big:"<b>Exam tip:</b> name the law first (energy conservation, momentum conservation, impulse = change in momentum), then the equation, then the numbers with units. Say what your system is."}];
// ---- kupu Māori, each checked in Te Aka (ta = word id); notes in te-reo-notes.md. Momentum and impulse have no curriculum-cited term, so they stay in English.
const KUPU=[
 {mi:"tōpana",en:"force",ta:40375,chip:["F"]},
 {mi:"papatipu",en:"mass",ta:5179,chip:"mass",note:"Papatipu also means ancestral land. In science it means mass."},
 {mi:"tere",en:"speed",ta:7953,chip:["v","callV","measV","u0","uImp","callReb","measReb","kickV"],note:"Also means quick or fast."},
 {mi:"whakahohoro",en:"acceleration, speeding up",ta:12447,chip:"geff",note:"A general word for speeding up. Science classes may use another term, so check with your teacher."},
 {mi:"tō ā-papa",en:"gravity",ta:12845,note:"Te Aka also lists kume ā-papa."},
 {mi:"pūngao",en:"energy",ta:40075,chip:["kicks","losses","leftover"]},
 {mi:"pūngao neke",en:"kinetic energy",ta:47721,note:"Te Aka also lists pūngao konikoni."},
 {mi:"pūngao moe",en:"potential energy",ta:47720,chip:"Es"},
 {mi:"teitei",en:"height",ta:7895,chip:["h","apex"]},
 {mi:"koki",en:"angle",ta:2852,chip:"kickTh"}];
Object.entries({"look":["tō ā-papa","whakahohoro","papatipu"],"launch":["pūngao moe","pūngao neke","tere"],"bumper":["tere","tōpana"],"ramp":["koki","tere","tō ā-papa","teitei"],"flipper":["tōpana","tere"],"audit":["pūngao","pūngao neke","pūngao moe"],"free":["tere","teitei","pūngao"]}).forEach(([k,a])=>{const st=steps.find(x=>x.k===k);if(st)st.kupu=a});
const CH=[
  {q:"Set the plunger so the launch speed is 3.0 m s⁻¹ (within 0.1).",check:()=>Math.abs(vLaunch(s.x)-3.0)<0.1,ok:()=>`Yes: x = ${fmt(s.x)} mm. ½kx² = ${fmt(0.5*K*(s.x/1000)**2,3)} J = ½mv², so v = x√(k ÷ m) = ${fmt(vLaunch(s.x),2)} m s⁻¹.`,no:()=>`Not yet: ${fmt(s.x)} mm gives v = ${fmt(vLaunch(s.x),2)} m s⁻¹. Rearrange ½kx² = ½mv²: x = v√(m ÷ k) = ${fmt(3*Math.sqrt(M/K)*1000)} mm.`},
  {q:"Choose a test speed so the ball leaves bumper 3 at 2.5 m s⁻¹ (within 0.1). Remember it slows on the slope before it arrives.",check:()=>Math.abs(uImpact(s.u0)+T.BUMPER.kick/1000-2.5)<0.1,ok:()=>`Yes: it arrives at ${fmt(uImpact(s.u0),2)} m s⁻¹, bounces back at the same speed (e = 1) and the kick adds 1.0, so v′ = ${fmt(uImpact(s.u0)+1,2)} m s⁻¹. Δp = ${fmt(M*(uImpact(s.u0)*2+1),3)} kg m s⁻¹.`,no:()=>`Not yet: v′ = u + 1.0 = ${fmt(uImpact(s.u0)+1,2)} m s⁻¹. You need u = 1.5 m s⁻¹ at impact; it loses v² = u₀² − 2 g_eff d over the 0.11 m run-up, so u₀ ≈ ${fmt(Math.sqrt(1.5*1.5+2*GE*0.1095),2)} m s⁻¹.`},
  {q:"Set the kicker so the ball comes back to the line 0.25 m along it (within 0.015 m).",check:()=>Math.abs(rangeOf(s.kickV,s.kickTh)-0.25)<0.015,ok:()=>`Yes: R = v² sin 2θ ÷ g_eff = ${fmt(s.kickV,2)}² × sin ${2*s.kickTh}° ÷ ${fmt(GE,2)} = ${fmt(rangeOf(s.kickV,s.kickTh),3)} m.`,no:()=>`Not yet: R = ${fmt(rangeOf(s.kickV,s.kickTh),3)} m. At ${s.kickTh}° you need v = √(R g_eff ÷ sin 2θ) = ${fmt(Math.sqrt(0.25*GE/Math.sin(2*s.kickTh*Math.PI/180)),2)} m s⁻¹.`},
  {q:"Keep the speed and change only the angle so the range is as large as it can be.",check:()=>s.kickTh===45,ok:()=>`Yes: sin 2θ is biggest at θ = 45°, where R = v² ÷ g_eff = ${fmt(rangeOf(s.kickV,45),3)} m for ${fmt(s.kickV,2)} m s⁻¹.`,no:()=>`Not yet: at ${s.kickTh}° sin 2θ = ${fmt(Math.sin(2*s.kickTh*Math.PI/180),2)}. The range is largest when 2θ = 90°.`},
  {q:"In the flipper round, hit the target with an impulse under 0.25 N s.",check:()=>!!(s.round.flipper&&s.round.flipper.J<0.25),ok:()=>`Yes: your best shot was J = ${fmt(s.round.flipper.J,3)} N s in ${fmt(s.round.flipper.dt*1000,0)} ms, an average force of ${fmt(s.round.flipper.F,1)} N.`,no:()=>s.round.flipper?`Not yet: your best is ${fmt(s.round.flipper.J,3)} N s. A later, softer flip (the bat moving slower when it meets the ball) delivers less impulse.`:"Go to the flipper round, feed a ball and hit the target first."}];
// ---- mount
api=StudyKit.mount({kupu:KUPU,caseTint:"sky",
  eyebrow:"Physics · Mechanics", title:"The Physics Lab pinball", crumb:"NCEA Level 2 Physics · AS91171 Demonstrate understanding of mechanics", homeHash:"l2",
  fig:"FIG. 25 · A TABLETOP PINBALL MACHINE, SEE-THROUGH", railTitle:"Call the shot",
  badge:{label:"NCEA L2 Physics 91171",exam:"2026-11-18T14:00:00+13:00",examText:"Wed 18 Nov, 2pm"},
  mainBox:"0 0 800 500", mainLabel:"A see-through 3D pinball table",closeBox:"0 0 400 360",
  state:s, steps,
  onStep:(x,st)=>{s.result="";if(fig)fig.view(st.k==="look"?"look":st.k==="bumper"||st.k==="ramp"?"above":"play");s.playing=true;s.hold=false;sim.lockAuto=st.k!=="ramp";s.lockFireAt=0},
  controls:[{type:"play"},
    {type:"button",id:"fire",label:"Fire",onClick:(x,api)=>{const k=api.step.k;
      if(k==="bumper"){s.round.bumperDone=false;s.lastBumper=null;sim.placeBall(250,560,0,s.u0*1000);say("Test ball away.")}
      else if(k==="ramp"){s.round.rampDone=false;s.lastLanding=null;s.lastKick=null;sim.lockAuto=false;sim.placeBall(T.RAMP.x,300,0,1200);say("Up the ramp…")}
      else{if(s.gameOver&&k==="free")return;launchNow()}}},
    {type:"button",id:"feed",label:"Feed a ball",onClick:()=>{s.flipShot=null;sim.placeBall(56,262,0,0);say("Rolling down the inlane. Press Z as it reaches the flipper.")}},
    {type:"button",id:"newgame",label:"New game",onClick:()=>{sim.score=0;s.callPts=0;s.streak=0;s.balls=3;s.gameOver=false;readyBall();say("New game. Three balls.")}},
    {type:"button",id:"vlook",label:"Look",onClick:()=>{fig&&fig.view("look")}},
    {type:"button",id:"vplay",label:"Play view",onClick:()=>{fig&&fig.view("play")}},
    {type:"button",id:"vside",label:"Side",onClick:()=>{fig&&fig.view("side")}},
    {type:"button",id:"vabove",label:"Above",onClick:()=>{fig&&fig.view("above")}},
    {type:"range",id:"x",label:"Spring compression x",min:5,max:T.X_MAX,step:1,get:()=>s.x,set:(x,v)=>{s.x=v;if(sim.ball.mode==="lane")sim.pull(v)},fmt:()=>`${fmt(s.x)} mm`},
    {type:"range",id:"callV",label:"Your call: launch speed",min:0.5,max:5,step:0.05,get:()=>s.callV,set:(x,v)=>{s.callV=Math.round(v*100)/100},fmt:()=>`${fmt(s.callV,2)} m/s`},
    {type:"range",id:"u0",label:"Test speed u₀",min:1,max:2.5,step:0.05,get:()=>s.u0,set:(x,v)=>{s.u0=Math.round(v*100)/100},fmt:()=>`${fmt(s.u0,2)} m/s · arrives at ${fmt(uImpact(s.u0),2)}`},
    {type:"range",id:"callReb",label:"Your call: rebound speed",min:0.5,max:4,step:0.05,get:()=>s.callReb,set:(x,v)=>{s.callReb=Math.round(v*100)/100},fmt:()=>`${fmt(s.callReb,2)} m/s`},
    {type:"range",id:"kickV",label:"Kicker speed v",min:0.3,max:0.6,step:0.01,get:()=>s.kickV,set:(x,v)=>{s.kickV=Math.round(v*100)/100},fmt:()=>`${fmt(s.kickV,2)} m/s`},
    {type:"range",id:"kickTh",label:"Angle θ to the line",min:20,max:45,step:1,get:()=>s.kickTh,set:(x,v)=>{s.kickTh=v},fmt:()=>`${s.kickTh}°`},
    {type:"range",id:"callR",label:"Your call: distance R",min:0.05,max:0.4,step:0.005,get:()=>s.callR,set:(x,v)=>{s.callR=Math.round(v*1000)/1000},fmt:()=>`${fmt(s.callR,3)} m`}],
  tick:(x,dt,st)=>{tick(dt,st)},
  drawMain:(x,st)=>{if(fig)fig.pose(sim);flatFrame();try{anno()}catch(e){}drawHud(st);if(touchBtns){const off=st.k==="look"||st.k==="test";for(const k in touchBtns)touchBtns[k].hidden=off}return ""},
  drawClose:()=>drawWaterfall(),
  chips:()=>{const b=sim.ball,live=b.mode==="free"||b.mode==="ramp"||b.mode==="stroke",v=live?Math.hypot(b.vx,b.vy)/1000:0,r=s.round;const f=s.flipShot||s.lastFlip;return{
    tilt:["PLAYFIELD SLOPE","6.5°"],mass:["BALL",`${fmt(M*1000)} g · 27 mm`],geff:["g sin θ",`${fmt(GE,2)} m/s²`,true],
    x:["SPRING x",`${fmt(s.x)} mm`],Es:["½kx²",`${fmt(0.5*K*(s.x/1000)**2,3)} J`,true],callV:["YOUR CALL",`${fmt(s.callV,2)} m/s`],measV:["MEASURED v",s.lastLaunch?`${fmt(s.lastLaunch.v,2)} m/s`:"—",!!s.lastLaunch],streak:["STREAK",`${s.streak}`],
    u0:["TEST SPEED u₀",`${fmt(s.u0,2)} m/s`],uImp:["u AT IMPACT",`${fmt(uImpact(s.u0),2)} m/s`,true],callReb:["YOUR CALL",`${fmt(s.callReb,2)} m/s`],measReb:["MEASURED v′",s.lastBumper&&s.lastBumper.id==="b3"?`${fmt(s.lastBumper.v,2)} m/s`:"—",!!s.lastBumper],dp:["Δp",s.lastBumper?`${fmt(s.lastBumper.dp,3)} kg m/s`:"—"],
    kickV:["KICK v",`${fmt(s.kickV,2)} m/s`],kickTh:["ANGLE θ",`${s.kickTh}°`],callR:["YOUR CALL R",`${fmt(s.callR,3)} m`],measR:["MEASURED R",s.lastLanding?(s.lastLanding.deflected?"deflected":`${fmt(s.lastLanding.R,3)} m`):"—",!!s.lastLanding],apex:["APEX",s.lastLanding?`${fmt(s.lastLanding.apex,3)} m`:"—"],
    J:["IMPULSE J",f?`${fmt(f.J,3)} N s`:"—",!!f],dt:["CONTACT Δt",f?`${fmt(f.dt*1000,0)} ms`:"—"],F:["AVERAGE F",f?`${fmt(f.F,1)} N`:"—"],dv:["Δv = J ÷ m",f?`${fmt(f.J/M,2)} m/s`:"—"],bestJ:["BEST HIT",r.flipper?`${fmt(r.flipper.J,3)} N s`:"—"],
    kicks:["KICKS IN",s.ledger0?`+${fmt((sim.ledger.bumper+sim.ledger.sling+Math.max(0,sim.ledger.flipper)+sim.ledger.kicker-(s.ledger0.bumper+s.ledger0.sling+Math.max(0,s.ledger0.flipper)+s.ledger0.kicker))*1000,0)} mJ`:"—"],
    losses:["LOSSES",s.ledger0?`${fmt((sim.ledger.rails+sim.ledger.friction+sim.ledger.lock-(s.ledger0.rails+s.ledger0.friction+s.ledger0.lock))*1000,0)} mJ`:"—"],leftover:["BALL NOW",`${fmt(sim.energy().total*1000,0)} mJ`,true],
    score:["SCORE",fmt(total()),true],balls:["BALLS LEFT",`${s.balls}`],best:["BEST",fmt(s.best)],
    h:["h UP THE TABLE",`${fmt(Math.max(0,b.y)/1000,2)} m`],v:["SPEED",`${fmt(v,2)} m/s`,live]}},
  challenges:CH,
  papers:[{label:"NZQA: Physics past exams and exemplars",url:"https://www2.nzqa.govt.nz/ncea/subjects/past-exams-and-exemplars/physics/"},{label:"NZQA: AS91171 standard and specifications",url:"https://www.nzqa.govt.nz/ncea/assessment/view-detailed.do?standardNumber=91171"}],
  truth:"A stylised tabletop pinball machine: playfield 520 × 800 mm sloping 6.5°, a standard 27 mm, 80 g steel ball treated as a sliding point mass (no rolling energy), a 400 N/m plunger spring with a light rod, pop bumpers with e = 1.0 and a 1.0 m/s solenoid kick, slingshots with e = 1.1 and a 0.45 m/s kick, rubber e = 0.7, steel rails e = 0.55, flipper rubber e = 0.6, rolling resistance μ = 0.001; g = 9.8 m s⁻², no air resistance. The physics runs at a fixed 240 steps a second whatever the frame rate, so the readouts are the same on every device. Spring, kick and restitution values are estimates typical of a small table. Parts list: pinball.parts.md.",
  footer:"Covers AS91171 (L2 Mechanics): elastic potential energy and springs (½kx²), kinetic energy and conservation of energy, momentum and impulse (J = FΔt = Δp), elastic and inelastic collisions, projectile motion (R = v² sin 2θ / g) and motion on a slope (g sin θ). Add ?lite to the address for a plain drawing instead of the 3D model."
});
const style=document.createElement("style");style.textContent=CSS;document.head.appendChild(style);
mountFigure();
window.__PB={sim,state:s,api,fig:()=>fig,stats:()=>fig?fig.stats():null};
})();
