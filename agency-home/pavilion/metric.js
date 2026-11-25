import * as T from './vendor/three.webgpu.min.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';

// Use metres on the visible face, regardless of the section size or board length.
export function buildBoards(entries,scene,glass){
 const unit=new T.BoxGeometry(),v=new T.Vector3(),scale=new T.Vector3(),q=new T.Quaternion();
 for(const [material,matrices] of entries){
  const parts=[];let k=0;
  for(const matrix of matrices){matrix.decompose(v,q,scale);
   const geo=unit.clone(),coord=geo.attributes.uv,w=Math.abs(scale.x),h=Math.abs(scale.y),d=Math.abs(scale.z);
   const span=material.userData.repeatMetres??1.8;
   const offset=(++k*.61803398875)%1,amount=.955+.08*((k*.75487766)%1);
   const color=[];for(let i=0;i<coord.count;i++){const face=Math.floor(i/4),x=coord.getX(i),y=coord.getY(i);
    const wi=face<2?d:w,hi=face===2||face===3?d:h;
    // Timber runs along the long direction, never across an entire UV island of a narrow slat.
    if(material.userData.grain&&hi>wi)coord.setXY(i,y*hi/span+offset,x*wi/span+.31*offset);
    else coord.setXY(i,x*wi/span+offset,y*hi/span+.31*offset);
    color.push(amount,amount,amount)}
   geo.setAttribute('color',new T.Float32BufferAttribute(color,3));geo.applyMatrix4(matrix);parts.push(geo)
  }
  if(!parts.length)continue;const g=mergeGeometries(parts,false);material.vertexColors=true;
  const m=new T.Mesh(g,material);m.castShadow=material!==glass;m.receiveShadow=true;scene.add(m);for(const p of parts)p.dispose()
 }
}
