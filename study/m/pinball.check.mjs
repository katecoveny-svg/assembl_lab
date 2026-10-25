#!/usr/bin/env node
/* pinball.check.mjs: physics sanity checks for the Physics Lab pinball, run in Node on the sim in pinball3d.js
   (no three.js, no DOM). Fails (exit 1) if any check fails. Run from /home/claude/study:  node m/pinball.check.mjs
     1. launch speed matches ½kx² = ½mv² within 2% (the sim also loses a little to the slope during the stroke)
     2. the kicker's projectile range matches R = v² sin 2θ / g_eff within 3% (g_eff = g sin 6.5°)
     3. energy never increases except at the spring, bumpers, slingshots, flippers, the kicker (and the stuck-ball nudge)
     4. the energy ledger balances: start + gains + losses = end (per ball, within 1%)
     5. a head-on bumper hit rebounds at u + kick (e = 1.0), and Δp = m(u + v')
     6. the ramp hump rejects slow balls and passes fast ones, around the energy threshold
     7. a flipper shot's impulse equals the ball's momentum change, and the target is reachable from the inlane feed
     8. the ball never tunnels: it stays on the table, never inside a bumper, and drains in finite time with a player
     9. determinism: the same inputs give the same results (fixed 240 Hz step)
    10. table geometry: the drain gap between the flipper tips passes a ball, the inlanes pass a ball, nothing overlaps */
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const P=require("./pinball3d.js");
const {TABLE:T,Sim,GE,COL}=P;const M=T.BALL_M,R=T.BALL_R,g_eff=GE/1000;
const fails=[],notes=[];const ok=(cond,msg)=>{if(!cond)fails.push(msg);return cond};
const f=(x,d=3)=>Number(x).toFixed(d);
function runUntil(S,pred,maxSteps=240*30,onStep){let n=0;const got=[];while(n<maxSteps){onStep&&onStep(S,n);S.step();n++;for(const e of S.events){got.push(e);if(pred(e))return {e,n,got}}S.events.length=0;if(S.ball.mode==="drained")break}return {e:null,n,got}}
// a seeded player who flips when the ball is near a flipper
function player(seed){let s=seed;const rnd=()=>{s=(s*1103515245+12345)&0x7fffffff;return s/0x7fffffff};
  return {rnd,act(S,n){const b=S.ball;if(n%6)return;const nearL=b.mode==="free"&&b.y<140&&b.y>60&&b.x>150&&b.x<235&&b.vy<0,nearR=b.mode==="free"&&b.y<140&&b.y>60&&b.x>245&&b.x<330&&b.vy<0;S.setFlipper("L",nearL&&rnd()<0.8);S.setFlipper("R",nearR&&rnd()<0.8)}}}
// ---------------------------------------------------------------- 1. launch
for(const x of [15,30,40,60]){const S=new Sim();S.newBall();S.pull(x);S.fire();const {e}=runUntil(S,e=>e.kind==="launch",200);
  const vExp=Math.sqrt(T.K*(x/1000)**2/M);const err=e?Math.abs(e.v/vExp-1):1;ok(e&&err<0.02,`LAUNCH x=${x} mm: v=${e?f(e.v):"none"} m/s vs √(kx²/m)=${f(vExp)} (${f(err*100,2)}% off, need < 2%)`);
  if(e)notes.push(`launch x=${x} mm → ${f(e.v)} m/s (½kx² predicts ${f(vExp)}, ${f(err*100,2)}% off: the slope's work over the stroke)`)}
// ---------------------------------------------------------------- 2. projectile range
for(const [v,th] of [[0.3,20],[0.4,30],[0.5,35],[0.6,45],[0.55,25],[0.45,45]]){const S=new Sim();S.lockBall();S.lockAuto=false;S.kick(v*1000,th);const {e}=runUntil(S,e=>e.kind==="landing",240*5);
  const Rexp=v*v*Math.sin(2*th*Math.PI/180)/g_eff;const err=e?Math.abs(e.R/Rexp-1):1;ok(e&&!e.deflected&&err<0.03,`RANGE v=${v} θ=${th}°: R=${e?f(e.R,4):"none"} m vs v²sin2θ/g_eff=${f(Rexp,4)} (${f(err*100,2)}% off, need < 3%)${e&&e.deflected?" DEFLECTED":""}`);
  if(e)notes.push(`range v=${v} θ=${th}° → ${f(e.R,4)} m (formula ${f(Rexp,4)}, ${f(err*100,2)}% off: rolling resistance)`)}
