/* pinball3d.js: the table, the physics and the see-through figure of the "Physics Lab" pinball machine for the
   `pinball` study machine (NCEA Level 2 Physics AS91171, Mechanics). Three things live here so the page and the Node
   checks share one source of truth:
     Pinball3D.TABLE  the table in millimetres (x across the playfield, y up the table, z height above it) and the
                      physics constants (tilt, ball, spring, restitution per part). Parts list: pinball.parts.md.
     Pinball3D.Sim    a real 2D rigid-body sim on the table plane: gravity is the component down the slope
                      (g sin 6.5°), restitution per part, bumper and slingshot kicks, flippers as driven capsules,
                      the plunger as a spring (solved exactly), a wire ramp (1D path with a height hump), a lock with
                      a kicker, rollovers, a standup target, the drain. Fixed 240 Hz step, no DOM, no three.js, so
                      pinball.check.mjs runs it in Node.
     Pinball3D.create the three.js r128 figure (materials from StudyKit.figMat: sky acrylic case, steel ball, copper
                      coils, mint plastic housings, blush / butter / lime bumper caps, one soft LED), posed from the
                      Sim every frame; the page projects an SVG overlay from it for labels, vectors and the data card.
   Units: mm, s, kg. Energies in joules. No text is baked into the model. */
