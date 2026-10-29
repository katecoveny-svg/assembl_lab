/** Assembl claw v2 pose adapter. Requires the consumer's existing THREE module.
 * No RNG, outcome selection, simulation clock, scoring, UI or network access.
 * Metres. x: cabinet left/right. depth: positive toward the cabinet rear.
 * The GLB is Y-up; semantic depth maps to -Z. A drop is positive downward.
 */
export function createClawRig(model, THREE) {
  const names=['CLAW_MACHINE','GANTRY_X','GANTRY_Y','CLAW_HOIST','HOIST_CABLE','HOIST_CORD','ACTUATOR_SLIDER','HELD_CAPSULE','JOYSTICK_PIVOT','DROP_BUTTON','RETRIEVAL_FLAP','CHUTE_TARGET','PICKUP_TARGET'];
  for(let k=0;k<3;k++)names.push(`FINGER_${k}_SHOULDER`,`FINGER_${k}_TIP`,`FINGER_${k}_LINK_INNER`,`FINGER_${k}_LINK_OUTER`,`FINGER_${k}_LINKAGE`);
  const nodes=Object.fromEntries(names.map(name=>{
    const node=model.getObjectByName(name);if(!node)throw new Error(`Missing claw v2 node: ${name}`);return [name,node];
  }));
  const rest=Object.fromEntries(names.map(n=>[n,{position:nodes[n].position.clone(),quaternion:nodes[n].quaternion.clone(),scale:nodes[n].scale.clone()}]));
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const axisX=new THREE.Vector3(1,0,0), up=new THREE.Vector3(0,1,0), q=new THREE.Quaternion();
  const a=new THREE.Vector3(),b=new THREE.Vector3(),direction=new THREE.Vector3();
  function setPose({x=.125,depth=-.035,drop=0,open=0,holdPrize=true,joystickX=0,joystickZ=0,button=0,flap=0}={}){
    x=clamp(x,-.35,.33);depth=clamp(depth,-.27,.24);drop=clamp(drop,0,.30);
    // At the front chute the jaw opening is limited to preserve pane clearance.
    const maxOpen=depth>=-.23?1:1-((-.23-depth)/.04)*.45;
    open=clamp(open,0,maxOpen);
    nodes.GANTRY_X.position.x=x;
    nodes.GANTRY_Y.position.z=-depth;
    nodes.CLAW_HOIST.position.y=rest.CLAW_HOIST.position.y-drop;
    nodes.HOIST_CABLE.scale.y=rest.HOIST_CABLE.scale.y*(.257+drop)/.257;
    nodes.HOIST_CORD.scale.y=rest.HOIST_CORD.scale.y*(.230+drop)/.230;
    nodes.ACTUATOR_SLIDER.position.y=rest.ACTUATOR_SLIDER.position.y+.006*open;
    nodes.HELD_CAPSULE.visible=!!holdPrize;
    for(let k=0;k<3;k++){
      const n=`FINGER_${k}_SHOULDER`;
      nodes[n].quaternion.copy(rest[n].quaternion).multiply(q.setFromAxisAngle(axisX,-.4*open));
    }
    nodes.JOYSTICK_PIVOT.quaternion.copy(rest.JOYSTICK_PIVOT.quaternion).multiply(q.setFromEuler(new THREE.Euler(clamp(joystickX,-.17,.17),0,clamp(joystickZ,-.17,.17))));
    nodes.DROP_BUTTON.position.y=rest.DROP_BUTTON.position.y-.004*clamp(button,0,1);
    nodes.RETRIEVAL_FLAP.quaternion.copy(rest.RETRIEVAL_FLAP.quaternion).multiply(q.setFromAxisAngle(axisX,clamp(flap,0,.7)));
    model.updateMatrixWorld(true);
    for(let k=0;k<3;k++){
      const link=nodes[`FINGER_${k}_LINKAGE`],parent=link.parent;
      nodes[`FINGER_${k}_LINK_INNER`].getWorldPosition(a);nodes[`FINGER_${k}_LINK_OUTER`].getWorldPosition(b);
      parent.worldToLocal(a);parent.worldToLocal(b);
      link.position.copy(a).add(b).multiplyScalar(.5);
      direction.copy(b).sub(a);const length=direction.length();
      link.quaternion.setFromUnitVectors(up,direction.normalize());
      link.scale.y=length/link.userData.rest_length_m;
    }
    model.updateMatrixWorld(true);
    return {x,depth,drop,open,holdPrize:!!holdPrize};
  }
  function targetWorld(name,out=new THREE.Vector3()){
    if(!['CHUTE_TARGET','PICKUP_TARGET'].includes(name))throw new Error('Unknown target');
    model.updateMatrixWorld(true);return nodes[name].getWorldPosition(out);
  }
  function spawnReleasedPrize(parent){
    model.updateMatrixWorld(true);
    const prize=nodes.HELD_CAPSULE.clone(true);prize.name='RELEASED_CAPSULE';prize.visible=true;
    nodes.HELD_CAPSULE.parent.add(prize);prize.updateMatrixWorld(true);parent.attach(prize);
    prize.userData.sharedAssetResources=true;
    return prize; // Caller owns removal/visibility/outcome. Meshes share asset resources: do not dispose those until the whole asset is released.
  }
  return {nodes,rest,setPose,targetWorld,spawnReleasedPrize};
}