// ---------------------------------------------------------------- 3 + 4 + 8. energy monotonicity, ledger balance, no tunnelling, finite balls
const GAIN_TOL=M*GE*6e-6+1e-7;   // a push-out of up to 6 mm up the slope shows as a PE blip; anything above that is a real gain
let viol=0,balls=0,drained=0,stepsTot=0,maxV=0,insideBumper=0,offTable=0,maxBall=0;
for(let seed=1;seed<=20;seed++){const S=new Sim();const pl=player(seed);S.rand=pl.rnd;S.newBall();const x=15+Math.round(pl.rnd()*45);S.pull(x);
  const E0=S.energy().total;const L0=JSON.parse(JSON.stringify(S.ledger));S.fire();let Eprev=S.energy().total,n=0,drainE=0;
  while(n<240*90&&S.ball.mode!=="drained"){pl.act(S,n);S.step();n++;const E=S.energy().total;
    if(E>Eprev+GAIN_TOL&&!S.gainStep){viol++;if(viol<4)notes.push(`energy +${f((E-Eprev)*1000,2)} mJ at t=${f(S.t,3)} s with no kick (${S.events.map(e=>e.kind).join(",")||"no event"}) mode ${S.ball.mode} at (${f(S.ball.x,0)}, ${f(S.ball.y,0)})`)}
    Eprev=E;for(const e of S.events)if(e.kind==="drain")drainE=e.E;S.events.length=0;
    const b=S.ball;if(b.mode==="free"){maxV=Math.max(maxV,Math.hypot(b.vx,b.vy));if(b.x<R-0.5||b.x>T.W-R+0.5||b.y>T.TOP-R+0.5)offTable++;for(const c of T.BUMPERS)if(Math.hypot(b.x-c.c[0],b.y-c.c[1])<c.r+R-1)insideBumper++}}
  balls++;stepsTot+=n;maxBall=Math.max(maxBall,n/240);if(S.ball.mode==="drained")drained++;
  // ledger: E_start + Σ(ledger deltas) should equal E_end, where E_end = KE at the drain + PE at the drain line
  const Eend=drainE+M*GE*S.ball.y*1e-6;let sum=0;for(const k in S.ledger)sum+=S.ledger[k]-(L0[k]||0);const flows=Object.values(S.ledger).reduce((a,v)=>a+Math.abs(v),0);
  const bal=Math.abs(E0+sum-Eend);ok(S.ball.mode!=="drained"||bal<=0.01*Math.max(flows,0.1),`LEDGER seed ${seed}: start ${f(E0,4)} + flows ${f(sum,4)} = ${f(E0+sum,4)} J but the ball ended with ${f(Eend,4)} J (off by ${f(bal*1000,2)} mJ)`)}
ok(viol===0,`ENERGY: ${viol} step(s) where the ball's energy rose with no spring, bumper, slingshot, flipper or kicker event`);
ok(insideBumper===0,`TUNNEL: the ball was inside a bumper on ${insideBumper} step(s)`);ok(offTable===0,`TUNNEL: the ball left the table on ${offTable} step(s)`);
ok(drained>=balls-2,`PLAY: only ${drained} of ${balls} balls drained within 90 s with a simple player (a stuck ball?)`);
ok(maxV<=T.V_MAX+1,`SPEED: the ball reached ${f(maxV/1000,2)} m/s, above the ${T.V_MAX/1000} m/s cap`);
notes.push(`${balls} balls played, ${drained} drained, ${f(stepsTot/240/balls,1)} s average, longest ${f(maxBall,1)} s, fastest ${f(maxV/1000,2)} m/s`);
// ---------------------------------------------------------------- 5. bumper
for(const u0 of [1.0,1.5,2.0,2.5]){const S=new Sim();S.placeBall(250,560,0,u0*1000);const {e}=runUntil(S,e=>e.kind==="bumper",240*2);
  const d=(T.BUMPERS[2].c[1]-T.BUMPERS[2].r-R-560)/1000;const uExp=Math.sqrt(u0*u0-2*g_eff*d);
  ok(e&&e.id==="b3"&&Math.abs(e.u-uExp)<0.02&&Math.abs(e.v-(e.u+T.BUMPER.kick/1000))<0.01&&Math.abs(e.dp-M*(e.u+e.v))<1e-3,`BUMPER u0=${u0}: ${e?`hit ${e.id} at u=${f(e.u)} (expected ${f(uExp)}), left at ${f(e.v)} (expected ${f(e.u+1)}), Δp=${f(e.dp)}`:"no hit"}`);
  if(e)notes.push(`bumper u0=${u0} → arrives ${f(e.u)} m/s, leaves ${f(e.v)} m/s, Δp = ${f(e.dp)} kg m/s`)}
