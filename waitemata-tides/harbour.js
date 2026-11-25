import * as T from './vendor/three.module.min.js';
import { Water } from './vendor/Water.js';

// Metres. These are illustrative harbour ripples, deliberately not a weather feed.
const waves=[[.10,.61,.62,.78,1.16],[.05,1.15,-.89,.46,1.64],[.021,2.27,.96,-.28,2.10]];
const number=x=>x.toFixed(5);
const waveGL=waves.map(([a,k,dx,dz,w])=>number(a)+'*sin('+number(k)+'*dot(p,vec2('+number(dx)+','+number(dz)+'))-'+number(w)+'*s)').join('+');
function swell(x,z,t){let y=0;for(const [a,k,dx,dz,w] of waves)y+=a*Math.sin(k*(x*dx+z*dz)-w*t);return y}
const xyz=(x,y,z)=>new T.Vector3(x,y,z);
function makeBoat(scene){
 const boat=new T.Group();scene.add(boat);
 const paint=(c,r=.55,m=.04)=>new T.MeshStandardMaterial({color:c,roughness:r,metalness:m,side:T.DoubleSide});
 const hull=paint(0x263d3e,.36),under=paint(0x663832),stripe=paint(0xe7dfc7),mahogany=paint(0x916548),seam=paint(0x4b3d32),deck=paint(0xb0926d),linen=paint(0xe9e6d9,.92),jib=paint(0xd9d5c9,.91),steel=paint(0x9ca7aa,.26,.7),rope=paint(0xb2a891,.85);
 function add(g,m){const o=new T.Mesh(g,m);boat.add(o);return o}
 function segment(a,b,r,m){const start=xyz(...a),end=xyz(...b),d=end.clone().sub(start);const o=add(new T.CylinderGeometry(r,r,d.length(),7),m);o.position.copy(start).lerp(end,.5);o.quaternion.setFromUnitVectors(xyz(0,1,0),d.normalize());}
 function sheet(points,idx,m){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points,3));g.setIndex(idx);g.computeVertexNormals();return add(g,m)}
 const stations=[[-3.34,.51,.67],[-2.93,.72,.58],[-2.31,.94,.49],[-1.48,1.06,.44],[-.53,1.13,.42],[.45,1.12,.42],[1.36,1.01,.45],[2.13,.77,.52],[2.82,.42,.61],[3.46,.012,.76]];
 const skin=(side,ring)=>stations.map(([z,w,h])=>[side*w*ring[0],ring[1]*h+ring[2],z]);
 function ribbon(a,b,m){let p=[],ix=[];a.forEach((q,i)=>{p.push(...q,...b[i]);if(i){let k=i*2;ix.push(k-2,k-1,k,k-1,k+1,k)}});sheet(p,ix,m)}
 for(const side of [-1,1]){
  const rings=[[0,0,-.59],[.56,0,-.35],[.85,0,-.06],[.90,0,.025],[.905,0,.057],[.99,1,-.047],[1,1,0],[.982,1,.024]];
  [under,under,hull,stripe,hull,stripe,mahogany].forEach((m,k)=>ribbon(skin(side,rings[k]),skin(side,rings[k+1]),m));
 }
 // Deck split around the cockpit instead of a solid box on top of the hull.
 const slot=stations.map(([z])=>z>=-2.31&&z<=-.53?.51:0);
 for(const side of [-1,1]){
  const rail=skin(side,[.982,1,.024]);
  const inner=stations.map(([z,w,h],i)=>[side*slot[i],h+.032,z]);ribbon(rail,inner,deck);
  for(let j=1;j<8;j++){let f=j/8;let line=rail.map((v,i)=>v.map((x,k)=>x*f+inner[i][k]*(1-f)+(k===1?.012:0)));line.slice(1).forEach((p,i)=>segment(line[i],p,.005,seam));}
  for(let i=1;i<stations.length;i++)segment(rail[i-1],rail[i],.029,mahogany);
  ribbon(inner,inner.map(([x,y,z])=>[x*.91,y-.22,z]),mahogany);
 }
 const floor=add(new T.BoxGeometry(.89,.06,1.68),mahogany);floor.position.set(0,.25,-1.4);
 const transom=stations[0];sheet([-.51,.67,-3.34,.51,.67,-3.34,.34,-.06,-3.34,-.34,-.06,-3.34],[0,1,2,0,2,3],mahogany);
 segment([0,.49,.48],[0,6.68,.48],.048,mahogany);segment([0,1.17,.47],[.35,1.28,-2.71],.045,mahogany);
 for(const [x,y,z] of [[0,.73,3.38],[0,.68,-3.28],[-1.03,.45,-.4],[1.03,.45,-.4]])segment([0,6.61,.48],[x,y,z],.010,steel);
 function sail(a,b,c,bulge,m){const p=[],ix=[],N=17,ids=[];function pos(u,v){const w=1-u-v;return [a[0]*w+b[0]*u+c[0]*v+bulge*9*u*v*w,a[1]*w+b[1]*u+c[1]*v,a[2]*w+b[2]*u+c[2]*v]};for(let i=0;i<=N;i++){ids[i]=[];for(let j=0;j<=N-i;j++){ids[i][j]=p.length/3;p.push(...pos(i/N,j/N));}}for(let i=0;i<N;i++)for(let j=0;j<N-i;j++){ix.push(ids[i][j],ids[i+1][j],ids[i][j+1]);if(j<N-i-1)ix.push(ids[i+1][j],ids[i+1][j+1],ids[i][j+1]);}sheet(p,ix,m);for(let t=1;t<=6;t++){let u=t/7;for(let i=0;i<8;i++){let q=pos(u,i/8*(1-u)),r=pos(u,(i+1)/8*(1-u));q[0]+=.005;r[0]+=.005;segment(q,r,.005,rope);}}}
 sail([.012,1.29,.41],[.018,6.47,.44],[.35,1.38,-2.63],.66,linen);sail([.02,.9,3.24],[.013,5.94,.78],[-.31,1.15,-.11],-.61,jib);
 segment([.35,1.28,-2.62],[.27,.51,-2.2],.018,rope);boat.rotation.y=-.99;return boat;
}

