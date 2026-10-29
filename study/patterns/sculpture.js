/**
 * Sculptural Playground — live, local ribbon geometry.
 * Uses the repository's separately licensed Three.js distribution. The room,
 * lighting and ribbons are generated here; no remote textures or image services.
 */
import * as THREE from '../../assets/vendor/three/three.module.min.js';
import { createCanvasSculpture } from './sculpture-canvas.js';

const TAU = Math.PI * 2;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const smooth = (a, b, n) => { const x = clamp((n - a) / (b - a), 0, 1); return x*x*(3-2*x); };

function studioEnvironment(renderer) {
  // An HDR photographic light tent. White softboxes, charcoal flags and coloured
  // bounce cards make the reflections legible even with a white background.
  const w = 768, h = 384, pixels = new Float32Array(w*h*4);
  const panels = [
    [-2.3, .2, .34, .94, [5.8,5.6,5.25]],
    [-.72, .12, .20, 1.05, [8.4,7.9,7.1]],
    [.2, .45, .48, .35, [7.6,7.7,8.1]],
    [1.32, .08, .28, .96, [4.8,4.5,5.9]],
    [2.75, -.1, .34, .76, [3.6,4.9,4.35]],
    [-1.3, -.48, .6, .22, [3.6,1.6,1.2]],
  ];
  for (let y=0;y<h;y++) for (let x=0;x<w;x++) {
    const longitude=x/w*TAU-Math.PI, latitude=(.5-y/h)*Math.PI;
    const base = latitude > -.2 ? .075 : .43;
    const c=[base*1.05,base,base*.96];
    for (const [px,py,pw,ph,col] of panels) {
      const distance=Math.abs(Math.atan2(Math.sin(longitude-px), Math.cos(longitude-px)));
      const f=(1-smooth(pw*.85,pw,distance))*(1-smooth(ph*.9,ph,Math.abs(latitude-py)));
      for(let k=0;k<3;k++) c[k]+=col[k]*f;
    }
    const ceiling=Math.pow(Math.max(0,Math.sin(latitude)),7)*3;
    const i=(y*w+x)*4;
    pixels[i]=c[0]+ceiling; pixels[i+1]=c[1]+ceiling; pixels[i+2]=c[2]+ceiling; pixels[i+3]=1;
  }
  const source=new THREE.DataTexture(pixels,w,h,THREE.RGBAFormat,THREE.FloatType);
  source.mapping=THREE.EquirectangularReflectionMapping;
  source.colorSpace=THREE.LinearSRGBColorSpace;
  source.needsUpdate=true;
  const pmrem=new THREE.PMREMGenerator(renderer);
  const result=pmrem.fromEquirectangular(source);
  source.dispose();pmrem.dispose();
  return result;
}

class SculptedCurve extends THREE.Curve {
  constructor(seed, variant) { super(); this.seed=seed;this.variant=variant; }
  getPoint(u, target=new THREE.Vector3()) {
    const a=u*TAU, phase=Math.sin(this.seed*.017)*.12;
    const radius=1.02+.38*Math.cos(3*a+phase);
    return target.set(radius*Math.cos(2*a),radius*Math.sin(2*a)*1.12,.48*Math.sin(3*a+phase));
  }
}

