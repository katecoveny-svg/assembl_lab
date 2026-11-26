import { Sky } from './harbour-vendor/Sky.js';
import * as T from './harbour-vendor/three.module.min.js';
import { Water } from './harbour-vendor/Water.js';

// Metres. These are illustrative harbour ripples, deliberately not a weather feed.
const waves=[[.10,.61,.62,.78,1.16],[.05,1.15,-.89,.46,1.64],[.021,2.27,.96,-.28,2.10]];
const number=x=>x.toFixed(5);
const waveGL=waves.map(([a,k,dx,dz,w])=>number(a)+'*sin('+number(k)+'*dot(p,vec2('+number(dx)+','+number(dz)+'))-'+number(w)+'*s)').join('+');
function swell(x,z,t){let y=0;for(const [a,k,dx,dz,w] of waves)y+=a*Math.sin(k*(x*dx+z*dz)-w*t);return y}
const xyz=(x,y,z)=>new T.Vector3(x,y,z);
function makeBoat(scene){
 const boat=new T.Group();scene.add(boat);
 const paint=(c,r=.55,m=.04)=>new T.MeshStandardMaterial({color:c,roughness:r,metalness:m,side:T.DoubleSide});
 const hull=paint(0x172125,.36),under=paint(0xbb342d),stripe=paint(0xc44b42),mahogany=paint(0x2d3335),seam=paint(0x4b3d32),deck=paint(0x43494a),linen=paint(0x29363d,.55),jib=paint(0x46535a,.63),steel=paint(0x9ca7aa,.26,.7),rope=paint(0x59656a,.85);
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
 // Original foiling monohull with asymmetric cant arms and transverse wing tips.
 for(const side of [-1,1]){
  const drop=side<0?-.54:1.01;
  const arm=[[side*.86,.35,.28],[side*1.67,drop+.33,.19],[side*2.56,drop,.10]];
  for(let i=0;i<2;i++)segment(arm[i],arm[i+1],.076,under);
  const wing=add(new T.SphereGeometry(1,20,8),hull);wing.scale.set(.72,.036,.20);wing.position.set(...arm[2]);
 }
 // Deck split around the cockpit instead of a solid box on top of the hull.
 const slot=stations.map(([z])=>z>=-2.31&&z<=-.53?.51:0);
 for(const side of [-1,1]){
  const rail=skin(side,[.982,1,.024]);
  const inner=stations.map(([z,w,h],i)=>[side*slot[i],h+.032,z]);ribbon(rail,inner,deck);
  for(let j=1;j<2;j++){let f=j/2;let line=rail.map((v,i)=>v.map((x,k)=>x*f+inner[i][k]*(1-f)+(k===1?.012:0)));line.slice(1).forEach((p,i)=>segment(line[i],p,.005,seam));}
  for(let i=1;i<stations.length;i++)segment(rail[i-1],rail[i],.029,mahogany);
  ribbon(inner,inner.map(([x,y,z])=>[x*.91,y-.22,z]),mahogany);
 }
 const floor=add(new T.BoxGeometry(.89,.06,1.68),mahogany);floor.position.set(0,.25,-1.4);
 const transom=stations[0];sheet([-.51,.67,-3.34,.51,.67,-3.34,.34,-.06,-3.34,-.34,-.06,-3.34],[0,1,2,0,2,3],mahogany);
 segment([0,.49,.48],[0,6.68,.48],.048,mahogany);segment([0,1.17,.47],[.35,1.28,-2.71],.045,mahogany);
 for(const [x,y,z] of [[0,.73,3.38],[0,.68,-3.28],[-1.03,.45,-.4],[1.03,.45,-.4]])segment([0,6.61,.48],[x,y,z],.010,steel);
 function sail(a,b,c,bulge,m){const p=[],ix=[],N=17,ids=[];function pos(u,v){const w=1-u-v;return [a[0]*w+b[0]*u+c[0]*v+bulge*9*u*v*w,a[1]*w+b[1]*u+c[1]*v,a[2]*w+b[2]*u+c[2]*v-(m===linen?1.06:0)*u*v/Math.max(.055,1-u)]};for(let i=0;i<=N;i++){ids[i]=[];for(let j=0;j<=N-i;j++){ids[i][j]=p.length/3;p.push(...pos(i/N,j/N));}}for(let i=0;i<N;i++)for(let j=0;j<N-i;j++){ix.push(ids[i][j],ids[i+1][j],ids[i][j+1]);if(j<N-i-1)ix.push(ids[i+1][j],ids[i+1][j+1],ids[i][j+1]);}sheet(p,ix,m);for(let t=1;t<=6;t++){let u=t/7;for(let i=0;i<8;i++){let q=pos(u,i/8*(1-u)),r=pos(u,(i+1)/8*(1-u));q[0]+=.005;r[0]+=.005;segment(q,r,.005,rope);}}}
 sail([.012,1.29,.41],[.018,6.47,.44],[.35,1.38,-2.63],.66,linen);sail([.02,.9,3.24],[.013,5.94,.78],[-.31,1.15,-.11],-.61,jib);
 segment([.35,1.28,-2.62],[.27,.51,-2.2],.018,rope);boat.rotation.y=-.99;return boat;
}

