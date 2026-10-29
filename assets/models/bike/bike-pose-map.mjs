/** Geometry mapping only. Input anchors and rider points already come from the existing lesson.
 * No geoPts, IK, travel integration, physics, clock, RNG or challenge state here.
 * All input/output coordinates are metres, +Y up, +X forward, +Z near side.
 */
const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),mul=(a,t)=>a.map(v=>v*t),len=a=>Math.hypot(...a),mix=(a,b,t)=>add(a,mul(sub(b,a),t));
export function mapBikePose({anchors:P,rider:R,configuration:C,wheelAngle=0,riderVisible=false,guard=false,pod=false,tagAngle=0,heatFraction=0}){
 const bones={},points={},u=C.forkAxis,off=(n,z=0)=>add(P[n],[0,0,z]);const bone=(n,a,b)=>bones[n]={a,b};
 // 65 mm construction clearance above the schematic HB anchor, not extra suspension travel.
 const crown=add(P.HB,mul(u,.065)),headtop=add(P.HT,mul(u,.01));
 bone('FRAME_DOWN',crown,P.BB);bone('FRAME_TOP',add(P.HT,mul(u,-.0225)),P.TT);bone('FRAME_SEAT',P.BB,P.ST);bone('FRAME_HEAD',crown,headtop);
 for(const [side,z]of[['L',.060],['R',-.060]]){bone('REAR_STAY_'+side,add(P.MP,[0,0,z*.4]),add(P.RA,[0,0,z]));bone('SEAT_STAY_'+side,add(P.RA,[0,0,z]),add(P.RK,[0,0,z*.3]));}
 bone('ROCKER',P.RK,P.RP);bone('ROCKER_LINK',P.RP,P.MP);bone('SEAT_POST',P.ST,P.SEAT);
 const fl=C.forkLength,seal=add(P.FA,mul(u,fl*.53));
 for(const [side,z]of[['L',.073],['R',-.073]]){bone('FORK_LOWER_'+side,add(P.FA,[0,0,z]),add(seal,[0,0,z]));bone('STANCHION_'+side,add(seal,[0,0,z]),add(C.dual?add(P.UC,mul(u,.065)):crown,[0,0,z]));}
 points.CROWN_LOWER=crown;points.CROWN_UPPER=add(P.UC,mul(u,.065));points.FORK_ARCH=P.FA;
 bone('STEM',P.HT,P.CL);points.BAR=P.CL;points.SADDLE=add(P.SEAT,[.015,.018,0]);
 points.CRANK=P.BB;points.PEDAL_L=off('PF',.12);points.PEDAL_R=off('PR',-.12);
 const shdir=sub(P.SH1,P.SH0),L=len(shdir),sn=mul(shdir,1/L);
 bone('SHOCK_BODY',P.SH0,mix(P.SH0,P.SH1,.58));bone('SHOCK_SHAFT',P.SH0,P.SH1);bone('SHOCK_COIL',mix(P.SH0,P.SH1,.18),mix(P.SH0,P.SH1,.82));bone('SHOCK_AIR_CAN',P.SH0,mix(P.SH0,P.SH1,.58));
 points.SHOCK_EYE_0=P.SH0;points.SHOCK_EYE_1=P.SH1;
 points.WHEEL_REAR_PIVOT=P.RA;points.WHEEL_FRONT_PIVOT=P.FA;points.CASSETTE=off('RA',-.095);
 // Closed chain loop, coasting crank: no cadence or torque state is introduced.
 // CHAIN_FRONT endpoints bound the curved front wrap, never a rendered diameter.
 const cr=.094,rr=.065,z=-.108,A=add(P.BB,[0,cr,z]),B=add(P.RA,[0,rr,z]),D=add(P.RA,[.035,-.115,z]),E=add(P.BB,[0,-cr,z]);
 bone('CHAIN_TOP',A,B);bone('CHAIN_REAR',B,D);bone('CHAIN_BOTTOM',D,E);bone('CHAIN_FRONT',E,A);points.DERAILLEUR=D;
 for(const [end,a]of[['REAR',P.RA],['FRONT',P.FA]])points['CALIPER_'+end]=add(a,[-C.rotorRadius*.55,C.rotorRadius*.80,.083]);
 points.MUDGUARD=add(P.FA,[.10,.435,0]);points.LIGHT_POD=add(P.CL,[.04,.055,0]);points.NUMBER_PLATE=add(P.CL,[.07,-.055,0]);points.TAG_SURFACE=add(P.SEAT,[-.085,-.055,.06]);
 const gr=P.GR,handL=add(gr,[0,0,C.barWidth/2-.06]),handR=add(gr,[0,0,-C.barWidth/2+.06]);
 points.GRIP_L=add(gr,[0,0,C.barWidth/2-.055]);points.GRIP_R=add(gr,[0,0,-C.barWidth/2+.055]);
 bone('BRAKE_LINE_FRONT',handL,points.CALIPER_FRONT);bone('BRAKE_LINE_REAR',handR,add(P.HT,[0,0,.09]));bone('BRAKE_REAR_TOP',add(P.HT,[0,0,.09]),add(P.TT,[0,0,.09]));bone('BRAKE_REAR_STAY',add(P.TT,[0,0,.09]),points.CALIPER_REAR);
 if(R){const hip=R.hip,sh=R.sh,hd=add(R.head,[.02,.02,0]);bone('RIDER_TORSO',hip,sh);bone('RIDER_NECK',sh,hd);points.RIDER_HIP=hip;points.RIDER_HEAD=hd;
  for(const [side,z,k,f,el,hand]of[['L',.12,R.kF,R.fF,R.el,handL],['R',-.12,R.kR,R.fR,R.elR,handR]]){
   const knee=add(k,[0,0,z]),foot=add(f,[0,0,z]),elbow=add(el,[0,0,z>0?.17:-.17]);bone('RIDER_THIGH_'+side,add(hip,[0,0,z]),knee);bone('RIDER_SHIN_'+side,knee,foot);bone('RIDER_UPPER_ARM_'+side,add(sh,[0,0,z>0?.16:-.16]),elbow);bone('RIDER_FOREARM_'+side,elbow,hand);points['RIDER_KNEE_'+side]=knee;points['RIDER_HAND_'+side]=hand;
   // Shoe sole sits on pedal top; source fF/fR are 30 mm above pedal anchor.
   points['RIDER_SHOE_'+side]=add(foot,[.02,.0005,0]);
  }
 }
 return {bones,points,anchors:P,configuration:C,wheelAngle,riderVisible,guard,pod,tagAngle,heatFraction};
}