(function(root,factory){const api=factory();if(typeof module!=="undefined"&&module.exports)module.exports=api;else root.Pinball3D=api})(typeof self!=="undefined"?self:this,function(){
"use strict";
const DEG=Math.PI/180;
// ---------------------------------------------------------------- the table (mm) and the physics constants
const TABLE={
  W:520,PLAY_W:480,LANE_X:480,STRAIGHT:540,ARCH:{cx:260,cy:540,r:260},TOP:800,
  TILT:6.5,G:9.8,                                   // the playfield slopes 6.5° towards the player (typical 6–7°)
  BALL_R:13.5,BALL_M:0.080,                         // a standard 27 mm, 80 g steel pinball
  K:400,X_MAX:60,PLUNGER:{x:501,restY:70},          // plunger spring 400 N/m (estimate), up to 60 mm of compression
  MU_R:0.001,                                       // rolling resistance, steel on a waxed playfield (estimate)
  FLIP:{len:66,r:8,e:0.6,wUp:28,wDown:18,L:{pivot:[158,92],rest:-32,up:28},R:{pivot:[322,92],rest:212,up:152}},
  BUMPERS:[{id:"b1",c:[170,630],r:32,cap:"blush"},{id:"b2",c:[330,640],r:32,cap:"butter"},{id:"b3",c:[250,715],r:32,cap:"lime"}],
  BUMPER:{e:1.0,kick:1000,refire:0.15,score:100},   // elastic cap plus a 1.0 m/s solenoid kick along the normal; the coil needs 0.15 s to reset before it can fire again
  SLING:{e:1.1,kick:450,score:50},                  // the slingshot's kicker rubber: e 1.1 plus 0.6 m/s
  E:{rail:0.55,guide:0.6,rubber:0.7,post:0.7,gate:0.3,target:0.5,lock:0.2},
  SLINGS:{L:[[85,200],[85,285],[145,215]],R:[[395,200],[395,285],[335,215]]},
  GUIDES:{L:[[40,300],[40,200],[58,165],[95,142],[150,108]],R:[[440,300],[440,200],[422,165],[385,142],[330,108]]},  // inlane guides: a curve that flattens into the flipper, so a ball rolls on rather than bouncing
  RAMP:{x:92,y0:330,y1:447,H:24,x0:70,x1:114,top:515,score:500},   // a wire-form hump: rises 24 mm and comes back to the playfield, into a walled lock bay
  LOCK:{c:[92,470],r:16,hold:0.6,score:250,kick:[600,35]},// the lock cup and its kicker (default 0.60 m/s at 35°); the bay is open to the right between y 447 and 515
  ROLLOVERS:{y:470,xs:[150,200,250,300,350,400,450],halfW:18,score:25},
  TARGET:{x0:272,x1:328,y:420,d:6,score:300},           // a wide standup target, off the centre line so the bumper test shot has a clear run
  GATE:{x0:480,y0:556,x1:520,y1:572},               // the one-way gate wire, above the lane wall and sloping down to the left, so a ball that lands on it rolls off into play
  DEFLECTOR:[[0,575],[60,535]],                     // a rubber deflector at the top of the left orbit, so the ball comes off the arch into the play rather than down the outlane
  V_MAX:6000,                                       // a pinch between moving parts can pump the ball; anything above 6 m/s is bled off (booked as a loss)
  DRAIN_Y:-25,DT:1/240};
const GE=TABLE.G*1000*Math.sin(TABLE.TILT*DEG);   // 1109 mm/s² down the table
const GP=TABLE.G*1000*Math.cos(TABLE.TILT*DEG);   // 9737 mm/s² into the table (for the ramp's rise and the rolling friction)
const M=TABLE.BALL_M,R=TABLE.BALL_R,W0=Math.sqrt(TABLE.K/M); // ω of the spring–ball system, 70.7 rad/s
// ---------------------------------------------------------------- the part table (for labels, the figure and pinball.parts.md)
const PARTS=[
  {id:"playfield",name:"Playfield",group:"cabinet",at:[260,400,0]},
  {id:"case",name:"Acrylic case",group:"cabinet",at:[260,400,60]},
  {id:"backbox",name:"Backbox and scoreboard",group:"cabinet",at:[260,836,95]},
  {id:"plunger",name:"Plunger and spring",group:"launch",at:[501,40,8]},
  {id:"lane",name:"Shooter lane",group:"launch",at:[501,300,0]},
  {id:"gate",name:"One-way gate",group:"launch",at:[500,564,22]},
  {id:"flipL",name:"Left flipper",group:"flippers",at:[158,92,8]},
  {id:"flipR",name:"Right flipper",group:"flippers",at:[322,92,8]},
  {id:"solL",name:"Flipper solenoid, left",group:"flippers",at:[158,102,-36]},
  {id:"solR",name:"Flipper solenoid, right",group:"flippers",at:[322,102,-36]},
  {id:"b1",name:"Pop bumper 1",group:"bumpers",at:[170,630,26]},{id:"b2",name:"Pop bumper 2",group:"bumpers",at:[330,640,26]},{id:"b3",name:"Pop bumper 3",group:"bumpers",at:[250,715,26]},
  {id:"slingL",name:"Slingshot, left",group:"slings",at:[105,233,12]},{id:"slingR",name:"Slingshot, right",group:"slings",at:[375,233,12]},
  {id:"ramp",name:"Wire ramp",group:"ramp",at:[92,390,46]},
  {id:"lock",name:"Lock and kicker",group:"ramp",at:[92,470,6]},
  {id:"led",name:"Lock LED",group:"ramp",at:[128,480,6]},
  {id:"rollovers",name:"Rollover lane",group:"targets",at:[300,470,2]},
  {id:"target",name:"Standup target",group:"targets",at:[300,423,14]},
  {id:"guideL",name:"Inlane guide, left",group:"lanes",at:[40,235,10]},{id:"guideR",name:"Inlane guide, right",group:"lanes",at:[440,235,10]},
  {id:"outlaneL",name:"Outlane, left",group:"lanes",at:[20,120,0]},{id:"outlaneR",name:"Outlane, right",group:"lanes",at:[460,120,0]},
  {id:"drain",name:"Drain (outhole)",group:"lanes",at:[240,-6,0]},
  {id:"pcb",name:"Circuit board",group:"electronics",at:[105,70,-52]},
  {id:"arch",name:"Top arch rail",group:"cabinet",at:[260,800,12]},
  {id:"deflector",name:"Orbit deflector",group:"lanes",at:[30,555,10]}];
const byId=Object.fromEntries(PARTS.map(p=>[p.id,p]));
// ---------------------------------------------------------------- static colliders
function buildColliders(){const segs=[],circ=[];
  const seg=(a,b,kind,id,e)=>segs.push({a,b,kind,id:id||kind,e:e!=null?e:TABLE.E[kind]!=null?TABLE.E[kind]:TABLE.E.rail});
  const post=(c,r,id)=>circ.push({c,r,kind:"post",id:id||"post",e:TABLE.E.post});
  seg([0,0],[0,TABLE.STRAIGHT],"rail","wallL");seg([TABLE.W,0],[TABLE.W,TABLE.STRAIGHT],"rail","wallR");
  const A=TABLE.ARCH,N=48;for(let i=0;i<N;i++){const a0=Math.PI-Math.PI*i/N,a1=Math.PI-Math.PI*(i+1)/N;seg([A.cx+A.r*Math.cos(a0),A.cy+A.r*Math.sin(a0)],[A.cx+A.r*Math.cos(a1),A.cy+A.r*Math.sin(a1)],"rail","arch")}
  seg([TABLE.LANE_X,0],[TABLE.LANE_X,TABLE.STRAIGHT],"rail","laneWall");
  for(const side of ["L","R"]){const G=TABLE.GUIDES[side];for(let i=0;i<G.length-1;i++)seg(G[i],G[i+1],"guide","guide"+side);post(G[0],4,"guidePost"+side);post(G[G.length-1],4,"flipPost"+side);
    const S=TABLE.SLINGS[side];seg(S[0],S[1],"rubber","sling"+side+"back");seg(S[1],S[2],"sling","sling"+side,TABLE.SLING.e);seg(S[2],S[0],"rubber","sling"+side+"low");S.forEach((p,i)=>post(p,5,"slingPost"+side+i))}
  const Rm=TABLE.RAMP;seg([Rm.x0,Rm.y0],[Rm.x0,Rm.top],"guide","rampRailL");seg([Rm.x1,Rm.y0],[Rm.x1,Rm.y1],"guide","rampRailR");seg([Rm.x0,Rm.top],[Rm.x1,Rm.top],"guide","lockBack");post([Rm.x1,Rm.y1],3,"lockPost");post([Rm.x1,Rm.top],3,"lockPost2");
  seg(TABLE.DEFLECTOR[0],TABLE.DEFLECTOR[1],"rubber","deflector");post(TABLE.DEFLECTOR[1],5,"deflectorPost");
  const Tg=TABLE.TARGET;seg([Tg.x0,Tg.y],[Tg.x1,Tg.y],"target","targetFace");seg([Tg.x0,Tg.y],[Tg.x0,Tg.y+Tg.d],"rubber","targetSide");seg([Tg.x1,Tg.y],[Tg.x1,Tg.y+Tg.d],"rubber","targetSide");seg([Tg.x0,Tg.y+Tg.d],[Tg.x1,Tg.y+Tg.d],"rubber","targetBack");
  for(const b of TABLE.BUMPERS)circ.push({c:b.c,r:b.r,kind:"bumper",id:b.id,e:TABLE.BUMPER.e,kick:TABLE.BUMPER.kick});
  return {segs,circ}}
const COL=buildColliders();
// ---------------------------------------------------------------- the sim
const ke=(vx,vy)=>0.5*M*(vx*vx+vy*vy)*1e-6;
class Sim{
  constructor(){this.rand=Math.random;this.reset()}
  reset(){this.t=0;this.step_n=0;
    this.ball={x:TABLE.PLUNGER.x,y:TABLE.PLUNGER.restY+R,vx:0,vy:0,mode:"none",s:0,vs:0,h:0};
    this.plunger={x:0,t:0,A:0,tr:0,ye:0};
    this.flip={L:{a:TABLE.FLIP.L.rest*DEG,w:0,pressed:false,J:[0,0],n:0,hit:false,dE:0,active:false},R:{a:TABLE.FLIP.R.rest*DEG,w:0,pressed:false,J:[0,0],n:0,hit:false,dE:0,active:false}};
    this.score=0;this.ledger={spring:0,bumper:0,sling:0,flipper:0,kicker:0,rails:0,friction:0,lock:0,nudge:0};
    this.events=[];this.lit=new Set();this.flash={};this.cool={};this.flight=null;this.lockT=0;this.lockAuto=true;this.lockFree=false;this.gateArmed=false;this.stillT=0;this.trail=[];this.lastFlip=null;this.launch=null;this.lastBumper=null;this.drains=0;this.gainStep=false;
    this.stats={bumpers:0,slings:0,flips:0,ramps:0,rejects:0,rollovers:0,targets:0}}
  ev(e){e.t=this.t;this.events.push(e);return e}
  // ---- external actions
  newBall(){const b=this.ball;b.mode="lane";b.x=TABLE.PLUNGER.x;b.y=TABLE.PLUNGER.restY+R;b.vx=b.vy=0;b.h=0;this.plunger.x=0;this.plunger.t=0;this.flight=null;this.trail.length=0;this.stillT=0;this.launch=null;this.lastBumper=null;this.ev({kind:"newball"})}
  pull(x){x=Math.max(0,Math.min(TABLE.X_MAX,x));this.plunger.x=x;if(this.ball.mode==="lane")this.ball.y=TABLE.PLUNGER.restY+R-x}
  fire(){const b=this.ball,p=this.plunger;if(b.mode!=="lane"||p.x<=0)return false;
    // the stroke, solved exactly: ÿ = ω²(y_rest − y) − g_eff about the shifted equilibrium; release when the compression reaches 0
    const d=GE/(W0*W0);p.A=p.x-d;p.ye=TABLE.PLUNGER.restY+R-d;p.tr=Math.acos(-d/p.A)/W0;p.t=0;p.x0=p.x;b.mode="stroke";
    const Es=0.5*TABLE.K*(p.x*1e-3)**2;this.ledger.spring+=Es;this.gainStep=true;this.ev({kind:"fire",x:p.x,E:Es});return true}
  placeBall(x,y,vx,vy){const b=this.ball;b.mode="free";b.x=x;b.y=y;b.vx=vx;b.vy=vy;b.h=0;this.flight=null;this.trail.length=0;this.stillT=0;this.ev({kind:"place"})}
  lockBall(){const b=this.ball;this.ledger.lock+=M*GE*(TABLE.LOCK.c[1]-b.y)*1e-6;b.mode="locked";b.x=TABLE.LOCK.c[0];b.y=TABLE.LOCK.c[1];b.vx=b.vy=0;b.h=0;this.lockT=0}
  kick(v,thetaDeg){const b=this.ball;if(b.mode!=="locked")return false;const th=thetaDeg*DEG;b.mode="free";b.x=TABLE.LOCK.c[0];b.y=TABLE.LOCK.c[1];b.vx=v*Math.cos(th);b.vy=v*Math.sin(th);this.lockFree=true;
    const E=ke(b.vx,b.vy);this.ledger.kicker+=E;this.gainStep=true;this.flight={x0:b.x,y0:b.y,v:v/1000,theta:thetaDeg,t0:this.t,landed:false,deflected:false,R:null,apex:b.y};this.trail.length=0;
    this.ev({kind:"kick",v:v/1000,theta:thetaDeg,E});return true}
  setFlipper(side,pressed){const f=this.flip[side];if(!!pressed&&!f.pressed){this.stats.flips++;f.J=[0,0];f.n=0;f.dE=0}f.pressed=!!pressed}// a press starts the impulse meter afresh, so J is the flip, not the ball resting on the bat beforehand
  // ---- energy bookkeeping: kinetic + the table-plane potential (m g sinθ y) + the ramp's rise (m g cosθ h) + the spring still to deliver
  energy(){const b=this.ball;let kin=0,pe=0,ph=0,sp=0;
    if(b.mode==="free"||b.mode==="stroke"){kin=ke(b.vx,b.vy);pe=M*GE*b.y*1e-6}
    else if(b.mode==="ramp"){kin=0.5*M*(b.vs*1e-3)**2;pe=M*GE*b.y*1e-6;ph=M*GP*b.h*1e-6}
    else if(b.mode==="lane"||b.mode==="locked"){pe=M*GE*b.y*1e-6}
    if(b.mode==="stroke"){const c=TABLE.PLUNGER.restY+R-b.y;sp=0.5*TABLE.K*(c*1e-3)**2}
    return {ke:kin,pe,ph,spring:sp,total:kin+pe+ph+sp}}
  // ---- one fixed step
  step(){const dt=TABLE.DT,b=this.ball;this.gainStep=false;this.t+=dt;this.step_n++;
    for(const k in this.flash)if((this.flash[k]-=dt)<=0)delete this.flash[k];for(const k in this.cool)if((this.cool[k]-=dt)<=0)delete this.cool[k];
    this.stepFlippers(dt);
    if(b.mode==="stroke")this.stepStroke(dt);
    else if(b.mode==="free")this.stepFree(dt);
    else if(b.mode==="ramp")this.stepRamp(dt);
    else if(b.mode==="locked"){this.lockT+=dt;if(this.lockAuto&&this.lockT>=TABLE.LOCK.hold)this.kick(TABLE.LOCK.kick[0],TABLE.LOCK.kick[1])}
    for(const side of ["L","R"]){const f=this.flip[side];if(f.n>0&&!f.hit){const J=Math.hypot(f.J[0],f.J[1]);const e={kind:"flipper",side,J,dt:f.n*dt,F:J/(f.n*dt),dE:f.dE,active:f.active};this.ev(e);if(f.active)this.lastFlip=e;f.J=[0,0];f.n=0;f.dE=0;f.active=false}f.hit=false}
    if(b.mode==="free"&&this.step_n%3===0){this.trail.push([b.x,b.y]);if(this.trail.length>160)this.trail.shift()}}
  stepFlippers(dt){for(const side of ["L","R"]){const f=this.flip[side],C=TABLE.FLIP[side];const rest=C.rest*DEG,up=C.up*DEG,dir=Math.sign(up-rest);
      const target=f.pressed?up:rest,w=f.pressed?TABLE.FLIP.wUp:TABLE.FLIP.wDown;const d=target-f.a;
      if(Math.abs(d)<1e-9){f.w=0;continue}const mv=Math.sign(d)*Math.min(Math.abs(d),w*dt);f.a+=mv;f.w=mv/dt}}
  stepStroke(dt){const p=this.plunger,b=this.ball;p.t+=dt;
    if(p.t>=p.tr){b.y=TABLE.PLUNGER.restY+R;b.vy=p.A*W0*Math.sin(W0*p.tr);b.vx=0;b.mode="free";p.x=0;this.launch={v:b.vy/1000,x:p.x0};this.ev({kind:"launch",v:b.vy/1000,x:p.x0});this.trail.length=0}
    else{b.y=p.ye-p.A*Math.cos(W0*p.t);b.vy=p.A*W0*Math.sin(W0*p.t);b.vx=0}}
  stepRamp(dt){const b=this.ball,Rm=TABLE.RAMP,L=Rm.y1-Rm.y0;const n=Math.max(1,Math.ceil(Math.abs(b.vs)*dt/2)),h=dt/n;// ≤ 2 mm per substep on the hump
    for(let i=0;i<n;i++){
      const dh=(Rm.H*Math.PI/L)*Math.cos(Math.PI*b.s/L);          // dh/ds of the hump h = H sin(π s/L)
      const a=-(GE+GP*dh);                                        // along the ramp (mm/s²): the table's slope plus the hump's rise
      b.vs+=a*h;const fr=TABLE.MU_R*GP*h;const sp=Math.abs(b.vs);if(sp>0){const loss=Math.min(sp,fr);this.ledger.friction-=0.5*M*(sp*sp-(sp-loss)**2)*1e-6;b.vs-=Math.sign(b.vs)*loss}
      b.s+=b.vs*h;
      if(b.s>=L){b.mode="free";b.x=Rm.x;b.y=Rm.y1+(b.s-L);b.vx=0;b.vy=b.vs;b.h=0;this.stats.ramps++;this.score+=Rm.score;this.ev({kind:"ramp",crest:true});return}
      if(b.s<=0){b.mode="free";b.x=Rm.x;b.y=Rm.y0+b.s;b.vx=0;b.vy=b.vs;b.h=0;this.stats.rejects++;this.ev({kind:"ramp",crest:false});return}
      b.x=Rm.x;b.y=Rm.y0+b.s;b.h=Rm.H*Math.sin(Math.PI*b.s/L);b.vx=0;b.vy=b.vs}}
  stepFree(dt){const b=this.ball;const sp=Math.hypot(b.vx,b.vy);const n=Math.max(1,Math.ceil(sp*dt/6));const h=dt/n;
    for(let i=0;i<n;i++){
      // rolling resistance against the motion (never reversing it), then a velocity-Verlet step under the slope's gravity (exact for the parabola)
      const s0=Math.hypot(b.vx,b.vy);if(s0>0){const loss=Math.min(s0,TABLE.MU_R*GP*h);this.ledger.friction-=0.5*M*(s0*s0-(s0-loss)**2)*1e-6;const k=(s0-loss)/s0;b.vx*=k;b.vy*=k}
      const x0=b.x,y0=b.y;b.x+=b.vx*h;b.y+=b.vy*h-0.5*GE*h*h;b.vy-=GE*h;
      const yc=b.y;this.collide();if(b.y!==yc)this.ledger.rails+=M*GE*(b.y-yc)*1e-6;// the push-out moves the ball a little up or down the slope: book that PE so the ledger balances
      this.triggers(x0,y0);
      if(b.mode!=="free")return}
    {const sp2=Math.hypot(b.vx,b.vy);if(sp2>TABLE.V_MAX){const k=TABLE.V_MAX/sp2;this.ledger.rails-=ke(b.vx,b.vy)*(1-k*k);b.vx*=k;b.vy*=k;this.ev({kind:"pinch",v:sp2/1000})}}
    if(Math.hypot(b.vx,b.vy)<5){this.stillT+=dt;if(this.stillT>2.5){this.stillT=0;const E0=ke(b.vx,b.vy);b.vx+=(this.rand()-0.5)*300;b.vy+=150;this.ledger.nudge+=ke(b.vx,b.vy)-E0;this.gainStep=true;this.ev({kind:"nudge"})}}else this.stillT=0;
    if(this.flight&&!this.flight.landed&&b.y>this.flight.apex)this.flight.apex=b.y}
  // contact response: push out, then reflect the approaching part of the velocity with the part's restitution (plus any kick)
  bounce(nx,ny,e,kick,kind,id){const b=this.ball;const vn=b.vx*nx+b.vy*ny;if(vn>=0)return null;const E0=ke(b.vx,b.vy);
    if(kind==="bumper"){if(this.cool[id])kick=0;else this.cool[id]=TABLE.BUMPER.refire}
    b.vx-=(1+e)*vn*nx;b.vy-=(1+e)*vn*ny;if(kick){b.vx+=kick*nx;b.vy+=kick*ny}
    const E1=ke(b.vx,b.vy),dE=E1-E0;const u=-vn/1000,v=Math.hypot(b.vx,b.vy)/1000;
    if(kind==="bumper"){this.ledger.bumper+=dE;if(dE>0)this.gainStep=true;if(kick){this.score+=TABLE.BUMPER.score;this.stats.bumpers++;this.flash[id]=0.3}this.lastBumper={id,u,v,dp:M*(u+(b.vx*nx+b.vy*ny)/1000),dE,kick:!!kick};this.ev({kind:"bumper",id,u,v,dp:this.lastBumper.dp,dE,kick:!!kick})}
    else if(kind==="sling"){this.ledger.sling+=dE;this.gainStep=true;this.score+=TABLE.SLING.score;this.stats.slings++;this.flash[id]=0.25;this.ev({kind:"sling",id,dE})}
    else if(kind==="target"){this.ledger.rails+=dE;this.score+=TABLE.TARGET.score;this.stats.targets++;this.flash.target=0.4;this.ev({kind:"target",dE,u})}
    else{this.ledger.rails+=dE;this.ev({kind:"rail",id,dE,u})}
    if(this.flight&&!this.flight.landed&&!this.flight.deflected){this.flight.deflected=true;this.flight.at=[b.x,b.y];this.ev({kind:"deflected",x:b.x,y:b.y,id})}
    return dE}
  collide(){const b=this.ball;
    for(let pass=0;pass<2;pass++){
      for(const s of COL.segs){const ax=s.a[0],ay=s.a[1],dx=s.b[0]-ax,dy=s.b[1]-ay;const L2=dx*dx+dy*dy;let t=((b.x-ax)*dx+(b.y-ay)*dy)/L2;t=t<0?0:t>1?1:t;const qx=ax+dx*t,qy=ay+dy*t;let nx=b.x-qx,ny=b.y-qy;const d=Math.hypot(nx,ny);
        if(d<R&&d>1e-9){nx/=d;ny/=d;b.x=qx+nx*R;b.y=qy+ny*R;this.bounce(nx,ny,s.e,s.kind==="sling"?TABLE.SLING.kick:0,s.kind,s.id)}}
      for(const c of COL.circ){let nx=b.x-c.c[0],ny=b.y-c.c[1];const d=Math.hypot(nx,ny),rr=R+c.r;if(d<rr&&d>1e-9){nx/=d;ny/=d;b.x=c.c[0]+nx*rr;b.y=c.c[1]+ny*rr;this.bounce(nx,ny,c.e,c.kick||0,c.kind,c.id)}}
      // the one-way gate at the top of the shooter lane (a slanted wire, lower at the playfield end): it lets a ball through on the way up
      // and only arms itself once the ball is clear above it, so a ball that stalls in the wire falls back rather than being lifted
      {const G=TABLE.GATE;const ax=G.x0,ay=G.y0,dx=G.x1-G.x0,dy=G.y1-G.y0;const L2=dx*dx+dy*dy;let t=((b.x-ax)*dx+(b.y-ay)*dy)/L2;t=t<0?0:t>1?1:t;const qx=ax+dx*t,qy=ay+dy*t;let nx=b.x-qx,ny=b.y-qy;const d=Math.hypot(nx,ny);
        const near=b.x>G.x0-R&&b.x<G.x1+R;
        if(!near||ny<0)this.gateArmed=false;else if(d>R+0.5)this.gateArmed=true;
        if(near&&this.gateArmed&&d<R&&d>1e-9&&ny>0){nx/=d;ny/=d;b.x=qx+nx*R;b.y=qy+ny*R;this.bounce(nx,ny,TABLE.E.gate,0,"gate","gate")}}
      // flippers: driven capsules; the contact speed of the bat is ω × r, so a moving flipper does work on the ball
      for(const side of ["L","R"]){const f=this.flip[side],P=TABLE.FLIP[side].pivot,len=TABLE.FLIP.len,rf=TABLE.FLIP.r;
        const tx=P[0]+len*Math.cos(f.a),ty=P[1]+len*Math.sin(f.a);const dx=tx-P[0],dy=ty-P[1];let t=((b.x-P[0])*dx+(b.y-P[1])*dy)/(len*len);t=t<0?0:t>1?1:t;const qx=P[0]+dx*t,qy=P[1]+dy*t;let nx=b.x-qx,ny=b.y-qy;const d=Math.hypot(nx,ny),rr=R+rf;
        if(d<rr&&d>1e-9){nx/=d;ny/=d;b.x=qx+nx*rr;b.y=qy+ny*rr;const rx=qx-P[0],ry=qy-P[1];const sx=-f.w*ry,sy=f.w*rx;const vrel=(b.vx-sx)*nx+(b.vy-sy)*ny;
          if(vrel<0){const E0=ke(b.vx,b.vy);const j=-(1+TABLE.FLIP.e)*vrel;b.vx+=j*nx;b.vy+=j*ny;const dE=ke(b.vx,b.vy)-E0;this.ledger.flipper+=dE;if(dE>0)this.gainStep=true;f.J[0]+=M*j*nx*1e-3;f.J[1]+=M*j*ny*1e-3;f.dE+=dE;
            if(this.flight&&!this.flight.landed&&!this.flight.deflected){this.flight.deflected=true;this.flight.at=[b.x,b.y];this.ev({kind:"deflected",x:b.x,y:b.y,id:"flip"+side})}}
          f.n++;f.hit=true;if(f.pressed||f.w>0.1)f.active=true}}}}
  triggers(x0,y0){const b=this.ball,Rm=TABLE.RAMP,Lk=TABLE.LOCK,Ro=TABLE.ROLLOVERS;
    // the ramp mouth: a ball going up the lane rides onto the wire-form (its sideways speed is taken by the rails)
    if(b.vy>0&&y0<Rm.y0&&b.y>=Rm.y0&&b.x>Rm.x0+R-2&&b.x<Rm.x1-R+2){const loss=ke(b.vx,0);this.ledger.rails+=-loss+M*GE*(Rm.y0-b.y)*1e-6;b.mode="ramp";b.s=0;b.y=Rm.y0;b.vs=b.vy;b.x=Rm.x;b.vx=0;b.h=0;this.ev({kind:"rampIn",v:b.vy/1000});return}
    // the lock cup captures a ball that rolls over it
    const dl=Math.hypot(b.x-Lk.c[0],b.y-Lk.c[1]);if(this.lockFree&&dl>Lk.r+12)this.lockFree=false;
    if(!this.lockFree&&dl<Lk.r){const E=ke(b.vx,b.vy);this.ledger.lock+=-E;this.lockBall();this.score+=Lk.score;this.ev({kind:"lock",E});this.flash.lock=0.5;return}
    // rollovers along the landing line
    if((y0<Ro.y&&b.y>=Ro.y)||(y0>Ro.y&&b.y<=Ro.y)){const i=Ro.xs.findIndex(x=>Math.abs(b.x-x)<Ro.halfW);if(i>=0){this.lit.add(i);this.flash["ro"+i]=0.6;this.score+=Ro.score;this.stats.rollovers++;this.ev({kind:"rollover",i})}}
    // the projectile shot: "landing" is the return to the line it was fired from
    const F=this.flight;if(F&&!F.landed&&b.vy<0&&y0>F.y0&&b.y<=F.y0){const k=(y0-F.y0)/(y0-b.y);const xl=x0+(b.x-x0)*k;F.landed=true;F.R=(xl-F.x0)/1000;F.xl=xl;this.ev({kind:"landing",R:F.R,x:xl,deflected:F.deflected,apex:(F.apex-F.y0)/1000})}
    if(b.y<TABLE.DRAIN_Y){const E=ke(b.vx,b.vy);b.mode="drained";b.vx=b.vy=0;this.drains++;this.ev({kind:"drain",E});this.flash.drain=0.6}}
}
// ---------------------------------------------------------------- the figure (browser only)
function create(THREE,canvas,opts){opts=opts||{};
  const FM=(typeof StudyKit!=="undefined"&&StudyKit.figMat)||opts.figMat;if(!FM)throw new Error("pinball3d needs StudyKit.figMat (kit.js) for its materials");
  const S=0.001,PAL=FM.palette,F=(kind,c,o)=>FM.three(THREE,kind,c,o);
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:"low-power"});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
  renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=0.92;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.VSMShadowMap;renderer.setClearColor(new THREE.Color(PAL.paper),1);
  const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(22,1,0.05,40);
  (function env(){const room=new THREE.Scene();const geo=new THREE.BoxGeometry();
    const wall=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:0xffffff,side:THREE.BackSide,roughness:1}));wall.scale.set(10,10,10);room.add(wall);
    const lamp=(w,h,d,x,y,z,c)=>{const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:c}));m.scale.set(w,h,d);m.position.set(x,y,z);room.add(m)};
    lamp(4,0.2,4,0,4.9,0,0xffffff);lamp(0.2,3,3,-4.9,1.5,0,0xfff2e0);lamp(0.2,3,3,4.9,1.5,0,0xe8f0ff);lamp(3,3,0.2,0,2,-4.9,0xffffff);
    room.add(new THREE.PointLight(0xffffff,0.6,0,2).translateY(2));const pm=new THREE.PMREMGenerator(renderer);scene.environment=pm.fromScene(room,0.04).texture;pm.dispose()})();
  scene.add(new THREE.HemisphereLight(0xffffff,0xd6dce8,0.22));
  const fill=new THREE.DirectionalLight(0xffffff,0.32);fill.position.set(1.5,2,3);scene.add(fill);
  const sun=new THREE.DirectionalLight(0xfff6ec,1.35);sun.position.set(-1.6,3.2,-1.2);sun.castShadow=true;sun.shadow.mapSize.set(1536,1536);sun.shadow.radius=8;sun.shadow.blurSamples=14;sun.shadow.bias=-0.0005;sun.shadow.normalBias=0.02;
  Object.assign(sun.shadow.camera,{left:-1.2,right:1.2,top:1.3,bottom:-1.3,near:0.3,far:10});scene.add(sun);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(10,10),new THREE.ShadowMaterial({color:new THREE.Color(PAL.shadow),opacity:0.6}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
  // materials: the shared bench recipe. The case is sky acrylic (this machine's one tint); rails a deeper sky; the works in steel, copper and mint plastic
  const SKY=PAL.case.sky,SKY2="#9CC4EC";
  const Mt={pane:F("glass",SKY,{opacity:0.42,transmission:0.85}),top:F("glass",0xF2FAFD,{opacity:0.04,transmission:0.97}),rail:F("painted",SKY2,{rim:0.35}),ball:F("plastic",0xBFE0F7,{rim:0.4}),
    floor:F("painted",SKY2,{rim:0.3}),playfield:F("painted",0xE6ECF2,{rough:0.55,rim:0.25}),steel:F("metal",PAL.steel),steelD:F("metal",PAL.steelDark),copper:F("metal",PAL.copper),
    mint:F("plastic",PAL.mintPlastic),rubber:F("rubber",0x3C4557),pcb:F("painted",PAL.pcb),dark:F("plastic",0x2E3340),white:F("painted",0xFFFFFF,{rough:0.35}),
    blush:F("painted",0xF3B8C8,{rough:0.28}),butter:F("painted",0xF3D56E,{rough:0.28}),lime:F("painted",0xAFD873,{rough:0.28}),peach:F("painted",PAL.product.peach,{rough:0.28}),lavender:F("painted",0xD9CBF2,{rough:0.3}),
    steelBall:F("metal",0xDDE4EC,{rough:0.18}),display:F("plastic",0x1F2430,{emissive:0x2C3A55,emissiveIntensity:0.5,rim:0}),led:F("plastic",0xCFF3E6,{emissive:0x4FE3A0,emissiveIntensity:2.0,rim:0}),
    knob:F("painted",0xF3B8C8,{rough:0.3})};Mt.playfield.envMapIntensity=0.4;
  // the table group: X = table x, Y = height above the playfield, Z = −table y; then the whole table is tilted 6.5° so the back rises
  const root=new THREE.Group();root.scale.setScalar(S);scene.add(root);const table=new THREE.Group();table.rotation.x=TABLE.TILT*DEG;table.position.set(0,110,0);root.add(table);
  const V=(x,y,z)=>new THREE.Vector3(x,z,-y);
  const mesh=(geo,m,cast)=>{const g=new THREE.Mesh(geo,m);g.castShadow=cast!==false;g.receiveShadow=true;return g};
  const box=(w,d,h,m,x,y,z,cast)=>{const g=mesh(new THREE.BoxGeometry(w,h,d),m,cast);g.position.copy(V(x,y,z));table.add(g);return g};// w across x, d along y, h tall, centred at (x,y,z)
  const cyl=(r,h,m,x,y,z,seg)=>{const g=mesh(new THREE.CylinderGeometry(r,r,h,seg||20),m);g.position.copy(V(x,y,z));table.add(g);return g};// vertical post
  const rod=(a,b,r,m,seg)=>{const A=V(a[0],a[1],a[2]),B=V(b[0],b[1],b[2]);const L=A.distanceTo(B);const g=mesh(new THREE.CylinderGeometry(r,r,L,seg||10),m);g.position.copy(A).lerp(B,0.5);g.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),B.clone().sub(A).normalize());table.add(g);return g};
  const nodes={};const mark=(id,x,y,z)=>{nodes[id]={at:[x,y,z]}};PARTS.forEach(p=>mark(p.id,p.at[0],p.at[1],p.at[2]));
  // ---- cabinet: playfield, floor, acrylic walls, rails and corner balls, legs, backbox
  const W=TABLE.W,H=TABLE.TOP,WALL=12,CASE_H=105,DEPTH=70;
  box(W+2*WALL,H+2*WALL,6,Mt.playfield,W/2,H/2,-3);
  box(W+2*WALL,H+2*WALL,6,Mt.floor,W/2,H/2,-DEPTH+3);
  const pane=(w,h,x,y,z,ry)=>{const g=new THREE.Mesh(new THREE.PlaneGeometry(w,h),Mt.pane);g.position.copy(V(x,y,z));g.rotation.y=ry||0;g.renderOrder=20;g.castShadow=false;table.add(g);return g};
  const cz=(CASE_H-DEPTH)/2;pane(W+2*WALL,CASE_H+DEPTH,W/2,-WALL+1,cz,0);pane(W+2*WALL,CASE_H+DEPTH,W/2,H+WALL-1,cz,0);pane(H+2*WALL,CASE_H+DEPTH,-WALL+1,H/2,cz,Math.PI/2);pane(H+2*WALL,CASE_H+DEPTH,W+WALL-1,H/2,cz,Math.PI/2);
  {const top=new THREE.Mesh(new THREE.PlaneGeometry(W+2*WALL,H+2*WALL),Mt.top);top.rotation.x=-Math.PI/2;top.position.copy(V(W/2,H/2,CASE_H-1));top.renderOrder=20;top.castShadow=false;table.add(top)}
  {const x0=-WALL+8,x1=W+WALL-8,y0=-WALL+8,y1=H+WALL-8,z0=-DEPTH+8,z1=CASE_H-8;const RR=10;
    for(const x of [x0,x1])for(const y of [y0,y1])rod([x,y,z0],[x,y,z1],RR,Mt.rail,12);
    for(const z of [z0,z1]){for(const y of [y0,y1])rod([x0,y,z],[x1,y,z],RR,Mt.rail,12);for(const x of [x0,x1])rod([x,y0,z],[x,y1,z],RR,Mt.rail,12)}
    for(const x of [x0,x1])for(const y of [y0,y1])for(const z of [z0,z1]){const b=mesh(new THREE.SphereGeometry(15,16,12),Mt.rail);b.position.copy(V(x,y,z));table.add(b)}}
  // backbox: a sky acrylic block behind the table holding the scoreboard display
  box(W+2*WALL,50,150,F("glass",SKY,{opacity:0.6,transmission:0.7}),W/2,H+WALL+25,75,false).renderOrder=20;
  box(W+2*WALL,50,10,Mt.rail,W/2,H+WALL+25,5);box(W+2*WALL,50,10,Mt.rail,W/2,H+WALL+25,145);
  box(220,8,64,Mt.display,W/2,H+WALL+4,95);mark("backbox",W/2,H+WALL,95);
  // legs stand on the floor in world space (the back pair taller: that is what makes the tilt)
  {const legs=new THREE.Group();root.add(legs);const sinT=Math.sin(TABLE.TILT*DEG),cosT=Math.cos(TABLE.TILT*DEG);
    for(const [x,y] of [[30,30],[W-30,30],[30,H-30],[W-30,H-30]]){const top=110+(-DEPTH)*cosT+y*sinT;const g=mesh(new THREE.CylinderGeometry(9,9,top,12),Mt.steelD);g.position.set(x,top/2,-y*cosT);legs.add(g)}}
  // ---- the works
  // playfield rails: lane wall, guides, ramp rails, arch (a steel wire), posts with rubber rings
  const rail=(a,b,h)=>{const dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy);const g=mesh(new THREE.BoxGeometry(L,h||18,3),Mt.steel);g.position.copy(V((a[0]+b[0])/2,(a[1]+b[1])/2,(h||18)/2));g.rotation.y=Math.atan2(dy,dx);table.add(g);return g};
  rail([TABLE.LANE_X,0],[TABLE.LANE_X,TABLE.STRAIGHT],28);
  for(const side of ["L","R"]){const G=TABLE.GUIDES[side];for(let i=0;i<G.length-1;i++)rail(G[i],G[i+1]);mark("guide"+side,G[1][0],G[1][1],10)}
  rail([TABLE.RAMP.x1,TABLE.RAMP.y0],[TABLE.RAMP.x1,TABLE.RAMP.y1],22);rail([TABLE.RAMP.x0,TABLE.RAMP.y0],[TABLE.RAMP.x0,TABLE.RAMP.top],22);rail([TABLE.RAMP.x0,TABLE.RAMP.top],[TABLE.RAMP.x1,TABLE.RAMP.top],22);
  {const A=TABLE.ARCH;const pts=[];for(let i=0;i<=48;i++){const a=Math.PI-Math.PI*i/48;pts.push(V(A.cx+A.r*Math.cos(a),A.cy+A.r*Math.sin(a),13))}const g=mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),96,3,8,false),Mt.steel);table.add(g);
    const pts2=pts.map(p=>p.clone().setY(4));table.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts2),96,3,8,false),Mt.steel))}
  {const d=rail(TABLE.DEFLECTOR[0],TABLE.DEFLECTOR[1],20);d.material=Mt.rubber}
  for(const c of COL.circ)if(c.kind==="post"){cyl(c.r-1,24,Mt.steel,c.c[0],c.c[1],12,12);const t=mesh(new THREE.TorusGeometry(c.r-1,2.2,8,20),Mt.rubber);t.rotation.x=Math.PI/2;t.position.copy(V(c.c[0],c.c[1],12));table.add(t)}
  // slingshots: mint prisms with a peach cap and the kicker rubber on the active face
  for(const side of ["L","R"]){const Sg=TABLE.SLINGS[side];const sh=new THREE.Shape();sh.moveTo(Sg[0][0],Sg[0][1]);sh.lineTo(Sg[1][0],Sg[1][1]);sh.lineTo(Sg[2][0],Sg[2][1]);sh.closePath();// (x, y_table): after rotation.x = −90° the shape's y becomes −Z, which is table y
    const g=mesh(new THREE.ExtrudeGeometry(sh,{depth:18,bevelEnabled:false}),Mt.mint);g.rotation.x=-Math.PI/2;g.position.y=0;table.add(g);
    const cap=mesh(new THREE.ExtrudeGeometry(sh,{depth:4,bevelEnabled:false}),Mt.peach);cap.rotation.x=-Math.PI/2;cap.position.y=18;cap.scale.set(0.8,0.8,1);const cx=(Sg[0][0]+Sg[1][0]+Sg[2][0])/3,cy=(Sg[0][1]+Sg[1][1]+Sg[2][1])/3;cap.position.x=cx*0.2;cap.position.z=-cy*0.2;table.add(cap);
    const band=rail(Sg[1],Sg[2],8);band.material=Mt.rubber;band.position.y=10;mark("sling"+side,(Sg[1][0]+Sg[2][0])/2,(Sg[1][1]+Sg[2][1])/2,12)}
  // pop bumpers: ring, skirt, body, a painted cap on a coil; the cap flashes when hit
  const bumperCaps={};
  for(const b of TABLE.BUMPERS){const [x,y]=b.c;cyl(36,5,Mt.mint,x,y,2.5,28);const sk=mesh(new THREE.CylinderGeometry(22,31,9,28),Mt.white);sk.position.copy(V(x,y,9.5));table.add(sk);
    cyl(20,22,Mt.steel,x,y,25,20);const coil=mesh(new THREE.TorusGeometry(26,5,10,28),Mt.copper);coil.rotation.x=Math.PI/2;coil.position.copy(V(x,y,36));table.add(coil);
    const capM=F("painted",{blush:PAL.product.strawberry,butter:PAL.product.butter,lime:PAL.product.lime}[b.cap],{rough:0.28,emissive:0xFFFFFF,emissiveIntensity:0});const cap=mesh(new THREE.CylinderGeometry(32,30,11,32),capM);cap.position.copy(V(x,y,45));table.add(cap);
    const btn=mesh(new THREE.CylinderGeometry(9,9,3,20),Mt.white);btn.position.copy(V(x,y,52));table.add(btn);bumperCaps[b.id]=capM}
  // flippers: a mint bat on a steel pivot pin, with its solenoid and link under the playfield
  const flippers={};
  for(const side of ["L","R"]){const P=TABLE.FLIP[side].pivot;const g=new THREE.Group();g.position.copy(V(P[0],P[1],0));table.add(g);
    const bat=new THREE.Group();g.add(bat);const len=TABLE.FLIP.len;
    const body=mesh(new THREE.BoxGeometry(len,12,15),Mt.mint);body.position.set(len/2,8,0);bat.add(body);
    const e0=mesh(new THREE.CylinderGeometry(8,8,12,16),Mt.mint);e0.position.set(0,8,0);bat.add(e0);const e1=mesh(new THREE.CylinderGeometry(7.5,7.5,12,16),Mt.mint);e1.position.set(len,8,0);bat.add(e1);
    const rub=mesh(new THREE.BoxGeometry(len,6,17),Mt.rubber);rub.position.set(len/2,8,0);bat.add(rub);
    const pin=mesh(new THREE.CylinderGeometry(3,3,24,10),Mt.steelD);pin.position.set(0,6,0);g.add(pin);
    cyl(12,42,Mt.copper,P[0],P[1]+10,-36,16);cyl(5,30,Mt.steel,P[0],P[1]+10,-8,10);rod([P[0]+(side==="L"?-16:16),P[1]+10,-16],[P[0],P[1]+10,-16],3,Mt.steel);
    flippers[side]=bat;mark("flip"+side,P[0],P[1],8);mark("sol"+side,P[0],P[1]+10,-36)}
  // plunger: knob outside the front wall, rod through the wall, a helical spring that compresses, a tip plate
  const PL=TABLE.PLUNGER;const plunger=new THREE.Group();table.add(plunger);
  {const rodM=mesh(new THREE.CylinderGeometry(4.5,4.5,150,12),Mt.steel);rodM.rotation.x=Math.PI/2;rodM.position.copy(V(PL.x,PL.restY-75,R));plunger.add(rodM);
    const knob=mesh(new THREE.SphereGeometry(13,18,14),Mt.knob);knob.position.copy(V(PL.x,PL.restY-150,R));plunger.add(knob);
    const tip=mesh(new THREE.CylinderGeometry(11,11,4,16),Mt.steelD);tip.rotation.x=Math.PI/2;tip.position.copy(V(PL.x,PL.restY-2,R));plunger.add(tip);
    cyl(14,8,Mt.mint,PL.x,-WALL+4,R,16).rotation.x=Math.PI/2;cyl(9,30,Mt.steelD,PL.x,-WALL+15,R,16).rotation.x=Math.PI/2}
  class Helix extends THREE.Curve{constructor(r,pitch,turns){super();this.r=r;this.pitch=pitch;this.turns=turns}getPoint(t,o){o=o||new THREE.Vector3();const a=t*this.turns*2*Math.PI;return o.set(Math.cos(a)*this.r,Math.sin(a)*this.r,t*this.turns*this.pitch)}}
  const SPRING_L=70;const spring=mesh(new THREE.TubeGeometry(new Helix(9,SPRING_L/9,9),120,1.6,6,false),Mt.steel);spring.rotation.x=0;table.add(spring);
  // wire ramp: two steel wires over the hump with cross ties, a mint entry flap, the lock cup and its kicker, one soft LED
  {const Rm=TABLE.RAMP,L=Rm.y1-Rm.y0;const curve=off=>{const pts=[];for(let i=0;i<=24;i++){const s=L*i/24;pts.push(V(Rm.x+off,Rm.y0+s,R-9+Rm.H*Math.sin(Math.PI*s/L)))}return new THREE.CatmullRomCurve3(pts)};
    for(const off of [-10,10])table.add(mesh(new THREE.TubeGeometry(curve(off),48,2.2,8,false),Mt.steel));
    for(let i=1;i<6;i++){const s=L*i/6,z=R-9+Rm.H*Math.sin(Math.PI*s/L);rod([Rm.x-10,Rm.y0+s,z],[Rm.x+10,Rm.y0+s,z],1.6,Mt.steel,6)}
    rod([Rm.x-10,Rm.y0+L/2,0],[Rm.x-10,Rm.y0+L/2,R-9+Rm.H],2,Mt.steel,6);rod([Rm.x+10,Rm.y0+L/2,0],[Rm.x+10,Rm.y0+L/2,R-9+Rm.H],2,Mt.steel,6);
    box(40,10,3,Mt.mint,Rm.x,Rm.y0-4,1.5);
    const Lk=TABLE.LOCK;const cup=mesh(new THREE.TorusGeometry(17,4,10,28,Math.PI*1.3),Mt.mint);cup.rotation.x=Math.PI/2;cup.rotation.z=28*DEG;cup.position.copy(V(Lk.c[0],Lk.c[1],4));table.add(cup);
    cyl(16,2,Mt.steelD,Lk.c[0],Lk.c[1],1,24);cyl(10,36,Mt.copper,Lk.c[0]-14,Lk.c[1]-6,-30,14);
    const led=mesh(new THREE.SphereGeometry(4,12,10),Mt.led);led.castShadow=false;led.position.copy(V(128,480,6));table.add(led);cyl(5,4,Mt.dark,128,480,2,12)}
  // rollovers: a wire loop and a lavender insert each, lit when the ball passes
  const inserts=[];
  for(const x of TABLE.ROLLOVERS.xs){const t=mesh(new THREE.TorusGeometry(7,1.2,6,16),Mt.steel);t.rotation.x=Math.PI/2;t.position.copy(V(x,TABLE.ROLLOVERS.y,2));table.add(t);
    const m=F("painted",0xD9CBF2,{rough:0.3,emissive:0xB69BFF,emissiveIntensity:0});const d=mesh(new THREE.CylinderGeometry(11,11,1.2,20),m,false);d.position.copy(V(x,TABLE.ROLLOVERS.y,0.6));table.add(d);inserts.push(m)}
  // standup target: a lime face on a steel bracket
  const Tg=TABLE.TARGET;const targetM=F("painted",PAL.product.lime,{rough:0.28,emissive:0xFFFFFF,emissiveIntensity:0});
  {const g=mesh(new THREE.BoxGeometry(Tg.x1-Tg.x0,26,4),targetM);g.position.copy(V((Tg.x0+Tg.x1)/2,Tg.y+2,13));table.add(g);box(Tg.x1-Tg.x0+6,4,6,Mt.steelD,(Tg.x0+Tg.x1)/2,Tg.y+Tg.d+1,3)}
  // one-way gate: a wire that swings up for a ball on its way in
  const gate=new THREE.Group();gate.position.copy(V(TABLE.GATE.x0,TABLE.GATE.y0,22));table.add(gate);
  {const gl=Math.hypot(TABLE.GATE.x1-TABLE.GATE.x0,TABLE.GATE.y1-TABLE.GATE.y0);const w=mesh(new THREE.CylinderGeometry(1.6,1.6,gl,8),Mt.steel);w.rotation.z=Math.PI/2;w.position.set(gl/2,-10,0);gate.add(w);gate.rotation.y=-Math.atan2(TABLE.GATE.y1-TABLE.GATE.y0,TABLE.GATE.x1-TABLE.GATE.x0);const h=mesh(new THREE.CylinderGeometry(3,3,8,8),Mt.steelD);h.rotation.z=Math.PI/2;h.position.set(2,0,0);gate.add(h)}
  // drain: the outhole and the ball trough under the playfield
  box(80,22,8,Mt.dark,240,0,-4,false);box(280,22,14,Mt.steelD,370,-2,-26,false);mark("drain",240,-6,0);
  // circuit board under the front-left of the playfield, with chips, a connector and a harness to the solenoid
  {box(150,90,2,Mt.pcb,105,70,-52);for(const [x,y,w,d] of [[70,60,24,24],[118,50,18,12],[140,84,20,20],[80,98,30,8]])box(w,d,5,Mt.dark,x,y,-48.5);box(10,40,8,Mt.white,172,70,-47);
    rod([172,90,-46],[165,92,-50],2,Mt.copper,6);rod([172,60,-46],[300,80,-52],2,Mt.copper,6);rod([300,80,-52],[315,92,-50],2,Mt.copper,6)}
  // the ball
  const ball=mesh(new THREE.SphereGeometry(R,28,20),Mt.steelBall);table.add(ball);
  // ---- camera and orbit
  const target=new THREE.Vector3(0.26,0.10,-0.42);const orb={az:-0.42,pol:1.0,dist:2.75};
  const VIEWS={look:[-0.42,1.0,2.75],play:[0,0.5,2.35],above:[0,0.12,2.2],side:[1.3,1.05,2.6],back:[2.6,0.95,2.6]};
  let dirty=true,drag=null;
  function view(n){const v=VIEWS[n]||VIEWS.look;orb.az=v[0];orb.pol=v[1];orb.dist=v[2];dirty=true}
  function applyCam(){orb.pol=Math.max(0.08,Math.min(1.45,orb.pol));orb.dist=Math.max(0.6,Math.min(5,orb.dist));
    camera.position.set(target.x+orb.dist*Math.sin(orb.pol)*Math.sin(orb.az),target.y+orb.dist*Math.cos(orb.pol),target.z+orb.dist*Math.sin(orb.pol)*Math.cos(orb.az));camera.lookAt(target)}
  canvas.addEventListener("pointerdown",e=>{if(e.target!==canvas)return;drag={x:e.clientX,y:e.clientY,moved:false};canvas.setPointerCapture(e.pointerId)});
  canvas.addEventListener("pointermove",e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>3)drag.moved=true;orb.az-=dx*0.008;orb.pol-=dy*0.006;drag={x:e.clientX,y:e.clientY,moved:drag.moved};dirty=true});
  canvas.addEventListener("pointerup",()=>{drag=null});canvas.addEventListener("pointercancel",()=>{drag=null});
  canvas.addEventListener("wheel",e=>{e.preventDefault();orb.dist*=1+Math.sign(e.deltaY)*0.08;dirty=true},{passive:false});
  canvas.addEventListener("keydown",e=>{const k=e.key;if(k==="ArrowLeft")orb.az+=0.12;else if(k==="ArrowRight")orb.az-=0.12;else if(k==="ArrowUp")orb.pol-=0.08;else if(k==="ArrowDown")orb.pol+=0.08;else if(k==="+"||k==="=")orb.dist*=0.9;else if(k==="-"||k==="_")orb.dist*=1.1;else if(k==="Home")view("look");else return;e.preventDefault();dirty=true});
  // ---- pose from the sim
  const tmpV=new THREE.Vector3();
  function pose(sim){const b=sim.ball;ball.visible=b.mode!=="none"&&b.mode!=="drained";ball.position.copy(V(b.x,b.y,R+(b.h||0)));
    for(const side of ["L","R"])flippers[side].rotation.y=sim.flip[side].a;
    const px=b.mode==="lane"||b.mode==="stroke"?(b.mode==="lane"?sim.plunger.x:TABLE.PLUNGER.restY+R-b.y):0;plunger.position.copy(V(0,-px,0));
    // the spring: a helix along the table's y, from the wall boss to the tip plate, squashed by the compression
    spring.scale.set(1,1,(SPRING_L-px)/SPRING_L);spring.position.copy(V(PL.x,PL.restY-px-2,R));
    for(const bm of TABLE.BUMPERS)bumperCaps[bm.id].emissiveIntensity=sim.flash[bm.id]?Math.min(1,sim.flash[bm.id]*3):0;
    inserts.forEach((m,i)=>{m.emissiveIntensity=sim.flash["ro"+i]?Math.min(1,sim.flash["ro"+i]*1.6):(sim.lit.has(i)?0.25:0)});
    targetM.emissiveIntensity=sim.flash.target?Math.min(1,sim.flash.target*2.5):0;
    gate.rotation.x=(b.mode==="free"&&b.x>TABLE.GATE.x0&&Math.abs(b.y-TABLE.GATE.y0)<34&&b.vy>0)?-0.9:0;
    dirty=true}
  // ---- loop
  let raf=0,last=performance.now(),frames=[],gaps=[],lastRender=0,onFrame=opts.onFrame;
  function resize(){const w=canvas.clientWidth||600,h=canvas.clientHeight||400;const pr=renderer.getPixelRatio();if(canvas.width!==Math.round(w*pr)||canvas.height!==Math.round(h*pr)){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();dirty=true}}
  function frame(now){raf=requestAnimationFrame(frame);last=now;resize();
    if(dirty){applyCam();const t0=performance.now();renderer.render(scene,camera);const ms=performance.now()-t0;frames.push(ms);if(frames.length>240)frames.shift();
      if(lastRender&&t0-lastRender<500){gaps.push(t0-lastRender);if(gaps.length>240)gaps.shift()}lastRender=t0;dirty=false;onFrame&&onFrame(ms)}}
  raf=requestAnimationFrame(frame);
  // ---- projection helpers for the overlay: table coords (x, y, z) → canvas pixels
  const pv=new THREE.Vector3();
  function project(x,y,z){const w=canvas.clientWidth,h=canvas.clientHeight;pv.set(x,z||0,-y);table.updateMatrixWorld();pv.applyMatrix4(table.matrixWorld);pv.project(camera);return {x:(pv.x+1)/2*w,y:(1-pv.y)/2*h,visible:pv.z<1}}
  function partCentre(id){const n=nodes[id];return n?n.at.slice():null}
  function labels(list){return list.map(([id,text])=>{const n=nodes[id];if(!n)return null;const q=project(n.at[0],n.at[1],n.at[2]);return {id,text,x:q.x,y:q.y,visible:q.visible}}).filter(Boolean)}
  function stats(){const a=frames.slice().sort((x,y)=>x-y),gq=gaps.slice().sort((x,y)=>x-y);const med=a.length?a[Math.floor(a.length/2)]:0;const p95=a.length?a[Math.floor(a.length*0.95)]:0;const gmed=gq.length?gq[Math.floor(gq.length/2)]:0;
    return {frames:a.length,cpuMedianMs:+med.toFixed(2),cpuP95Ms:+p95.toFixed(2),frameIntervalMedianMs:+gmed.toFixed(1),triangles:renderer.info.render.triangles,calls:renderer.info.render.calls}}
  function dispose(){cancelAnimationFrame(raf);renderer.dispose()}
  applyCam();
  return {renderer,scene,camera,nodes,pose,view,views:Object.keys(VIEWS),stats,dispose,redraw:()=>{dirty=true},orbit:orb,labels,project,partCentre,dragging:()=>!!(drag&&drag.moved),
    snapshot:()=>{applyCam();renderer.render(scene,camera);return canvas.toDataURL("image/jpeg",0.86)}}}
return {TABLE,PARTS,byId,COL,Sim,create,GE,GP,version:"1.0"}});
