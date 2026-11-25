import * as T from './vendor/three.webgpu.min.js';
import {HDRLoader} from './vendor/HDRLoader.js';
import {shadeSection} from './folio-shading.js';

async function unpack(url){
 const response=await fetch(url);
 if(!response.ok)throw Error('Section asset unavailable');
 let buffer=await response.arrayBuffer();
 if(new Uint8Array(buffer)[0]===31)buffer=await new Response(new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
 return buffer;
}
function readMesh(buffer){
 const header=new DataView(buffer),count=header.getUint32(0,true),indices=header.getUint32(4,true);
 if(8+count*12+indices*4!==buffer.byteLength)throw Error('Unexpected 16C geometry');
 const p=new Float32Array(count*3),n=new Float32Array(count*3),c=new Float32Array(count*3);
 let at=8;
 for(let i=0;i<count;i++){
  for(let k=0;k<3;k++,at+=2)p[3*i+k]=header.getInt16(at,true)/1000;
  for(let k=0;k<3;k++)n[3*i+k]=header.getInt8(at++)/127;
  for(let k=0;k<3;k++)c[3*i+k]=(header.getUint8(at++)/255)**2;
 }
 const g=new T.BufferGeometry();
 for(const [name,values] of [['position',p],['normal',n],['color',c]])g.setAttribute(name,new T.BufferAttribute(values,3));
 g.setIndex(new T.BufferAttribute(new Uint32Array(buffer,at,indices),1));return g;
}
export async function sectionModel(host,asset,forceGL,onLoss){
 const renderer=new T.WebGPURenderer({antialias:true,forceWebGL:forceGL,alpha:false,powerPreference:'low-power'});
 await renderer.init();
 const loader=new T.TextureLoader();
 async function surface(name,repeat=false){
  const map=await loader.loadAsync(asset(name));map.colorSpace=T.SRGBColorSpace;
  if(repeat){map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=4}return map;
 }
 const [geometry,runs,light,timber,cloth]=await Promise.all([
  unpack(asset('section16c.bin.gz')).then(readMesh),fetch(asset('section16c-surfaces.json')).then(r=>r.json()),
  unpack(asset('section16c-light.bin.gz')).then(b=>new Uint8Array(b)),surface('brown_planks_08.webp',true),surface('rough_linen.webp',true)
 ]);
 if(new DataView(light.buffer).getUint32(0,true)!==geometry.attributes.position.count)throw Error('Mismatched section lighting');
 const scene=new T.Scene();scene.background=new T.Color(0xe3d0d2);
 const lift=T.TSL.uniform(0);
 const aperture={centre:T.TSL.uniform(new T.Vector2()),radius:T.TSL.uniform(0),wipe:T.TSL.uniform(0),plain:T.TSL.uniform(1)};
 const envC=document.createElement('canvas');envC.width=256;envC.height=128;const pen=envC.getContext('2d');
 const skyGradient=pen.createLinearGradient(0,0,0,128);skyGradient.addColorStop(0,'#bed2de');skyGradient.addColorStop(.51,'#f9f5ec');skyGradient.addColorStop(1,'#aa9992');pen.fillStyle=skyGradient;pen.fillRect(0,0,256,128);pen.fillStyle='#fffdf8';pen.fillRect(58,20,45,28);
 const environment=new T.CanvasTexture(envC);environment.colorSpace=T.SRGBColorSpace;environment.mapping=T.EquirectangularReflectionMapping;scene.environment=environment;scene.environmentIntensity=.42;
 const [originals,uvs,atlas]=await Promise.all([fetch(asset('section16c-room-materials.json')).then(r=>r.json()),unpack(asset('section16c-uv.bin.gz')).then(b=>new Float32Array(b)),surface('section16c-originals.webp')]);
 const opaque=shadeSection(geometry,runs,light,timber,cloth,lift,aperture,originals,uvs,atlas);
 // Separate only the original glazing triangles. No copied or invented window faces.
 const flags=new Uint8Array(geometry.attributes.position.count);let first=0;
 for(const [end,name] of runs){if(/glass_double_glazed|shower_glass|oven_window/.test(name))flags.fill(1,first,end);first=end}
 const original=geometry.index.array,solid=[],panes=[];
 for(let f=0;f<original.length;f+=3)(flags[original[f]]?panes:solid).push(original[f],original[f+1],original[f+2]);
 const paneGeometry=new T.BufferGeometry();
 for(const name of ['position','normal','sectionWall'])paneGeometry.setAttribute(name,geometry.attributes[name]);
 geometry.setIndex(solid);paneGeometry.setIndex(panes);
 const paneMat=new T.MeshPhysicalNodeMaterial({color:0xbdccc6,metalness:.26,roughness:.055,transparent:true,opacity:.15,depthWrite:false,side:T.FrontSide});
 // The shared wall display cut also applies to glass in front of the cut plane.
 const pn=T.TSL.positionLocal,nearSide=pn.z.greaterThan(5.79).or(pn.x.lessThan(.18));
 paneMat.maskNode=T.TSL.attribute('sectionWall','float').lessThan(.5).or(nearSide.not()).or(pn.y.lessThanEqual(T.TSL.mix(4,.83,lift)));
 const mesh=new T.Mesh(geometry,opaque);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);
 const panesMesh=new T.Mesh(paneGeometry,paneMat);panesMesh.renderOrder=2;mesh.add(panesMesh);
 // Reuse a small derivative of the licensed daylight already shipped with the pavilion.
 const hdr=await new HDRLoader().loadAsync(asset('section16c-daylight.hdr')).catch(()=>null);
 if(hdr){hdr.mapping=T.EquirectangularReflectionMapping;scene.environment=hdr;scene.environmentIntensity=.68}

 const hemi=new T.HemisphereLight(0xf1f1eb,0xd9bfa6,1.8);
 const sunlight=new T.DirectionalLight(0xffeedc,2.05);
 sunlight.position.set(-6,14,-7);sunlight.target.position.set(4,0,2);sunlight.castShadow=true;
 Object.assign(sunlight.shadow.camera,{left:-11,right:11,top:10,bottom:-10,near:.1,far:40});
 sunlight.shadow.mapSize.set(host.clientWidth<600?1024:2048,host.clientWidth<600?1024:2048);sunlight.shadow.normalBias=.005;sunlight.shadow.intensity=.50;sunlight.shadow.radius=3;
 const skylight=new T.DirectionalLight(0xfff2dc,1.65);skylight.position.set(-2,9,15);
 scene.add(hemi,sunlight,sunlight.target,skylight);
 // The print and the model share their published footprint. Only the camera and the display cut move.
 const metres=10.8/508,W=660*metres,H=495*metres,cx=W/2-79*metres,cz=H/2-128*metres;
 const grainShadow=new T.DataTexture(new Uint8Array(light.buffer,light.byteOffset+4+geometry.attributes.position.count*2+192*192*2,256*256),256,256,T.RedFormat);
 grainShadow.minFilter=grainShadow.magFilter=T.LinearFilter;grainShadow.needsUpdate=true;
 // A seamless rose studio ground keeps the lead image focused on the furnished cutaway.
 const groundMat=new T.MeshBasicNodeMaterial();
 const {positionWorld:world,vec2,color,texture,mix,smoothstep}=T.TSL;
 const shadowUV=vec2(world.x.add(6).div(22),world.z.add(8).div(20));
 const shadow=texture(grainShadow,shadowUV).r;
 const fade=smoothstep(1,11,vec2(world.x.sub(4.4),world.z.sub(1.8)).length());
 groundMat.colorNode=mix(color(0xe8ded7),color(0xe3d0d2),fade).mul(shadow.mul(.43).add(.57));
 const ground=new T.Mesh(new T.PlaneGeometry(500,500),groundMat);ground.rotation.x=-Math.PI/2;ground.position.y=-1.53;scene.add(ground);
 const top=new T.OrthographicCamera(-W/2,W/2,H/2,-H/2,.1,45);
 top.up.set(0,0,-1);top.position.set(cx,20,cz);top.lookAt(cx,0,cz);
 const beauty=new T.PerspectiveCamera(),aim=new T.Vector3(),axis=new T.Vector3(),direction=new T.Quaternion(),end=new T.Object3D();
 let progress=0,bearing=-.51,elevation=.90,camera=top,lost=false,lastWidth=0,lastHeight=0;
 function pose(){
  mesh.position.y=.19*progress+.46*Math.sin(progress*Math.PI);lift.value=T.MathUtils.smoothstep(progress,0,.85);
  if(progress===0){camera=top;return}
  end.position.set(Math.sin(bearing)*Math.cos(elevation),Math.sin(elevation),Math.cos(bearing)*Math.cos(elevation));
  // Object3D looks along +Z. Build the camera's -Z orientation from the same eye point.
  end.quaternion.setFromRotationMatrix(new T.Matrix4().lookAt(end.position,new T.Vector3(),new T.Vector3(0,1,0)));
  direction.copy(top.quaternion).slerp(end.quaternion,progress);axis.set(0,0,1).applyQuaternion(direction);
  aim.set(cx,0,cz).lerp(new T.Vector3(4.50,-.78,3.47),progress);
  const distance=24/Math.max(.0005,progress),extent=H*(1+.51*progress);
  beauty.position.copy(aim).addScaledVector(axis,distance);beauty.quaternion.copy(direction);
  beauty.aspect=W/H;beauty.near=Math.max(.1,distance-20);beauty.far=distance+35;beauty.fov=2*Math.atan(extent/(2*distance))*180/Math.PI;beauty.updateProjectionMatrix();camera=beauty;
 }
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
 // The folio is event-driven. The shadow map only needs refreshing when the display cut changes.
 renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
 const canvas=renderer.domElement;canvas.setAttribute('aria-hidden','true');host.replaceChildren(canvas);
 function draw(){const w=host.clientWidth,h=host.clientHeight;if(lost||!w||!h)return;
  if(w!==lastWidth||h!==lastHeight){renderer.setSize(w,h,false);lastWidth=w;lastHeight=h}renderer.render(scene,camera)}
 const observer=new ResizeObserver(draw);observer.observe(host);draw();
 function loss(){if(lost)return;lost=true;observer.disconnect();host.replaceChildren();onLoss()}
 canvas.addEventListener('webglcontextlost',loss,{once:true});renderer.backend.device?.lost.then(loss);
 return {backend:renderer.backend.isWebGPUBackend?'WebGPU':'WebGL 2',
  reveal(u,v,radius,wipe){
   aperture.centre.value.set(u*W,v*H);aperture.radius.value=radius*W;aperture.wipe.value=wipe;aperture.plain.value=wipe>=.998?1:0;draw()
  },
  stage(value){const next=Math.min(1,Math.max(0,value));if(next===progress)return;progress=next;if(!next){bearing=-.51;elevation=.90}pose();renderer.shadowMap.needsUpdate=true;draw()},
  turn(dx,dy){bearing+=dx;elevation=T.MathUtils.clamp(elevation+dy,.42,1.36);pose();draw()}
 };
}