export async function createHarbour(holder){
 // Synthesize a tileable normal field from crossing wave trains, entirely in memory.
 const n=128, pixels=new Uint8Array(n*n*4);
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const u=x*2*Math.PI/n,v=y*2*Math.PI/n;
  const sx=.32*Math.cos(4*u+v)+.19*Math.sin(9*u-3*v)+.11*Math.cos(18*u+11*v);
  const sy=.29*Math.sin(2*u-5*v)+.16*Math.cos(7*u+8*v)+.09*Math.sin(14*u-19*v);
  const length=Math.hypot(sx,sy,1),i=(y*n+x)*4;
  pixels.set([127.5*(1+sx/length),127.5*(1+sy/length),127.5*(1+1/length),255],i);
 }
 const normals=new T.DataTexture(pixels,n,n,T.RGBAFormat);
 normals.magFilter=T.LinearFilter;normals.minFilter=T.LinearMipMapLinearFilter;normals.generateMipmaps=true;normals.needsUpdate=true;
 const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
 let shaderFailed=false;
 renderer.debug.onShaderError=()=>{shaderFailed=true};
 const canvas=renderer.domElement;canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Illustrative Waitematā harbour. A foiling monohull floats on a procedural wave field.');
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;
 renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.03;
 const scene=new T.Scene();scene.background=new T.Color(0xa1b2bb);
 const camera=new T.PerspectiveCamera(31,1,.12,1400);
 const light=new T.HemisphereLight(0xf2f6fb,0x708b88,1.75);scene.add(light);
 const sun=xyz(-.34,.16,-.93).normalize(),direct=new T.DirectionalLight(0xffead4,2.1);direct.position.copy(sun).multiplyScalar(100);scene.add(direct);
 let active=true,visible=true,paused=matchMedia('(prefers-reduced-motion: reduce)').matches,clock=0,last=0,height=1.65,zoom=1,pan=0,tilt=0,width=0,hh=0;
 const sky=new Sky();sky.scale.setScalar(850);scene.add(sky);
 sky.material.uniforms.sunPosition.value.copy(sun);sky.material.uniforms.turbidity.value=3.7;sky.material.uniforms.rayleigh.value=1.15;
 // Layer high coastal cloud across the analytic sky. It enters the water reflection too.
 sky.material.fragmentShader=sky.material.fragmentShader.replace('void main() {',`
  float cloudHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*4375.5453);}
  float cloudNoise(vec2 p){
   vec2 cell=floor(p),f=fract(p);f=f*f*(3.-2.*f);
   return mix(mix(cloudHash(cell),cloudHash(cell+vec2(1,0)),f.x),mix(cloudHash(cell+vec2(0,1)),cloudHash(cell+1.),f.x),f.y);
  }
  void main() {`).replace('gl_FragColor = vec4( retColor, 1.0 );',`
  vec2 p=direction.xz/max(.055,direction.y+.12)*vec2(1.5,2.9);
  float bank=.53*cloudNoise(p)+.28*cloudNoise(2.07*p)+.13*cloudNoise(4.31*p)+.06*cloudNoise(8.6*p);
  vec3 clear=mix(vec3(.73,.63,.55),vec3(.12,.39,.63),smoothstep(-.035,.24,direction.y));
  clear+=vec3(.66,.4,.14)*pow(max(0.,dot(direction,vSunDirection)),75.);
  vec3 cumulus=mix(vec3(.54,.58,.64),vec3(1.35,1.27,1.11),smoothstep(.44,.72,bank));
  vec3 coast=mix(clear,cumulus,smoothstep(.48,.65,bank)*smoothstep(-.015,.12,direction.y));
  gl_FragColor=vec4(mix(coast,retColor,.09),1.);
  `);
 // A low volcanic profile across the channel, drawn in receding layers.
 function headland(z,color,profile){
  const points=[],indices=[];
  const colors=[],tint=new T.Color(color);
  for(let row=0;row<12;row++){
   const depth=row/11;
   for(let i=0;i<=320;i++){
    const x=(i/320-.5)*1050;
    const ravine=.62+.38*Math.sin(x*.099+depth*3.2)**2;
    const y=-1.6+(profile(x)+1.6)*Math.sin(depth*Math.PI*.5)*(.82+.18*ravine);
    points.push(x,y,z-depth*16);
    const shade=.68+.24*ravine+.1*Math.sin(x*.7+depth*9);
    colors.push(tint.r*shade,tint.g*shade,tint.b*shade);
    if(i&&row){const k=row*321+i;indices.push(k-322,k-1,k,k-322,k,k-321)}
   }
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();
  scene.add(new T.Mesh(g,new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide})));
 }
 headland(-400,0x98aba9,x=>1.2+3.6*Math.sin(x*.012)**2+2*Math.cos(x*.065)**2);
 headland(-245,0x708d87,x=>.45+16*Math.exp(-((x+37)**2)/1440)+6*Math.exp(-((x+40)**2)/47)+.28*Math.sin(x*1.2));
 headland(-116,0x516e64,x=>-.3+8*Math.exp(-((x-112)**2)/1500)+.3*Math.cos(x*.45));
 normals.wrapS=normals.wrapT=T.RepeatWrapping;
 // Put fine tessellation by the lens and progressively coarsen it towards the horizon.
 const S=144,points=[],indices=[];for(let j=0;j<=S;j++){const u=j/S,depth=28-540*(.085*u+.915*u**3);for(let i=0;i<=S;i++){const x=(i/S-.5)*2;points.push(x*(31+Math.max(0,-depth)*1.18),-depth,0);if(i&&j){let k=j*(S+1)+i;indices.push(k-S-2,k-S-1,k,k-S-2,k,k-1);}}}
 const geom=new T.BufferGeometry();geom.setAttribute('position',new T.Float32BufferAttribute(points,3));geom.setIndex(indices);geom.computeVertexNormals();
 const water=new Water(geom,{textureWidth:1024,textureHeight:512,waterNormals:normals,sunDirection:sun,sunColor:0xf6ede1,waterColor:0x365651,distortionScale:.70,side:T.DoubleSide});
 water.rotation.x=-Math.PI/2;scene.add(water);const m=water.material;
 m.uniforms.size.value=3.4;
 m.uniforms.hullCentre={value:new T.Vector2()};
 const trail=Array.from({length:6},()=>new T.Vector3(0,0,-100));
 m.uniforms.trackPoints={value:trail};
 m.vertexShader=m.vertexShader.replace('void main() {','float surface(vec2 p,float s){return '+waveGL+';}\nvoid main() { vec3 waved=position;waved.z+=surface(vec2(position.x,-position.y),time)* (1.0-smoothstep(50.,150.,abs(position.y)));').replaceAll('vec4( position, 1.0 )','vec4(waved,1.)');
 // Fresnel, reflected skyline/boat and coloured downwelling light. No projected photograph on the water.
 const waveSlope=waves.map(([a,k,dx,dz,w])=>'vec2('+number(dx)+','+number(dz)+')*'+number(a*k)+'*cos('+number(k)+'*dot(p,vec2('+number(dx)+','+number(dz)+'))-'+number(w)+'*time)').join('+');
 m.fragmentShader='uniform vec2 hullCentre; uniform vec3 trackPoints[6];\n'+m.fragmentShader.replace('void main() {','vec2 waveSlope(vec2 p){return '+waveSlope+';}\nvoid main() {')
  .replace('vec4 noise = getNoise( worldPosition.xz * size );','vec4 noise = getNoise( worldPosition.xz * vec2(77.,51.) );')
  .replace('vec3 surfaceNormal = normalize( noise.xzy * vec3( 1.5, 1.0, 1.5 ) );',`
   float surfaceDistance=length(eye-worldPosition.xyz);
   vec2 g=waveSlope(worldPosition.xz)*(1.-smoothstep(55.,145.,surfaceDistance));
   vec2 p=worldPosition.xz;
   // Long swells carry shorter wind ripples. Suppress sub-pixel frequencies towards the shore.
   vec2 wind=vec2(.85,.526),crossWind=vec2(-wind.y,wind.x);
   float along=dot(p,wind),across=dot(p,crossWind);
   float windPatch=.48+.52*smoothstep(-.85,.65,sin(across*.34+sin(along*.105)-time*.34));
   float phase=along*8.7+sin(across*1.35+time*.34)*1.38-time*3.3;
   float filtered=1.-smoothstep(.34,2.4,fwidth(phase));
   vec2 capillary=wind*cos(phase+noise.x*8.)*.034*windPatch*filtered;
   vec2 chop=noise.xy*.27*(1.-smoothstep(35.,175.,surfaceDistance))
      +capillary+crossWind*.044*cos(across*2.2+along*.39-time*1.75)*windPatch;
   // A rocking hull makes a short waterline disturbance, centred on the draggable boat.
   vec2 boatLocal=p-hullCentre;
   vec2 hullAxes=vec2(dot(boatLocal,vec2(.549,.836)),dot(boatLocal,vec2(-.836,.549)));
   float ring=length(hullAxes/vec2(1.06,3.4));
   float crest=sin(ring*12.-time*2.6)*exp(-2.9*abs(ring-1.17));
   chop+=boatLocal/max(length(boatLocal),.2)*crest*.12;
   float wake=0.;
   for(int j=0;j<6;j++){
    vec3 samplePoint=trackPoints[j];float age=time-samplePoint.z;
    if(age>=0.&&age<5.){
     vec2 delta=p-samplePoint.xy;float dist=length(delta);
     float front=dist-(.65+age*.92);
     float band=exp(-front*front*2.7)*(1.-age*.2);
     chop+=delta/max(.3,dist)*sin(front*6.)*band*.075;
     wake+=band*.03;
    }
   }
   vec3 surfaceNormal=normalize(vec3(-g.x+chop.x,1.,-g.y+chop.y));
  `)
  .replace('surfaceNormal.xz * ( 0.001 + 1.0 / distance ) * distortionScale','surfaceNormal.xz * (0.014+0.9/max(15.,distance))*distortionScale')
  .replace('float rf0 = 0.3;','float rf0 = 0.0204;')
  .replace('vec3 outgoingLight = albedo;',`
   float skyward=clamp(dot(surfaceNormal,normalize(vec3(-.3,1.,-.45))),0.,1.);
   vec3 body=mix(vec3(.008,.046,.056),vec3(.029,.112,.128),skyward*skyward*windPatch);
   float contact=.24*exp(-2.5*abs(ring-.90));
   vec3 reflected=mix(reflectionSample,vec3(.27,.36,.40),.045);
   // Filter the GGX lobe by the actual screen-space footprint of the wave normal.
   // At a distance the fine ripples merge into sheen rather than aliasing into dots.
   vec3 dxN=dFdx(surfaceNormal),dyN=dFdy(surfaceNormal);
   float normalVariance=0.5*(dot(dxN,dxN)+dot(dyN,dyN));
   float a2=clamp(.0036+min(normalVariance*.8,.027),.0036,.031);
   vec3 halfVector=normalize(sunDirection+eyeDirection);
   float nH=max(dot(surfaceNormal,halfVector),0.);
   float nL=max(dot(surfaceNormal,sunDirection),0.);
   float nV=max(dot(surfaceNormal,eyeDirection),0.);
   float ggxDen=max(1.+nH*nH*(a2-1.),.001);
   float ggx=a2/(3.141593*ggxDen*ggxDen);
   float visibility=0.5/max(nL*sqrt(nV*nV*(1.-a2)+a2)+nV*sqrt(nL*nL*(1.-a2)+a2),.001);
   float fresnelLight=.0204+.9796*pow(1.-clamp(dot(halfVector,eyeDirection),0.,1.),5.);
   float glint=min(ggx*visibility*fresnelLight*nL,.72);
   vec3 outgoingLight=(mix(body,reflected,.065+.76*reflectance)+sunColor*glint*.82)*(1.-contact)+vec3(.16,.20,.19)*min(wake,.18);
  `);
 const boat=makeBoat(scene);boat.scale.setScalar(1.36);boat.position.set(5,0,-43);
 const grip=document.createElement('button');grip.className='boat-grip';grip.type='button';
 const hint=document.createElement('span');hint.textContent='Drag boat';grip.append(hint);grip.setAttribute('aria-label','Drag the model boat, or use the arrow keys to move it. Home resets the boat.');
 const pin=new T.Vector3(),pointer=new T.Vector2(),ray=new T.Raycaster(),plane=new T.Plane(xyz(0,1,0)),hit=new T.Vector3();
 let taking=null,lastMark=-1,trailIndex=0;
 function moveBoat(x,z){
  const nx=T.MathUtils.clamp(x,-13,16),nz=T.MathUtils.clamp(z,-64,-30);
  if(Math.hypot(nx-boat.position.x,nz-boat.position.z)>.08&&clock-lastMark>.13){
   trail[trailIndex].set(boat.position.x,boat.position.z,clock);trailIndex=(trailIndex+1)%trail.length;lastMark=clock;
  }
  boat.position.x=nx;boat.position.z=nz;render();
 }
 grip.onpointerdown=e=>{
  if(!e.isPrimary||e.button!==0)return;
  e.stopPropagation();
  const hull=pin.set(boat.position.x,water.position.y,boat.position.z).project(camera);
  taking={id:e.pointerId,x:e.clientX,y:e.clientY,u:hull.x,v:hull.y};
  grip.setPointerCapture(e.pointerId);grip.dataset.grabbing='true';
 };
 grip.onpointermove=e=>{
  if(taking?.id!==e.pointerId)return;
  pointer.set(taking.u+2*(e.clientX-taking.x)/width,taking.v-2*(e.clientY-taking.y)/hh);
  ray.setFromCamera(pointer,camera);plane.constant=-water.position.y;
  if(ray.ray.intersectPlane(plane,hit))moveBoat(hit.x,hit.z);
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

 water.position.y=height-1.65;const by=water.position.y+swell(boat.position.x,boat.position.z,clock);
 boat.position.y=by;const yaw=boat.rotation.y,x=boat.position.x,z=boat.position.z;
 const pitch=(swell(x+Math.sin(yaw)*1.95,z+Math.cos(yaw)*1.95,clock)-swell(x-Math.sin(yaw)*1.95,z-Math.cos(yaw)*1.95,clock))/3.9;
 const roll=(swell(x+Math.cos(yaw)*.82,z-Math.sin(yaw)*.82,clock)-swell(x-Math.cos(yaw)*.82,z+Math.sin(yaw)*.82,clock))/1.64;
 boat.rotation.order='YXZ';boat.rotation.x=-Math.atan(pitch);boat.rotation.z=Math.atan(roll);
 m.uniforms.hullCentre.value.set(x,z);m.uniforms.time.value=clock;renderer.render(scene,camera);
 if(!ready){
  if(shaderFailed){renderer.dispose();throw new Error('Harbour shader did not compile')}
  const gl=renderer.getContext(), pixel=new Uint8Array(4);
  for(const y of [.18,.82]){
   gl.readPixels(Math.floor(gl.drawingBufferWidth*.26),Math.floor(gl.drawingBufferHeight*y),1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
   if(gl.isContextLost()||Math.max(...pixel.subarray(0,3))<25){renderer.dispose();throw new Error('Harbour first frame did not render');}
  }
  ready=true;holder.replaceChildren(canvas,grip);
 }
 // Project the actual mast and both ends of the hull. The full sail can be grabbed even above the horizon.
 let left=w,right=0,top=h,bottom=0;
 for(const [x,y,z] of [[0,6.7,.48],[-1,.3,-3.3],[1,.3,-3.3],[0,.7,3.46],[0,-.12,0]]){
  pin.set(x,y,z).applyMatrix4(boat.matrixWorld).project(camera);
  const px=(1+pin.x)*w*.5,py=(1-pin.y)*h*.5;
  left=Math.min(left,px);right=Math.max(right,px);top=Math.min(top,py);bottom=Math.max(bottom,py);
 }
 grip.style.left=(left-8)+'px';grip.style.top=(top-5)+'px';
 grip.style.width=Math.max(48,right-left+16)+'px';grip.style.height=Math.max(48,bottom-top+12)+'px';

 }
 let drag;canvas.style.touchAction='pan-y';
 canvas.onpointerdown=e=>{drag=[e.pointerId,e.clientX,e.clientY,pan,tilt];canvas.setPointerCapture(e.pointerId)};
 canvas.onpointermove=e=>{if(!drag||e.pointerId!==drag[0])return;pan=T.MathUtils.clamp(drag[3]+(e.clientX-drag[1])/width*2,-1.2,1.2);if(e.pointerType!=='touch')tilt=T.MathUtils.clamp(drag[4]-(e.clientY-drag[2])/hh*2,-.9,.9);render()};
 canvas.onpointerup=canvas.onpointercancel=()=>{drag=null};
 render();
 const resize=new ResizeObserver(()=>{if(active)render()});resize.observe(holder);
 let raf=0;
 function tick(now){
  raf=0;if(!active||paused||document.hidden)return;
  if(now-last>=32){clock+=Math.min(.08,(now-last)/1000);last=now;render()}
  raf=requestAnimationFrame(tick);
 }
 function sync(){cancelAnimationFrame(raf);if(active){render();last=performance.now();if(!paused&&!document.hidden)raf=requestAnimationFrame(tick)}}
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();active=false;cancelAnimationFrame(raf);holder.dispatchEvent(new Event('waterlost'))});
 sync();
 return {setHeight(v){height=v;render()},setActive(v){active=v;sync()},pause(v){paused=v;sync()},state(){return {clock,height,boat:[boat.position.x,boat.position.z]}}}
}