// ---------------------------------------------------------------- 6. ramp threshold
{const Rm=T.RAMP,L=Rm.y1-Rm.y0;const vCrest=Math.sqrt(2*(g_eff*L/2000+T.G*Math.cos(T.TILT*Math.PI/180)*Rm.H/1000));// speed needed at the mouth to reach the crest, halfway up (no friction)
  const res={};for(const v of [vCrest*0.8,vCrest*0.95,vCrest*1.05,vCrest*1.3]){const S=new Sim();S.placeBall(Rm.x,Rm.y0-1,0,v*1000);const {e}=runUntil(S,e=>e.kind==="ramp",240*4);res[v.toFixed(3)]=e?e.crest:null}
  const vals=Object.entries(res);ok(vals[0][1]===false&&vals[1][1]===false&&vals[2][1]===true&&vals[3][1]===true,`RAMP: crest threshold should be about ${f(vCrest,2)} m/s at the mouth; got ${JSON.stringify(res)}`);
  notes.push(`ramp: needs about ${f(vCrest,2)} m/s at the mouth (${Rm.H} mm hump over ${L} mm of slope); slower balls roll back`)}
// ---------------------------------------------------------------- 7. flipper impulse and the target shot
{let hits=0,tried=0,Jmin=Infinity,Jerr=0;
  for(let d=0.62;d<=0.80;d+=0.01){const S=new Sim();S.placeBall(56,262,0,0);let n=0,pressAt=Math.round(d*240),J=null,hit=false,vBefore=null,vAfter=null;
    let other=false;
    while(n<240*4){if(n===pressAt){S.setFlipper("L",true);vBefore=[S.ball.vx,S.ball.vy]}if(n===pressAt+60)S.setFlipper("L",false);S.step();n++;
      for(const e of S.events){if(e.kind==="flipper"&&e.active&&e.J>0.02&&J===null){J=e;vAfter=[S.ball.vx,S.ball.vy]}else if(J===null&&n>pressAt&&e.kind!=="flipper")other=true;if(e.kind==="target"&&J&&!hit)hit=true}S.events.length=0;if(S.ball.mode==="drained")break}
    if(J){tried++;if(hit){hits++;Jmin=Math.min(Jmin,J.J)}
      // J should equal m|Δv| over the flip (gravity over ~10 ms is negligible); skip timings where the ball also hit something else meanwhile
      if(!other){const dv=Math.hypot(vAfter[0]-vBefore[0],vAfter[1]-vBefore[1])/1000;const dvJ=J.J/M;Jerr=Math.max(Jerr,Math.abs(dv-dvJ)/Math.max(dv,0.1))}}}
  ok(hits>=3,`FLIPPER: the standup target was hit on only ${hits} of ${tried} timings from the inlane feed (need ≥ 3)`);
  ok(Jerr<0.05,`FLIPPER: impulse J/m disagrees with the ball's Δv by up to ${f(Jerr*100,1)}% (need < 5%)`);
  notes.push(`flipper: ${hits} of ${tried} press timings hit the target; the softest hit used J = ${isFinite(Jmin)?f(Jmin):"—"} N s; J/m vs Δv within ${f(Jerr*100,1)}%`)}
