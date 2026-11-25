import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let library;
function bark(mesh) {
  // The Blender trunk's procedural colour was not part of the GLB. Give its actual
  // imported geometry a browser material, keeping the original binary unchanged.
  const g = mesh.geometry.toNonIndexed(), p = g.attributes.position;
  const uv = new Float32Array(2*p.count);
  for(let j=0;j<p.count;j+=3){
    const u=[j,j+1,j+2].map(i=>.5+Math.atan2(p.getZ(i),p.getX(i))/(2*Math.PI));
    if(Math.max(...u)-Math.min(...u)>.5)for(let k=0;k<3;k++)if(u[k]<.5)u[k]+=1;
    for(let k=0;k<3;k++){uv[2*(j+k)]=u[k];uv[2*(j+k)+1]=p.getY(j+k)/2.4;}
  }
  g.setAttribute('uv',new T.BufferAttribute(uv,2));
  const c=document.createElement('canvas');c.width=256;c.height=512;
  const ctx=c.getContext('2d'),im=ctx.createImageData(256,512);
  let state=1729;
  for(let y=0;y<512;y++)for(let x=0;x<256;x++){
    state=(1664525*state+1013904223)>>>0;
    const t=y+.7*Math.sin(x*Math.PI/64)+.5*Math.sin(x*Math.PI/22.3);
    const band=Math.exp(-((t%22-2)**2)/2.7),ridge=Math.exp(-((t%22-5)**2)/1.6);
    const grain=5*Math.sin(x*.84)+4*Math.sin(x*.233+y*.011)+(state/4294967296-.5)*12;
    const j=(y*256+x)*4,lum=-33*band+13*ridge+grain;
    im.data.set([115+lum,108+lum,94+lum,255],j);
  }
  ctx.putImageData(im,0,0);
  const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.wrapS=T.RepeatWrapping;tex.anisotropy=4;
  return {geometry:g,material:new T.MeshStandardMaterial({map:tex,roughness:.89,metalness:0})};
}
function load() {
  return library??=new GLTFLoader().loadAsync(new URL('../../media/plants/nikau-hero-blender.glb',import.meta.url).href).then(g=>{
    g.scene.updateMatrixWorld(true);const parts=[];
    g.scene.traverse(o=>{
      if(!o.isMesh)return;
      const src=o.name==='Nikau_Trunk'?bark(o):{geometry:o.geometry,material:o.material};
      parts.push({...src,transform:o.matrixWorld.clone()});
    });
    if(parts.length!==5)throw Error('Nīkau model is incomplete.');
    return parts;
  });
}
export function placeNikau(group,rows,y,onReady) {
  if(!rows.length)return Promise.resolve();
  return load().then(parts=>{
    if(group.userData.disposed)return;
    const pose=new T.Object3D(),m=new T.Matrix4();
    for(const [i,p] of parts.entries()){
      const mesh=new T.InstancedMesh(p.geometry,p.material,rows.length);
      mesh.name='nikau-hero-'+i;mesh.castShadow=mesh.receiveShadow=true;
      rows.forEach((r,j)=>{
        pose.position.set(r.x,y,r.z);pose.rotation.y=r.angle;pose.scale.setScalar(r.scale);pose.updateMatrix();
        mesh.setMatrixAt(j,m.multiplyMatrices(pose.matrix,p.transform));
      });
      mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();group.add(mesh);
    }
    onReady?.();
  }).catch(()=>{if(!group.userData.disposed){group.userData.nikauUnavailable=true;onReady?.();}});
}
