import * as T from './vendor/three.webgpu.min.js';

// Two folded linen layers rest on the cushion. Only the last hand-width clears its front edge.
export function woolThrow(mesh,cloth){
 const textile=cloth.clone();textile.color.set(0xa6a299);textile.roughness=.99;textile.side=T.DoubleSide;textile.normalScale.set(.11,.11);
 for(let layer=0;layer<2;layer++){
  const g=new T.PlaneGeometry(1,1,35,45),p=g.attributes.position,uv=g.attributes.uv;
  for(let i=0;i<p.count;i++){const s=uv.getX(i)-.5,t=uv.getY(i),edge=Math.max(0,(t-.83)/.17);
   const x=2.46+s*(.47+layer*.009)+.036*t+.008*Math.sin(t*6+s*3),z=-1.51+.66*Math.min(1,t/.83)+.033*Math.sin(edge*Math.PI/2);
   const contact=.551+.013*Math.sin(Math.PI*(t+.03))+.006*Math.sin(s*12+t*5)+.004*Math.sin(s*29+t*7);
   p.setXYZ(i,x,contact-edge*(.095+.014*Math.cos(s*9))+.010*layer,z);uv.setXY(i,(s+.5)*.7,t*1.4)
  }
  g.computeVertexNormals();mesh(g,textile)
 }
}