// ---------------------------------------------------------------- 9. determinism
{const run=()=>{const S=new Sim();const pl=player(42);S.rand=pl.rnd;S.newBall();S.pull(35);S.fire();let n=0;while(n<240*20&&S.ball.mode!=="drained"){pl.act(S,n);S.step();n++;S.events.length=0}return `${S.score}|${f(S.t,4)}|${f(S.ball.x,3)}|${f(S.ball.y,3)}`};
  const a=run(),b=run();ok(a===b,`DETERMINISM: two identical runs differ (${a} vs ${b})`);notes.push(`determinism: identical runs give ${a.split("|")[0]} points at t=${a.split("|")[1]} s`)}
// ---------------------------------------------------------------- 10. geometry
{const Fl=T.FLIP;const tip=side=>{const C=Fl[side];return [C.pivot[0]+Fl.len*Math.cos(C.rest*Math.PI/180),C.pivot[1]+Fl.len*Math.sin(C.rest*Math.PI/180)]};const gap=Math.hypot(tip("R")[0]-tip("L")[0],tip("R")[1]-tip("L")[1])-2*Fl.r;
  ok(gap>2*R+2,`DRAIN GAP: ${f(gap,1)} mm between the flipper tips at rest; a ${2*R} mm ball must fit`);notes.push(`drain gap between flipper tips at rest: ${f(gap,1)} mm (ball ${2*R} mm)`);
  // inlane: the channel between each guide and its slingshot passes a ball
  const dSeg=(p,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1];let t=((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy);t=Math.max(0,Math.min(1,t));return Math.hypot(p[0]-a[0]-dx*t,p[1]-a[1]-dy*t)};
  for(const side of ["L","R"]){const G=T.GUIDES[side],Sg=T.SLINGS[side];let worst=Infinity;for(const v of Sg)for(let i=0;i<G.length-1;i++)worst=Math.min(worst,dSeg(v,G[i],G[i+1])-5);ok(worst>2*R+2,`INLANE ${side}: only ${f(worst,1)} mm between the guide and the slingshot posts`);notes.push(`inlane ${side}: ${f(worst,1)} mm clear between guide and slingshot`)}
  // bumpers clear of each other and of every static segment
  for(let i=0;i<T.BUMPERS.length;i++){const a=T.BUMPERS[i];for(let j=i+1;j<T.BUMPERS.length;j++){const b=T.BUMPERS[j];const d=Math.hypot(a.c[0]-b.c[0],a.c[1]-b.c[1])-a.r-b.r;ok(d>2*R+2,`BUMPERS ${a.id}/${b.id}: ${f(d,1)} mm apart, a ball must pass between`)}
    for(const sg of COL.segs){const d=dSeg(a.c,sg.a,sg.b)-a.r;ok(d>2*R,`BUMPER ${a.id} is ${f(d,1)} mm from ${sg.id}`)}}
  // the lock bay opening passes the kicker's whole angle range
  const Lk=T.LOCK,Rm=T.RAMP;for(const th of [20,45]){const yAtWall=Lk.c[1]+(Rm.x1-Lk.c[0])*Math.tan(th*Math.PI/180);ok(yAtWall>Rm.y1+R&&yAtWall<Rm.top-R,`LOCK BAY: a ${th}° kick crosses the bay wall at y=${f(yAtWall,0)}, outside the opening ${Rm.y1+R}…${Rm.top-R}`)}
  // the test ball's run at bumper 3 is clear of the target
  ok(T.TARGET.x0>250+R+2||T.TARGET.x1<250-R-2,`TARGET sits in the bumper test lane (x ${T.TARGET.x0}…${T.TARGET.x1})`)}
// ---------------------------------------------------------------- report
console.log(`pinball.check: ${P.PARTS.length} parts, ${COL.segs.length} wall segments, ${COL.circ.length} round parts, table ${T.W} × ${T.TOP} mm at ${T.TILT}° (g_eff ${f(g_eff,3)} m/s²), ball ${2*R} mm ${M*1000} g, spring ${T.K} N/m`);
for(const n of notes)console.log(`  note  ${n}`);
for(const m of fails)console.log(`  FAIL  ${m}`);
console.log(fails.length?`RESULT: ${fails.length} failure(s)`:"RESULT: all clear (launch within 2%, range within 3%, energy only ever added by the spring, bumpers, slingshots, flippers and kicker, ledger balanced, no tunnelling)");
process.exit(fails.length?1:0);