function ribbonGeometry(seed,variant) {
  const curve=new SculptedCurve(seed,variant), segments=360, sides=40;
  const frames=curve.computeFrenetFrames(segments,true);
  const positions=new Float32Array((segments+1)*(sides+1)*3);
  const normals=new Float32Array(positions.length);
  const uv=new Float32Array((segments+1)*(sides+1)*2), indices=[];
  const n=new THREE.Vector3(), b=new THREE.Vector3(), pos=new THREE.Vector3(), normal=new THREE.Vector3();
  for(let i=0;i<=segments;i++) {
    const u=i/segments, a=u*TAU, centre=curve.getPoint(u);
    const twist=.62*Math.sin(a*2+variant*.9)+.28*Math.sin(a*3+seed*.001)+variant*.8;
    n.copy(frames.normals[i]).multiplyScalar(Math.cos(twist)).addScaledVector(frames.binormals[i],Math.sin(twist));
    b.copy(frames.binormals[i]).multiplyScalar(Math.cos(twist)).addScaledVector(frames.normals[i],-Math.sin(twist));
    const width=.235*(1+.10*Math.sin(a*2+.7));
    const thickness=.20;
    for(let j=0;j<=sides;j++) {
      const v=j/sides, theta=v*TAU;
      pos.copy(centre).addScaledVector(n,Math.cos(theta)*width).addScaledVector(b,Math.sin(theta)*thickness);
      const index=i*(sides+1)+j;
      positions.set([pos.x,pos.y,pos.z],index*3);
      normal.copy(n).multiplyScalar(Math.cos(theta)/width).addScaledVector(b,Math.sin(theta)/thickness).normalize();
      normals.set([normal.x,normal.y,normal.z],index*3);uv.set([u,v],index*2);
      if(i<segments&&j<sides) { const k=index,l=index+sides+1;indices.push(k,k+1,l,k+1,l+1,l); }
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));
  geometry.setAttribute('normal',new THREE.BufferAttribute(normals,3));
  geometry.setIndex(indices);geometry.computeBoundingSphere();
  return geometry;
}

function makeShadow() {
  const material=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,
    uniforms:{uDark:{value:0}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:'varying vec2 vUv;uniform float uDark;void main(){vec2 p=(vUv-.5)*2.;float a=exp(-dot(p,p)*5.5)*.22;gl_FragColor=vec4(mix(vec3(.32,.25,.38),vec3(.0),uDark),a);}'
  });
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(5.8,4.0),material);
  mesh.rotation.x=-Math.PI/2;mesh.position.set(0,-2.03,-.2);return mesh;
}

