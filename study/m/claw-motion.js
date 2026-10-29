import {createClawRig} from '../../assets/models/claw/claw-rig-controller.mjs';

// A visual timeline of a result already sampled by claw.js. No probabilities,
// RNG or force model live here. All movement stays inside the artist's rig limits.
export function createClawMotion(model,THREE){
  const rig=createClawRig(model,THREE);
  const loose=rig.spawnReleasedPrize(model);loose.name='LESSON_CAPSULE';
  const pickup=rig.targetWorld('PICKUP_TARGET');
  const restQuaternion=loose.quaternion.clone(),restScale=loose.scale.clone();
  const startX=.125,startDepth=-.035,endX=-.32,endDepth=-.27;
  const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x)},mix=(a,b,t)=>a+(b-a)*t;
  let pose=null,key='';
  function positionLoose(world){loose.position.copy(model.worldToLocal(world.clone()));loose.quaternion.copy(restQuaternion);loose.scale.copy(restScale)}
  function update(s,reduced=false){
    const a=reduced?null:s.anim,k=a?clamp(a.t):null;
    const nextKey=[k,a?.grab,a?.win,s.plays,s.lastWin].join('|');if(key===nextKey)return;key=nextKey;
    let x=startX,depth=startDepth,drop=0,open=1,held=false;
    loose.visible=true;positionLoose(pickup);
    if(a){
      if(k<.25)drop=.23*ease(k/.25);
      else if(k<.35){drop=.23;open=1-ease((k-.25)/.1)}
      else if(k<.6){drop=.23*(1-ease((k-.35)/.25));open=0;held=a.grab;}
      else if(k<.85){const u=ease((k-.6)/.25);x=mix(startX,endX,u);depth=mix(startDepth,endDepth,u);open=0;held=a.grab&&(a.win||k<.7);}
      else{x=endX;depth=endDepth;open=ease((k-.85)/.1);held=false;}
    }else if(s.lastWin&&s.plays){positionLoose(new THREE.Vector3(-.17,.31,.57));}
    pose=rig.setPose({x,depth,drop,open,holdPrize:held,button:a&&k<.06?1:0,joystickZ:a&&k>=.6&&k<.85?.14:0,flap:s.lastWin&&(!a||k>.98)?.3:0});
    if(held)loose.visible=false;
    if(a?.grab&&!a.win&&k>=.7){
      // A dropped prize returns to the bed. This is an illustrative path, not a
      // collision or gravitational acceleration calculation.
      const u=ease((k-.7)/.17),x7=mix(startX,endX,ease(.4)),z7=-mix(startDepth,endDepth,ease(.4));
      positionLoose(new THREE.Vector3(x7,mix(1.25,pickup.y,u),z7));
    }
    if(a?.win&&k>=.85){
      const u=ease((k-.85)/.12);positionLoose(new THREE.Vector3(endX,mix(1.25,.91,u),-endDepth));
      if(k>=.97)positionLoose(new THREE.Vector3(-.17,.31,.57));
    }
    model.updateMatrixWorld(true);
  }
  function inspect(){return {pose,held:rig.nodes.HELD_CAPSULE.visible,loose:loose.visible,loosePosition:loose.getWorldPosition(new THREE.Vector3()).toArray(),hoist:rig.nodes.CLAW_HOIST.getWorldPosition(new THREE.Vector3()).toArray(),linkLengths:[0,1,2].map(k=>rig.nodes[`FINGER_${k}_LINKAGE`].scale.y*rig.nodes[`FINGER_${k}_LINKAGE`].userData.rest_length_m)}}
  return {update,inspect};
}
