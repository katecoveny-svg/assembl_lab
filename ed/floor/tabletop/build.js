import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {USDZExporter} from 'three/addons/exporters/USDZExporter.js';
import {CUBICLES} from '../layout.js';
// Explicit semantic selection. Never traverse World.root: no road, ground, patient data or Google geometry.
export async function build(){
 const root=new T.Group();root.name='Fictional_ED_two_cubicle_cutaway';
 const shell=new T.Group(),equipment=new T.Group(),provenance=new T.Group();
 shell.name='Selected_zone_shell';equipment.name='Selected_cubicles_0_1_equipment';provenance.name='Scale_and_provenance';root.add(shell,equipment,provenance);
 const mat=c=>new T.MeshStandardMaterial({color:c,roughness:.7});
 const box=(w,h,d,x,y,z,c,parent=shell)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat(c));m.position.set(x,y,z);parent.add(m);return m;};
 const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
 const assets=Object.fromEntries(await Promise.all(['bed','curtain','monitor','ivpole'].map(async k=>[k,(await loader.loadAsync('/assets/models/simready/ed/'+k+'.glb')).scene])));
 const origin={x:(CUBICLES[0].x+CUBICLES[1].x)/2,z:CUBICLES[0].z};
 for(const [i,c] of CUBICLES.slice(0,2).entries()){
  const place=(key,x,z,yaw,s=[1,1,1])=>{const m=assets[key].clone();m.name=`Cubicle_${i}_${key}`;m.position.set(x-origin.x,0,z-origin.z-.45);m.rotation.y=yaw;m.scale.fromArray(s);equipment.add(m);};
  place('bed',c.x,c.z,-Math.PI/2);place('monitor',c.x+.95,c.z-.85,0);place('ivpole',c.x-.85,c.z-.7,0);
  place('curtain',c.x-1.6,c.z+.15,-Math.PI/2,[.98,.62,.98]);
 }
 equipment.updateMatrixWorld(true);const eb=new T.Box3().setFromObject(equipment),ec=eb.getCenter(new T.Vector3());
 const left=eb.min.x-.25,right=eb.max.x+.25,back=eb.min.z-.25,front=eb.max.z+1.25;
 box(right-left,.18,front-back,(left+right)/2,-.09,(back+front)/2,0xe8e0e5).name='Display_plinth';
 box(right-left,1.2,.12,(left+right)/2,.6,back,0xf1eeeb).name='Cutaway_rear_wall';
 // Baked plate remains legible in native viewers; includes scale and derivative attribution.
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#33212f';ctx.fillRect(0,0,1024,128);ctx.fillStyle='#fff';ctx.font='bold 30px sans-serif';ctx.fillText('FICTIONAL ED • 1:16 TABLETOP • STATIC MODEL',24,40);ctx.font='21px sans-serif';ctx.fillText('NVIDIA SimReady / codepawl • CC BY 4.0 • cutaway & scale: assembl',24,78);ctx.fillText('Source units: metres • illustrative layout, not a surveyed hospital',24,108);
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
 const plate=new T.Mesh(new T.PlaneGeometry(6.8,.85),new T.MeshStandardMaterial({map:texture,roughness:1}));plate.rotation.x=-Math.PI/2;plate.position.set(ec.x,.012,front-.6);plate.name='Provenance_plate';provenance.add(plate);
 // Native exporters receive ordinary meshes, standard materials and explicit bounded textures.
 const clean=new T.Group();clean.name=root.name;root.updateMatrixWorld(true);const maps=new Map();
 const map=tx=>{if(!tx?.image)return null;if(maps.has(tx))return maps.get(tx);const c=document.createElement('canvas'),s=Math.min(1,1024/Math.max(tx.image.width,tx.image.height));c.width=Math.max(1,Math.round(tx.image.width*s));c.height=Math.max(1,Math.round(tx.image.height*s));c.getContext('2d').drawImage(tx.image,0,0,c.width,c.height);const t=new T.CanvasTexture(c);t.colorSpace=tx.colorSpace;t.flipY=tx.flipY;maps.set(tx,t);return t;};
 root.traverseVisible(o=>{if(!o.isMesh)return;const convert=m=>new T.MeshStandardMaterial({color:m.color,roughness:m.roughness??.7,metalness:Math.min(.25,m.metalness??0),map:map(m.map),side:T.FrontSide});const g=new T.BufferGeometry();for(const [key,a] of Object.entries(o.geometry.attributes)){const data=new Float32Array(a.count*a.itemSize);for(let i=0;i<a.count;i++)for(let k=0;k<a.itemSize;k++)data[i*a.itemSize+k]=a[["getX","getY","getZ","getW"][k]](i);g.setAttribute(key,new T.BufferAttribute(data,a.itemSize));}if(o.geometry.index)g.setIndex(Array.from(o.geometry.index.array));for(const group of o.geometry.groups)g.addGroup(group.start,group.count,group.materialIndex);if(!g.attributes.normal)g.computeVertexNormals();g.normalizeNormals();const mesh=new T.Mesh(g,Array.isArray(o.material)?o.material.map(convert):convert(o.material));mesh.name=o.name||o.parent.name;mesh.applyMatrix4(o.matrixWorld);clean.add(mesh);});
 clean.scale.setScalar(1/16);clean.updateMatrixWorld(true);let b=new T.Box3().setFromObject(clean),centre=b.getCenter(new T.Vector3());clean.position.set(-centre.x,-b.min.y,-centre.z);clean.updateMatrixWorld(true);b=new T.Box3().setFromObject(clean);
 let triangles=0,meshes=0,normalErrors=0;clean.traverse(o=>{if(!o.isMesh)return;meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;const n=o.geometry.attributes.normal;for(let i=0;i<n.count;i++){const v=Math.hypot(n.getX(i),n.getY(i),n.getZ(i));if(!Number.isFinite(v)||Math.abs(v-1)>.02)normalErrors++;}});
 const manifest={sourceCommit:'0f035e3',sourceUnits:'metres',scale:1/16,selection:'CUBICLES[0:2]; original equipment transforms; curtains lowered as in browser',boundsMetres:b.getSize(new T.Vector3()).toArray(),min:b.min.toArray(),max:b.max.toArray(),triangles,meshes,normalErrors,textures:[...maps.values()].map(t=>[t.image.width,t.image.height]),snapshot:'Static unoccupied venue, not current simulation state',licence:'NVIDIA SimReady CC BY 4.0 via codepawl; derivative by assembl',physicalDeviceTested:false};
 if(triangles>100000||normalErrors||Math.max(...manifest.boundsMetres)>.7)throw Error('Geometry budget or normals failed: '+JSON.stringify(manifest));
 const glb=await new GLTFExporter().parseAsync(clean,{binary:true,maxTextureSize:1024});const usdz=await new USDZExporter().parseAsync(clean,{maxTextureSize:1024});
 manifest.bytes={glb:glb.byteLength,usdz:usdz.byteLength};if(Math.max(...Object.values(manifest.bytes))>8*1024*1024)throw Error('File budget exceeded');return {glb,usdz,manifest};
}
