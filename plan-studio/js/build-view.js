// Inspection pass only. One renderer, the original model, an orthographic camera
// and a sheet quad. All visibility/material state is restored before returning.
import * as T from "three";
import { BEATS, depthOf, fromPdf } from "./build-sequence.js";
import { folioBoard, exhibitionBackdrop } from "./folio-material.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export function buildView(stage, source) {
  const model = stage.model, P = stage.P, renderer = stage.renderer, scene = stage.scene;
  const box = new T.Box3().setFromObject(model), centre = box.getCenter(new T.Vector3());
  centre.y = 0;
  const extent = box.getSize(new T.Vector3());
  const camera = new T.OrthographicCamera(-1, 1, 1, -1, .01, 10000);
  const warm = (color) => new T.MeshStandardMaterial({color, roughness:.9});
  const plaster = warm("#e3d0d2"), timber = warm("#aa858b"), wallInk = warm("#654a4e"), sill = warm("#b49ea4");
  const crossMaterial = [null,plaster,wallInk,sill];
  const buildMaterial = [null,plaster,timber,sill,wallInk];
  const base = new T.Mesh(new T.PlaneGeometry(1,1),folioBoard());
  base.rotation.x=-Math.PI/2;base.position.copy(centre);base.position.y=-Math.max(.3,-box.min.y+.025);
  base.scale.setScalar((Math.max(16,extent.x,extent.z)*12));base.visible=false;scene.add(base);
  const original = [], ground = scene.children.filter(o => o.isMesh && o!==base);
  const lights = scene.children.filter(o=>o.isLight);
  const plate = new T.Group(); const long = Math.max(extent.x,extent.z,1);
  const plinthWidth=extent.x+long*.105, plinthDepth=extent.z+long*.105, plinthTop=box.min.y-.018;
  plate.position.set(centre.x,plinthTop,centre.z);
  const rx=Math.max(.012,long*.004);
  const top=new T.Mesh(new RoundedBoxGeometry(plinthWidth,rx*3,plinthDepth,2,rx),warm("#c6a9a8"));
  top.position.y=-rx*1.5;top.castShadow=top.receiveShadow=true;plate.add(top);
  const foot=new T.Mesh(new RoundedBoxGeometry(plinthWidth-.075*long,rx*7,plinthDepth-.075*long,2,rx),warm("#664c58"));
  foot.position.y=-rx*6.5;foot.castShadow=foot.receiveShadow=true;plate.add(foot);
  const groundPlate = new T.Mesh(new T.PlaneGeometry(long*20,long*20),exhibitionBackdrop(centre.x,centre.z,long*.85));
  groundPlate.rotation.x=-Math.PI/2;groundPlate.position.set(0,-rx*10.2,0);plate.add(groundPlate);
  const cast=new T.Mesh(new T.PlaneGeometry(long*5,long*5),new T.ShadowMaterial({color:"#271f26",opacity:.42}));
  cast.rotation.x=-Math.PI/2;cast.position.y=-rx*10.18;cast.receiveShadow=true;plate.add(cast);
  plate.visible=false;scene.add(plate);
  const floorDisplay=stage.S.material("deck-timber").clone();
  // Scale the existing approved grain as a repeat texture, not a new asset or a change to the editable finish.
  if(floorDisplay.map){floorDisplay.map=floorDisplay.map.clone();floorDisplay.map.repeat.set(Math.max(1,extent.x/2.8),Math.max(1,extent.z/2.8));floorDisplay.map.needsUpdate=true;}
  floorDisplay.color.set("#e1c49d");floorDisplay.roughness=.82;floorDisplay.metalness=0;
  const plasterDisplay=warm("#ede4d4");
  const key=new T.DirectionalLight("#fff0dd",2.8);
  key.position.set(centre.x-long*.46,long*.91,centre.z+long*.43);key.target.position.copy(centre);
  key.castShadow=true;key.shadow.mapSize.set(1536,1536);key.shadow.bias=-.00015;key.shadow.normalBias=.022;
  Object.assign(key.shadow.camera,{left:-long*.7,right:long*.7,bottom:-long*.7,top:long*.7,near:.1,far:long*5});
  key.shadow.camera.updateProjectionMatrix();
  const bounce=new T.HemisphereLight("#f5ebff","#9e6572",.85);
  key.visible=bounce.visible=false;scene.add(key,key.target,bounce);
  for (const part of model.children) part.traverse(o=>{if(o.isMesh)original.push([o,o.material,depthOf(part)]);});
  const plan = new T.Group(); let texture = null;
  if (source) {
    const corners = source.corners.map(p => fromPdf(p, P.origin, source.scale));
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.Float32BufferAttribute(corners.flatMap(([x,z]) => [x, -.25, z]),3));
    geo.setAttribute("uv", new T.Float32BufferAttribute([0,1,1,1,0,0,1,0],2));
    geo.setIndex([0,2,1,1,2,3]);
    texture = new T.CanvasTexture(source.canvas); texture.colorSpace = T.SRGBColorSpace;
    const mat = new T.MeshBasicMaterial({map:texture, side:T.DoubleSide, toneMapped:false});
    plan.add(new T.Mesh(geo, mat));
  } else {
    // Model-derived linework, never passed off as an original architect's sheet.
    const pos = [];
    const line = (a,b) => pos.push(a[0]/1000,-.25,-a[1]/1000,b[0]/1000,-.25,-b[1]/1000);
    for (const w of P.walls) {
      const L = Math.hypot(w.b[0]-w.a[0],w.b[1]-w.a[1]); if (!L) continue;
      const u = [(w.b[0]-w.a[0])/L,(w.b[1]-w.a[1])/L];
      const at = (d,s) => [w.a[0]+u[0]*d-u[1]*s,w.a[1]+u[1]*d+u[0]*s];
      let x = 0;
      for (const [lo,hi] of [...P.openings.filter(o=>o.wall===w.id).map(o=>[o.at-o.w/2,o.at+o.w/2]).sort((a,b)=>a[0]-b[0]),[L,L]]) {
        if (lo > x) for (const s of [-w.t/2,w.t/2]) line(at(x,s),at(lo,s)); x = Math.max(x,hi);
      }
    }
    const g = new T.BufferGeometry(); g.setAttribute("position",new T.Float32BufferAttribute(pos,3));
    plan.add(new T.LineSegments(g,new T.LineBasicMaterial({color:0x654a4e,toneMapped:false})));
  }
  plan.visible=false; scene.add(plan);
  const ivory = new T.Color("#fffaf7");
  const draw = ({beat = 0, split = 50, compare = false, showcase = false}) => {
    const w = renderer.domElement.clientWidth, h = renderer.domElement.clientHeight; if (!w || !h) return;
    const aspect = w / h, angle = compare ? 0 : showcase ? .91 : Math.min(1, beat/2)*.83;
    // North is up in the overhead camera. Orbit only for the illustrative build sequence.
    const azimuth=compare?0:showcase ? .59 : Math.min(1,beat/2)*.56;
    camera.up.set(-Math.cos(angle)*Math.sin(azimuth),Math.sin(angle),-Math.cos(angle)*Math.cos(azimuth));
    const distance = Math.max(extent.x,extent.y,extent.z,1)*4 + 20;
    const gaze=centre.clone(); gaze.y=extent.y*(showcase ? .15 : .29)*Math.sin(angle);
    camera.position.copy(gaze).add(new T.Vector3(Math.sin(azimuth)*Math.sin(angle)*distance,Math.cos(angle)*distance,Math.cos(azimuth)*Math.sin(angle)*distance));
    camera.lookAt(gaze);
    const span = Math.max((extent.z*Math.cos(azimuth)+extent.x*Math.sin(azimuth))*Math.cos(angle)+extent.y*Math.sin(angle),(extent.x*Math.cos(azimuth)+extent.z*Math.sin(azimuth))/aspect,1)*1.22;
    camera.left=-span*aspect/2; camera.right=-camera.left; camera.top=span/2; camera.bottom=-camera.top; camera.far=distance*3; camera.updateProjectionMatrix();
    const lightState=lights.map(o=>[o,o.visible]);
    const children = model.children.map(o=>[o,o.visible]), surroundings=ground.map(o=>[o,o.visible]);
    const bg=scene.background,scissor=renderer.getScissor(new T.Vector4()),wasScissor=renderer.getScissorTest(),shadows=renderer.shadowMap.enabled;
    try {
      scene.background=ivory; ground.forEach(o=>o.visible=false); plan.visible=true; renderer.shadowMap.enabled=false;
      children.forEach(([o])=>o.visible=compare ? depthOf(o)<=3 : depthOf(o)<=beat);
      base.visible=!compare && beat>0;
      if (showcase) {
        plan.visible=base.visible=false;plate.visible=key.visible=bounce.visible=true;
        lights.forEach(o=>o.visible=false);renderer.shadowMap.enabled=true;
        // Cut roof only. Openings, floor and furniture remain the real model meshes.
        children.forEach(([o])=>o.visible=o.name!=="ROOF");
        original.forEach(([o,m,phase])=>{
          if(o.name==="SLAB")o.material=floorDisplay;
          else if(phase===2 && m?.name==="lining-plasterboard")o.material=plasterDisplay;
        });
      } else if (compare || beat < BEATS.length-1) {
        const palette=compare?crossMaterial:buildMaterial;
        original.forEach(([o,old,phase])=>o.material=palette[phase]||old);
      }
      if (compare) {
        const mid=Math.round(w*Math.max(0,Math.min(100,split))/100);
        renderer.setScissorTest(true); model.visible=false;
        if (mid>0) { renderer.setScissor(0,0,mid,h);renderer.render(scene,camera); }
        model.visible=true; plan.visible=false; base.visible=true;
        if (mid<w) { renderer.setScissor(mid,0,w-mid,h);renderer.render(scene,camera); }
      } else renderer.render(scene,camera);
    } finally {
      plate.visible=key.visible=bounce.visible=false;lightState.forEach(([o,vis])=>o.visible=vis);
      base.visible=false;plan.visible=false; model.visible=true; scene.background=bg; renderer.shadowMap.enabled=shadows;
      original.forEach(([o,m])=>o.material=m); children.concat(surroundings).forEach(([o,vis])=>o.visible=vis);
      renderer.setScissor(scissor); renderer.setScissorTest(wasScissor);
    }
  };
  return {draw, dispose() {scene.remove(plan); plan.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});texture?.dispose(); scene.remove(base);base.geometry.dispose();base.material.dispose();[plaster,timber,wallInk,sill,floorDisplay,plasterDisplay].forEach(m=>m.dispose());
    floorDisplay.map?.dispose();scene.remove(plate,key,key.target,bounce);key.shadow.dispose();
    plate.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}};
}
