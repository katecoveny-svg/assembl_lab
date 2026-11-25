// Inspection pass only. One renderer, the original model, an orthographic camera
// and a sheet quad. All visibility/material state is restored before returning.
import * as T from "three";
import { BEATS, depthOf, fromPdf } from "./build-sequence.js";

export function buildView(stage, source) {
  const model = stage.model, P = stage.P, renderer = stage.renderer, scene = stage.scene;
  const box = new T.Box3().setFromObject(model), centre = box.getCenter(new T.Vector3());
  centre.y = 0;
  const extent = box.getSize(new T.Vector3());
  const camera = new T.OrthographicCamera(-1, 1, 1, -1, .01, 10000);
  const clay = new T.MeshStandardMaterial({color: 0xc29b98, roughness: .86});
  const original = [], ground = scene.children.filter(o => o.isMesh);
  model.traverse(o => { if (o.isMesh) original.push([o, o.material]); });
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
  const draw = ({beat = 0, split = 50, compare = false}) => {
    const w = renderer.domElement.clientWidth, h = renderer.domElement.clientHeight; if (!w || !h) return;
    const aspect = w / h, angle = compare ? 0 : Math.min(1, beat/2)*.83;
    // North is up in the overhead camera. Orbit only for the illustrative build sequence.
    const azimuth=compare?0:Math.min(1,beat/2)*.56;
    camera.up.set(-Math.cos(angle)*Math.sin(azimuth),Math.sin(angle),-Math.cos(angle)*Math.cos(azimuth));
    const distance = Math.max(extent.x,extent.y,extent.z,1)*4 + 20;
    const gaze=centre.clone(); gaze.y=extent.y*.29*Math.sin(angle);
    camera.position.copy(gaze).add(new T.Vector3(Math.sin(azimuth)*Math.sin(angle)*distance,Math.cos(angle)*distance,Math.cos(azimuth)*Math.sin(angle)*distance));
    camera.lookAt(gaze);
    const span = Math.max((extent.z*Math.cos(azimuth)+extent.x*Math.sin(azimuth))*Math.cos(angle)+extent.y*Math.sin(angle),(extent.x*Math.cos(azimuth)+extent.z*Math.sin(azimuth))/aspect,1)*1.22;
    camera.left=-span*aspect/2; camera.right=-camera.left; camera.top=span/2; camera.bottom=-camera.top; camera.far=distance*3; camera.updateProjectionMatrix();
    const children = model.children.map(o=>[o,o.visible]), surroundings=ground.map(o=>[o,o.visible]);
    const bg=scene.background,scissor=renderer.getScissor(new T.Vector4()),wasScissor=renderer.getScissorTest(),shadows=renderer.shadowMap.enabled;
    try {
      scene.background=ivory; ground.forEach(o=>o.visible=false); plan.visible=true; renderer.shadowMap.enabled=false;
      children.forEach(([o])=>o.visible=compare ? depthOf(o)<=3 : depthOf(o)<=beat);
      if (!compare && beat < BEATS.length-1) original.forEach(([o])=>o.material=clay);
      if (compare) {
        const mid=Math.round(w*Math.max(0,Math.min(100,split))/100);
        renderer.setScissorTest(true); model.visible=false;
        if (mid>0) { renderer.setScissor(0,0,mid,h);renderer.render(scene,camera); }
        model.visible=true; plan.visible=false;
        if (mid<w) { renderer.setScissor(mid,0,w-mid,h);renderer.render(scene,camera); }
      } else renderer.render(scene,camera);
    } finally {
      plan.visible=false; model.visible=true; scene.background=bg; renderer.shadowMap.enabled=shadows;
      original.forEach(([o,m])=>o.material=m); children.concat(surroundings).forEach(([o,vis])=>o.visible=vis);
      renderer.setScissor(scissor); renderer.setScissorTest(wasScissor);
    }
  };
  return {draw, dispose() {scene.remove(plan); plan.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});texture?.dispose();clay.dispose();}};
}