export async function createHarbour(holder){
 const loader=new T.TextureLoader();
 let timeout;
 const textures=await Promise.race([
  Promise.all(['./media/skyline-and-bridge.webp','./media/queens-wharf.webp','./vendor/waternormals.jpg'].map(url=>loader.loadAsync(url))),
  new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('Harbour images timed out')),10000)})
 ]).finally(()=>clearTimeout(timeout));
 const [city,plate,normals]=textures;
 const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
 const canvas=renderer.domElement;canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Waitematā Harbour, the Harbour Bridge and the Auckland skyline. A model sailing boat rides illustrative waves.');
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;
 renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.03;
 const scene=new T.Scene();scene.background=new T.Color(0xa1b2bb);
 const camera=new T.PerspectiveCamera(31,1,.12,1400);
 const light=new T.HemisphereLight(0xf2f6fb,0x708b88,1.75);scene.add(light);
 const sun=xyz(-.53,.48,-.70).normalize(),direct=new T.DirectionalLight(0xffead4,2.1);direct.position.copy(sun).multiplyScalar(100);scene.add(direct);
 let active=true,visible=true,paused=matchMedia('(prefers-reduced-motion: reduce)').matches,clock=0,last=0,height=1.65,zoom=1,pan=0,tilt=0,width=0,hh=0;
 let reverse=false;city.colorSpace=plate.colorSpace=T.SRGBColorSpace;
 // Photograph retains one perspective: our orbit is intentionally small, not a fabricated 360° view.
 const back=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map:city,toneMapped:false}));back.position.set(0,125,-400);scene.add(back);
 normals.wrapS=normals.wrapT=T.RepeatWrapping;
 // Put fine tessellation by the lens and progressively coarsen it towards the horizon.
 const S=144,points=[],indices=[];for(let j=0;j<=S;j++){const u=j/S,depth=28-540*(.085*u+.915*u**3);for(let i=0;i<=S;i++){const x=(i/S-.5)*2;points.push(x*(31+Math.max(0,-depth)*1.18),-depth,0);if(i&&j){let k=j*(S+1)+i;indices.push(k-S-2,k-S-1,k,k-S-2,k,k-1);}}}
 const geom=new T.BufferGeometry();geom.setAttribute('position',new T.Float32BufferAttribute(points,3));geom.setIndex(indices);geom.computeVertexNormals();
 const water=new Water(geom,{textureWidth:1024,textureHeight:512,waterNormals:normals,sunDirection:sun,sunColor:0xf6ede1,waterColor:0x365651,distortionScale:.70,side:T.DoubleSide});
 water.rotation.x=-Math.PI/2;scene.add(water);const m=water.material;
 m.uniforms.size.value=3.4;
 m.uniforms.hullCentre={value:new T.Vector2()};
 m.vertexShader=m.vertexShader.replace('void main() {','float surface(vec2 p,float s){return '+waveGL+';}\nvoid main() { vec3 waved=position;waved.z+=surface(vec2(position.x,-position.y),time)* (1.0-smoothstep(50.,150.,abs(position.y)));').replaceAll('vec4( position, 1.0 )','vec4(waved,1.)');
 // Fresnel, reflected skyline/boat and coloured downwelling light. No projected photograph on the water.
 const waveSlope=waves.map(([a,k,dx,dz,w])=>'vec2('+number(dx)+','+number(dz)+')*'+number(a*k)+'*cos('+number(k)+'*dot(p,vec2('+number(dx)+','+number(dz)+'))-'+number(w)+'*time)').join('+');
 m.fragmentShader='uniform vec2 hullCentre;\n'+m.fragmentShader.replace('void main() {','vec2 waveSlope(vec2 p){return '+waveSlope+';}\nvoid main() {')
  .replace('vec4 noise = getNoise( worldPosition.xz * size );','vec4 noise = getNoise( worldPosition.xz * 63.0 );')
  .replace('vec3 surfaceNormal = normalize( noise.xzy * vec3( 1.5, 1.0, 1.5 ) );',`
   float surfaceDistance=length(eye-worldPosition.xyz);
   vec2 g=waveSlope(worldPosition.xz)*(1.-smoothstep(55.,145.,surfaceDistance));
   vec2 p=worldPosition.xz;
   // Long swells carry shorter wind ripples. Suppress sub-pixel frequencies towards the shore.
   vec2 wind=vec2(.85,.526),crossWind=vec2(-wind.y,wind.x);
   float along=dot(p,wind),across=dot(p,crossWind);
   float patch=.48+.52*smoothstep(-.85,.65,sin(across*.34+sin(along*.105)-time*.34));
   float phase=along*8.7+sin(across*1.35+time*.34)*1.38-time*3.3;
   float filtered=1.-smoothstep(.34,2.4,fwidth(phase));
   vec2 capillary=wind*cos(phase)*.072*patch*filtered;
   vec2 chop=noise.xy*.27*(1.-smoothstep(35.,175.,surfaceDistance))
      +capillary+crossWind*.044*cos(across*2.2+along*.39-time*1.75)*patch;
   // A rocking hull makes a short waterline disturbance, centred on the draggable boat.
   vec2 boatLocal=p-hullCentre;
   vec2 hullAxes=vec2(dot(boatLocal,vec2(.549,.836)),dot(boatLocal,vec2(-.836,.549)));
   float ring=length(hullAxes/vec2(1.06,3.4));
   float crest=sin(ring*12.-time*2.6)*exp(-2.9*abs(ring-1.17));
   chop+=boatLocal/max(length(boatLocal),.2)*crest*.12;
   vec3 surfaceNormal=normalize(vec3(-g.x+chop.x,1.,-g.y+chop.y));
  `)
  .replace('surfaceNormal.xz * ( 0.001 + 1.0 / distance ) * distortionScale','surfaceNormal.xz * (0.014+0.9/max(15.,distance))*distortionScale')
  .replace('float rf0 = 0.3;','float rf0 = 0.0204;')
  .replace('vec3 outgoingLight = albedo;',`
   float skyward=clamp(dot(surfaceNormal,normalize(vec3(-.3,1.,-.45))),0.,1.);
   vec3 body=mix(vec3(.008,.046,.056),vec3(.029,.112,.128),skyward*skyward*patch);
   float contact=.24*exp(-2.5*abs(ring-.90));
   vec3 reflected=mix(reflectionSample,vec3(.27,.36,.40),.045);
   vec3 outgoingLight=(mix(body,reflected,.10+.84*reflectance)+specularLight*.35)*(1.-contact);
  `);
 const boat=makeBoat(scene);boat.position.set(6,0,-47);
 const grip=document.createElement('button');grip.className='boat-grip';grip.type='button';
 const hint=document.createElement('span');hint.textContent='Drag boat';grip.append(hint);grip.setAttribute('aria-label','Drag the model boat, or use the arrow keys to move it. Home resets the boat.');
 const pin=new T.Vector3(),pointer=new T.Vector2(),ray=new T.Raycaster(),plane=new T.Plane(xyz(0,1,0)),hit=new T.Vector3();
 let taking=null;
 function waterPick(e){
  const box=canvas.getBoundingClientRect();
  pointer.set((e.clientX-box.left)/box.width*2-1,1-(e.clientY-box.top)/box.height*2);
  ray.setFromCamera(pointer,camera);plane.constant=-water.position.y;
  return ray.ray.intersectPlane(plane,hit);
 }
 function moveBoat(x,z){boat.position.x=T.MathUtils.clamp(x,-13,16);boat.position.z=T.MathUtils.clamp(z,-64,-30);render()}
 grip.onpointerdown=e=>{
  if(!e.isPrimary||e.button!==0)return;
  e.stopPropagation();const p=waterPick(e);if(!p)return;
  taking=[e.pointerId,boat.position.x-p.x,boat.position.z-p.z];grip.setPointerCapture(e.pointerId);grip.dataset.grabbing='true';
 };
 grip.onpointermove=e=>{
  if(taking?.[0]!==e.pointerId)return;const p=waterPick(e);if(p)moveBoat(p.x+taking[1],p.z+taking[2]);
 };
 grip.onlostpointercapture=()=>{taking=null;delete grip.dataset.grabbing};
 grip.onkeydown=e=>{
  const offset={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-3],ArrowDown:[0,3]}[e.key];
  if(e.key==='Home'){e.preventDefault();moveBoat(6,-47)}
  if(offset){e.preventDefault();moveBoat(boat.position.x+offset[0],boat.position.z+offset[1])}
 };
 let ready=false;
 function render(){if(!active)return;const w=holder.clientWidth,h=holder.clientHeight;if(w<2||h<2)return;
 if(w!==width||h!==hh){width=w;hh=h;renderer.setSize(w,h,false)}
 camera.aspect=w/h;camera.fov=T.MathUtils.clamp(31/zoom,27,39);camera.updateProjectionMatrix();
 // Prevent a narrow portrait crop from cutting the mast or a wide embed from exposing the plate edge.
 const frameScale=Math.min(1,w/h/1.2);const dist=27/Math.max(.69,frameScale);
 camera.position.set((w/h>1.25?0:4.5)+Math.sin(pan)*2,3.9+tilt,-16+dist+4.4);
 const targetX=(w/h>1.25?0:4.5)+pan*2.3;
 camera.lookAt(targetX,2.75+tilt*.70,-16);
 const bw=Math.max(336,(w/h)*271);const bh=bw*(reverse?0.5625:1641/2437);back.scale.set(bw,bh,1);back.position.set(w/h<1.35&&!reverse?-46:0,(reverse?.75:.661)*bh-bh*.5,-400);back.material.map=reverse?plate:city;
 water.position.y=height-1.65;const by=water.position.y+swell(boat.position.x,boat.position.z,clock);
 boat.position.y=by;const yaw=boat.rotation.y,x=boat.position.x,z=boat.position.z;
 const pitch=(swell(x+Math.sin(yaw)*1.95,z+Math.cos(yaw)*1.95,clock)-swell(x-Math.sin(yaw)*1.95,z-Math.cos(yaw)*1.95,clock))/3.9;
 const roll=(swell(x+Math.cos(yaw)*.82,z-Math.sin(yaw)*.82,clock)-swell(x-Math.cos(yaw)*.82,z+Math.sin(yaw)*.82,clock))/1.64;
 boat.rotation.order='YXZ';boat.rotation.x=-Math.atan(pitch);boat.rotation.z=Math.atan(roll);
 m.uniforms.hullCentre.value.set(x,z);m.uniforms.time.value=clock;renderer.render(scene,camera);
 if(!ready){
  const gl=renderer.getContext(), pixel=new Uint8Array(4);
  for(const y of [.18,.82]){
   gl.readPixels(Math.floor(gl.drawingBufferWidth*.26),Math.floor(gl.drawingBufferHeight*y),1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
   if(gl.isContextLost()||Math.max(...pixel.subarray(0,3))<25){renderer.dispose();throw new Error('Harbour first frame did not render');}
  }
  ready=true;holder.replaceChildren(canvas,grip);
 }
 pin.set(boat.position.x,boat.position.y+.22,boat.position.z).project(camera);
 grip.style.left=T.MathUtils.clamp((1+pin.x)*.5*w,56,w-56)+'px';
 grip.style.top=T.MathUtils.clamp((1-pin.y)*.5*h-25,8,h-57)+'px';
 }
 let drag;canvas.style.touchAction='pan-y';
 canvas.onpointerdown=e=>{drag=[e.pointerId,e.clientX,e.clientY,pan,tilt];canvas.setPointerCapture(e.pointerId)};
 canvas.onpointermove=e=>{if(!drag||e.pointerId!==drag[0])return;pan=T.MathUtils.clamp(drag[3]+(e.clientX-drag[1])/width*2,-1.2,1.2);if(e.pointerType!=='touch')tilt=T.MathUtils.clamp(drag[4]-(e.clientY-drag[2])/hh*2,-.9,.9);render()};
 canvas.onpointerup=canvas.onpointercancel=()=>{drag=null};
 render();new ResizeObserver(render).observe(holder);new IntersectionObserver(([e])=>{visible=e.isIntersecting;if(visible)render()}).observe(holder);
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();active=false;holder.replaceChildren();holder.dataset.fallback='true';document.getElementById('sceneNote').textContent='Photo view. Interactive water is unavailable; the tide table is unchanged.'});
 renderer.setAnimationLoop(t=>{const dt=Math.max(0,Math.min(.065,(t-last)/1000));last=t;if(!active||!visible||paused||document.hidden)return;clock+=dt;render()});
 return{setHeight(v){height=v;render()},setActive(v){active=v;if(v)render()},pause(v){paused=v;render()},zoom(f){zoom=T.MathUtils.clamp(zoom/f,.82,1.13);render()},setView(v){reverse=v;canvas.setAttribute('aria-label',v?'Queens Wharf looking northeast to Devonport. Illustrative animated water and sailboat.':'The Auckland skyline and Harbour Bridge. Illustrative animated water and sailboat.');render()},reset(){zoom=1;pan=0;tilt=0;render()}}
}