export function createSculpture(canvas) {
  // Probe a disposable canvas: asking this canvas for WebGL first would lock
  // its context type and prevent a genuine 2D fallback on restricted devices.
  const probe=document.createElement('canvas');
  let gl=null;
  try { gl=probe.getContext('webgl2'); } catch {}
  if(!gl)return createCanvasSculpture(canvas);
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  let renderer;
  try {
    renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
  } catch(error) {
    throw new Error('Sculptural Playground needs WebGL. The other Studio engines are still available.',{cause:error});
  }
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.82;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#f6f3ec');
  const camera=new THREE.PerspectiveCamera(34,1,.1,50);
  const environment=studioEnvironment(renderer);scene.environment=environment.texture;
  scene.environmentIntensity=1.1;
  const group=new THREE.Group();scene.add(group);
  const shadow=makeShadow();scene.add(shadow);
  // Opaque studio backdrop participates in Three's transmission render target.
  // A uniform clear colour alone provides nothing recognisable to refract.
  const backdropMaterial=new THREE.ShaderMaterial({
    uniforms:{uDark:{value:0}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:`varying vec2 vUv;uniform float uDark;void main(){
      vec3 cream=vec3(.92,.90,.85);vec2 p=vUv-.5;
      float band=exp(-pow((p.x+.13*sin(p.y*8.)-.02)/.12,2.));
      float mint=exp(-pow((p.x-.18+.08*sin(p.y*6.))/.09,2.));
      vec3 c=mix(cream,vec3(.69,.60,.79),band*.35);
      c=mix(c,vec3(.56,.74,.69),mint*.28);
      c=mix(c,vec3(.05,.04,.09),uDark*.9);
      gl_FragColor=vec4(c,1.);}`
  });
  const backdrop=new THREE.Mesh(new THREE.PlaneGeometry(14,14),backdropMaterial);
  backdrop.position.z=-2.3;scene.add(backdrop);
  const key=new THREE.DirectionalLight(0xfff5e9,1.4);key.position.set(-3,5,4);scene.add(key);
  const rim=new THREE.DirectionalLight(0xeadfff,1.2);rim.position.set(4,1,-2);scene.add(rim);
  const fill=new THREE.HemisphereLight(0xffffff,0xc7b4af,.35);scene.add(fill);
  const materialOptions={roughness:.075,clearcoat:1,clearcoatRoughness:.045,envMapIntensity:1.32};
  const glass=new THREE.MeshPhysicalMaterial({...materialOptions,color:0xffffff,metalness:0,clearcoat:0,envMapIntensity:.35,roughness:.025,transmission:1,thickness:.48,ior:1.5,iridescence:.08,iridescenceIOR:1.34,iridescenceThicknessRange:[160,430],attenuationColor:new THREE.Color(0xe5dcff),attenuationDistance:4});
  const chrome=new THREE.MeshPhysicalMaterial({...materialOptions,color:0xe8e7e1,metalness:1,roughness:.13,iridescence:.12});
  const coral=new THREE.MeshPhysicalMaterial({...materialOptions,color:0xffb69f,metalness:.14,transmission:.46,thickness:.7,ior:1.43,iridescence:.30,attenuationColor:new THREE.Color(0xff9d8b),attenuationDistance:2});
  const mint=new THREE.MeshPhysicalMaterial({...materialOptions,color:0xc4e7d9,metalness:.2,transmission:.46,thickness:.65,ior:1.40,iridescence:.2});
  const materials=[glass,chrome,coral,mint];
  let ribbons=[],seed=42,lastMaterial='',lastDark=null,width=1,height=1,disposed=false;
  let turnX=0,turnY=0,sculpt=0;

  function reset(nextSeed=42) {
    seed=Number(nextSeed)||42;
    for(const mesh of ribbons){group.remove(mesh);mesh.geometry.dispose();}
    ribbons=[];
    const a=new THREE.Mesh(ribbonGeometry(seed,0),glass);
    // One closed, separated strand avoids intersections between independently moving meshes.
    ribbons=[a];group.add(a);
    turnX=0;turnY=0;sculpt=0;lastMaterial='';
  }
  function resize(w,h,dpr=1) {
    width=Math.max(1,w);height=Math.max(1,h);
    renderer.setPixelRatio(Math.min(2,Math.max(1,dpr)));
    renderer.setSize(width,height,false);
    camera.aspect=width/height;
    // Editorial, edge-to-edge crop on phones; a whole sculpture on wider screens.
    const vertical=width>height?5.2:6.4;
    const distance=(vertical/2)/Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
    camera.position.set(0,.15,distance);
    camera.lookAt(0,-.65,0);camera.updateProjectionMatrix();
  }
  function interact(x,y,dx=0,dy=0) {
    turnY+=dx*3.2;turnX=clamp(turnX+dy*2.2,-.8,.8);
    sculpt=clamp((x-.5)*.35+(y-.5)*.2,-.3,.3);
  }
  function render(time=0,settings={}) {
    if(disposed)return;
    if(settings.seed!=null&&Number(settings.seed)!==seed)reset(settings.seed);
    const material=settings.material||'glass';
    if(lastMaterial!==material) {
      ribbons[0].material=material==='chrome'?chrome:material==='coral'?coral:glass;
      lastMaterial=material;
    }
    const dark=Boolean(settings.dark);
    if(lastDark!==dark){scene.background.set(dark?'#211e3b':'#f6f3ec');shadow.material.uniforms.uDark.value=dark?1:0;backdropMaterial.uniforms.uDark.value=dark?1:0;lastDark=dark;}
    const energy=clamp(settings.energy??.5,0,1), clock=Number.isFinite(time)?time:0;
    group.rotation.set(-.1+turnX+Math.sin(clock*.16)*.07*energy,turnY+Math.sin(clock*.13)*.18*energy,-.14+sculpt+(energy-.5)*.35);
    group.scale.set(1+sculpt*.2,1-sculpt*.11,1);
    // Slow independent motion changes overlaps and reflections, not just pixels.
    ribbons[0].rotation.y=Math.sin(clock*.12)*.11*energy;
    renderer.render(scene,camera);
  }
  function dispose() {
    if(disposed)return;disposed=true;
    ribbons.forEach(mesh=>mesh.geometry.dispose());materials.forEach(material=>material.dispose());
    backdrop.geometry.dispose();backdropMaterial.dispose();shadow.geometry.dispose();shadow.material.dispose();environment.dispose();renderer.dispose();
  }
  reset(seed);resize(canvas.clientWidth||400,canvas.clientHeight||650,globalThis.devicePixelRatio||1);
  return {render,resize,interact,reset,dispose};
}
