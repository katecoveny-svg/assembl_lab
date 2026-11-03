import {GLTFLoader} from '../../ar/vendor/three/loaders/GLTFLoader.js';
// The Earth & Space scene: the Blender model (assets/models/earthspace/build_earthspace.py) lit by one point light at
// the Sun. Day and night, the Moon's phases and eclipse shadows are real lighting and real shadows.
// Three places in one world: the orrery at the origin, a star line-up at z = -120, and a distance ruler at z = +120.
export function earthspaceScene(S,L){
  const {THREE,scene,renderer,camera,canvas}=S,host=canvas.parentElement,figure=host.parentElement,s=L.state;
  const D2R=Math.PI/180,ORB=11,MO=3.2,SUN_R=2.2,GAL=new THREE.Vector3(0,0,-120),RUL=new THREE.Vector3(0,0,120);
  // ---------------------------------------------------------------- space: no paper floor, no studio lights
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  scene.background=new THREE.Color('#03050D');scene.fog=null;scene.environment=null;S.ground.visible=false;
  scene.traverse(o=>{if(o.isLight)o.intensity=0});S.sun.castShadow=false;
  if(S.bloom){S.bloom.threshold=.8;S.bloom.strength=.85;S.bloom.radius=.55}
  scene.add(new THREE.AmbientLight(0x6670A0,.06));
  const light=new THREE.PointLight(0xFFF4E6,3.4,0,0);light.castShadow=true;light.shadow.mapSize.set(S.HQ?2048:1024,S.HQ?2048:1024);
  light.shadow.camera.near=.5;light.shadow.camera.far=40;light.shadow.bias=-.0015;light.shadow.normalBias=.02;scene.add(light);
  // ---------------------------------------------------------------- stars in the background, thicker along a Milky Way band
  {const n=S.mobile?2200:4200,pos=new Float32Array(n*3),col=new Float32Array(n*3),c=new THREE.Color(),band=new THREE.Vector3(.3,1,.25).normalize();
    for(let i=0;i<n;i++){let v=new THREE.Vector3().randomDirection();if(i%3===0){v.addScaledVector(band,-v.dot(band)*.85).normalize()}
      v.multiplyScalar(320);pos.set([v.x,v.y,v.z],i*3);const k=Math.random();c.setHSL(k<.15?.6:k<.3?.08:.12,k<.3?.6:.1,.55+Math.random()*.45);col.set([c.r,c.g,c.b],i*3)}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('color',new THREE.BufferAttribute(col,3));
    const pts=new THREE.Points(g,new THREE.PointsMaterial({size:1.6*Math.min(2,devicePixelRatio||1),sizeAttenuation:false,vertexColors:true,depthWrite:false}));pts.renderOrder=-10;scene.add(pts)}
  // a soft glow for the Sun and stars (works with or without bloom)
  const glowTex=(()=>{const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d'),r=g.createRadialGradient(64,64,0,64,64,64);
    r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.18,'rgba(255,255,255,.55)');r.addColorStop(.45,'rgba(255,255,255,.12)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,128,128);
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t})();
  const glow=(col,size,op=1)=>{const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:new THREE.Color(col),blending:THREE.AdditiveBlending,transparent:true,depthWrite:false,opacity:op}));sp.scale.setScalar(size);return sp};
  const galaxyTex=(()=>{const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');g.translate(128,128);
    const r=g.createRadialGradient(0,0,0,0,0,40);r.addColorStop(0,'rgba(255,240,210,1)');r.addColorStop(1,'rgba(255,220,180,0)');g.fillStyle=r;g.fillRect(-128,-128,256,256);
    for(let i=0;i<1600;i++){const arm=i%2,a=Math.random()*4.2,rad=12+a*26+Math.random()*10,th=a*1.25+arm*Math.PI+Math.random()*.4;g.fillStyle=`rgba(${190+Math.random()*60|0},${200+Math.random()*50|0},255,${.25+Math.random()*.5})`;g.fillRect(Math.cos(th)*rad,Math.sin(th)*rad,1.6,1.6)}
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t})();
  // ---------------------------------------------------------------- views
  const V=(name,pos,target,o={})=>S.view(name,pos,target,{min:1.5,max:80,dur:1.4,...o});
  V('stars',[GAL.x,GAL.y+3.2,GAL.z+27],[GAL.x,GAL.y-.2,GAL.z],{max:60});
  V('distance',[RUL.x,RUL.y+7,RUL.z+46],[RUL.x,RUL.y-1,RUL.z],{max:90});
  V('test',[0,15,30],[0,0,0],{max:90});
  let N={},ready=false,lastKey='';
  const pills={main:S.label({cls:'big'}),stops:[]};
  const tmp=new THREE.Vector3(),P=new THREE.Vector3(),U=new THREE.Vector3(),W=new THREE.Vector3(),UP=new THREE.Vector3(0,1,0);
  const theta=m=>Math.PI+2*Math.PI*(L.MIDDAY[m]-172)/365.25;  // June solstice at -x, the north pole tilted towards +x
  const earthPos=(m,out)=>{const th=theta(m);return out.set(ORB*Math.cos(th),0,-ORB*Math.sin(th))};
  function frame(view){earthPos(s.month,P);U.copy(P).multiplyScalar(-1).normalize();W.crossVectors(U,UP).normalize();
    if(view==='day')V('day',P.clone().addScaledVector(W,6.2).addScaledVector(U,1.6).add(new THREE.Vector3(0,-2.0,0)).toArray(),P.toArray(),{max:30});
    if(view==='moon')V('moon',P.clone().addScaledVector(U,-.6).add(new THREE.Vector3(0,16.5,0)).toArray(),P.toArray(),{max:40});
    if(view==='eclipse')V('eclipse',P.clone().addScaledVector(W,9).addScaledVector(U,8.5).add(new THREE.Vector3(0,2.6,0)).toArray(),P.clone().addScaledVector(U,3.4).add(new THREE.Vector3(0,-.4,0)).toArray(),{max:50})}
  // ---------------------------------------------------------------- the Blender model
  let atm=null,tide=null,moonOrbit=null,pulse=null,umbra=null;const nightUni={value:new THREE.Vector3(1,0,0)};const stopObjs=[];
  const PLACE={orrery:new THREE.Group(),gallery:new THREE.Group(),ruler:new THREE.Group()};Object.values(PLACE).forEach(g=>scene.add(g));
  new GLTFLoader().load('/assets/models/earthspace/earthspace.glb',g=>{
    const root=g.scene;root.traverse(o=>{if(o.name)N[o.name]=o;if(o.isMesh){o.castShadow=!o.material.transparent;o.receiveShadow=true;if(o.material.transparent)o.material.depthWrite=false}});
    PLACE.orrery.add(root);
    // the Sun: bright, unlit, glowing; it neither casts nor receives shadows
    const sunMat=N.SUN.material,sunMap=sunMat.map||sunMat.emissiveMap;N.SUN.material=new THREE.MeshBasicMaterial({map:sunMap,color:new THREE.Color(1.6,1.45,1.25),toneMapped:false});
    N.SUN.scale.setScalar(SUN_R);N.SUN.castShadow=N.SUN.receiveShadow=false;PLACE.orrery.add(glow('#FFB45A',SUN_R*5.5,.9),glow('#FFE9B8',SUN_R*2.9,1));
    // Earth: a little ocean shine, clouds that drift, an atmosphere rim lit on the day side
    const em=N.EARTH.material;em.roughness=1;em.metalness=0;
    // city lights (NASA Black Marble) glow only on the night side: the emissive map fades out where the Sun is up
    if(em.emissiveMap){em.emissive=new THREE.Color(1,1,1);em.emissiveIntensity=1.7;em.onBeforeCompile=sh=>{sh.uniforms.sunView=nightUni;
      sh.fragmentShader='uniform vec3 sunView;\n'+sh.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n\ttotalEmissiveRadiance*=1.0-smoothstep(-0.12,0.2,dot(normal,sunView));')};em.needsUpdate=true}
    N.CLOUDS.castShadow=false;N.CLOUDS.material.depthWrite=false;N.CLOUDS.renderOrder=2;
    atm=new THREE.Mesh(new THREE.SphereGeometry(1.045,64,48),new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
      uniforms:{sunDir:{value:new THREE.Vector3(1,0,0)}},
      vertexShader:'varying vec3 vN;varying vec3 vV;varying vec3 vW;void main(){vN=normalize(normalMatrix*normal);vW=normalize(mat3(modelMatrix)*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
      fragmentShader:'uniform vec3 sunDir;varying vec3 vN;varying vec3 vV;varying vec3 vW;void main(){float f=pow(1.-max(0.,dot(vN,vV)),2.6);float day=smoothstep(-.25,.35,dot(vW,sunDir));gl_FragColor=vec4(vec3(.32,.58,1.)*f*1.6*day,1.);}'}));
    atm.renderOrder=3;N.EARTH_TILT.add(atm);
    N.EARTH_TILT.rotation.z=-23.44*D2R;
    const pinM=N.NZ_PIN_HEAD.material;pinM.emissive=new THREE.Color('#E8606A');pinM.emissiveIntensity=2.2;N.NZ_PIN_HEAD.castShadow=N.NZ_PIN_STALK.castShadow=false;
    // tides: a see-through water shell stretched towards (and away from) the Moon
    tide=new THREE.Mesh(new THREE.SphereGeometry(1.03,64,48),new THREE.MeshPhysicalMaterial({color:'#8FD0FF',emissive:'#3A8FD0',emissiveIntensity:.5,transparent:true,opacity:.36,roughness:.1,clearcoat:1,depthWrite:false}));tide.castShadow=false;tide.visible=false;N.EARTH_SYSTEM.add(tide);
    // orbits
    const ring=(r,col,op)=>{const pts=[];for(let i=0;i<=256;i++){const a=i/256*Math.PI*2;pts.push(new THREE.Vector3(Math.cos(a)*r,0,Math.sin(a)*r))}return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:col,transparent:true,opacity:op,depthWrite:false}))};
    PLACE.orrery.add(ring(ORB,'#7F8BC9',.35));moonOrbit=ring(MO,'#C9C6E6',.4);N.EARTH_SYSTEM.add(moonOrbit);
    N.MOON.material.roughness=1;N.EARTH_SYSTEM.add(N.MOON);
    {const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d'),r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(0,0,0,.92)');r.addColorStop(.45,'rgba(0,0,0,.75)');r.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=r;g.fillRect(0,0,64,64);
      const t=new THREE.CanvasTexture(c);umbra=new THREE.Mesh(new THREE.CircleGeometry(.42,40),new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false}));umbra.renderOrder=4;umbra.visible=false;N.EARTH_SYSTEM.add(umbra)}
    // the star line-up, smallest to biggest, at sizes squashed to fit (white dwarf … red supergiant)
    const order=[...L.STARS].sort((a,b)=>a.r-b.r);let x=0;const xs={};order.forEach((st,i)=>{x+=(i?order[i-1].r:0)+st.r+1.3;xs[st.id]=x});const mid=(x+order.at(-1).r)/2;
    const starMat=col=>new THREE.ShaderMaterial({uniforms:{color:{value:new THREE.Color(col)},gain:{value:1},map:{value:sunMap}},toneMapped:false,
      vertexShader:'varying vec3 vN;varying vec3 vV;varying vec2 vU;void main(){vU=uv;vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
      fragmentShader:'uniform vec3 color;uniform float gain;uniform sampler2D map;varying vec3 vN;varying vec3 vV;varying vec2 vU;void main(){float g=dot(texture2D(map,vU*vec2(2.,2.)).rgb,vec3(.3,.59,.11));float mu=max(0.,dot(vN,vV));vec3 c=color*(.62+.55*g)*(.38+.72*pow(mu,.55))*gain;gl_FragColor=vec4(c,1.);}'});
    L.STARS.forEach(st=>{const m=N[st.node];if(!m)return;PLACE.gallery.add(m);m.material=starMat(st.col);
      m.castShadow=m.receiveShadow=false;m.scale.setScalar(st.r);m.position.set(GAL.x+xs[st.id]-mid,GAL.y,GAL.z);const gl=glow(st.col,st.r*2.7,.5);gl.position.copy(m.position);PLACE.gallery.add(gl);m.userData.glow=gl;
      S.pick(m,()=>{s.star=st.id;s.view='stars'})});
    // the distance ruler: Earth at the left, each place on a squashed (logarithmic) line
    const X=km=>RUL.x-19+(Math.log10(km)-5)/(19.6-5)*40;
    const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(RUL.x-21.5,RUL.y,RUL.z),new THREE.Vector3(RUL.x+21.5,RUL.y,RUL.z)]),new THREE.LineBasicMaterial({color:'#7F8BC9',transparent:true,opacity:.55}));PLACE.ruler.add(line);
    const mini=(src,r)=>{const m=new THREE.Mesh(src.geometry,src.material);m.scale.setScalar(r);m.castShadow=m.receiveShadow=false;PLACE.ruler.add(m);return m};
    const e=mini(N.EARTH,.7);e.position.set(RUL.x-21.5,RUL.y,RUL.z);e.material=new THREE.MeshBasicMaterial({map:N.EARTH.material.map});
    const icons={moon:()=>{const m=mini(N.MOON,.55/.273);m.material=new THREE.MeshBasicMaterial({map:N.MOON.material.map,color:new THREE.Color(.8,.8,.8)});return m},
      sun:()=>{const m=mini(N.SUN,.75);const gl=glow('#FFB45A',3.4,.8);m.add(gl);gl.scale.setScalar(4.5);return m},
      neptune:()=>{const m=new THREE.Mesh(new THREE.SphereGeometry(.5,32,24),new THREE.MeshBasicMaterial({color:'#4B78E0'}));PLACE.ruler.add(m);return m},
      proxima:()=>{const m=glow('#FF7A50',2.2,1);PLACE.ruler.add(m);return m},
      centre:()=>{const m=new THREE.Sprite(new THREE.SpriteMaterial({map:galaxyTex,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));m.scale.setScalar(4.2);PLACE.ruler.add(m);return m},
      andromeda:()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:galaxyTex,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide}));m.scale.set(5.2,5.2,1);m.rotation.set(-1.1,0,.6);PLACE.ruler.add(m);return m}};
    L.DIST.forEach((d,i)=>{const o=icons[d.id]();o.position.set(X(d.km),RUL.y,RUL.z);stopObjs.push(o);
      const tick=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,1.2,8),new THREE.MeshBasicMaterial({color:'#C9C6E6'}));tick.position.set(X(d.km),RUL.y-.9,RUL.z);PLACE.ruler.add(tick);
      S.pick(o.isSprite?tick:o,()=>{s.far=i;s.view='distance';s.pulse=-1});
      const p=S.label({off:[8,i%2?50:28],lead:false});p.set(d.n.replace('The ','')).at(new THREE.Vector3(X(d.km),RUL.y,RUL.z));pills.stops.push(p)});
    pulse=glow('#DDEBFF',2.2,1);pulse.visible=false;PLACE.ruler.add(pulse);
    ready=true;frame(L.view());S.goView(L.view()==='test'?'test':L.view(),true);
    document.getElementById('k-main').setAttribute('aria-hidden','true');figure.classList.add('s3-on');host.style.visibility='visible';
    canvas.setAttribute('aria-label','A realistic 3D Earth, Moon and Sun made in Blender, lit by the Sun, with six types of star and a ruler of distances out to the Andromeda Galaxy. Drag to turn, plus and minus to zoom.');
    document.documentElement.dataset.earthspaceAsset='ready';
  },undefined,e=>{host.style.visibility='hidden';figure.classList.remove('s3-on');document.getElementById('k-main').removeAttribute('aria-hidden');document.documentElement.dataset.earthspaceAsset='fallback';console.warn('Earth and space model unavailable',e)});

  const ease=(a,b,k)=>a+(b-a)*k;let view='';
  return {resize(){},update(st,stp,dt,t){
    if(!ready)return;const v=L.view(),k=Math.min(1,dt*5);
    PLACE.gallery.visible=v==='stars';PLACE.ruler.visible=v==='distance';PLACE.orrery.visible=!PLACE.gallery.visible&&!PLACE.ruler.visible;
    // re-frame when the view changes, or when the month moves the Earth along its orbit
    const key=v+'|'+(['day','moon','eclipse'].includes(v)?s.month:'');if(key!==lastKey){lastKey=key;frame(v);S.goView(v);view=v}
    // ---- Earth: position on its orbit, spin from the clock (Wellington faces the Sun at noon), clouds drift
    const th=theta(s.month);earthPos(s.month,P);N.EARTH_SYSTEM.position.copy(P);
    const sunAz=th+Math.PI,drift=(v==='day'||S.REDUCED)?0:t*.12;
    N.EARTH_SPIN.rotation.y=sunAz+(s.hour-12)*15*D2R-174.8*D2R+drift;
    N.CLOUDS.rotation.y=S.REDUCED?0:t*.008;
    if(atm)atm.material.uniforms.sunDir.value.copy(N.EARTH_SYSTEM.position).multiplyScalar(-1).normalize();
    nightUni.value.copy(N.EARTH_SYSTEM.position).multiplyScalar(-1).normalize().transformDirection(camera.matrixWorldInverse);
    // ---- Moon: angle from the phase (new moon sits between Earth and Sun), tidally locked, off the plane when not lined up
    const psi=sunAz+2*Math.PI*s.moonDay/L.LUNAR;const off=s.lined?0:1.45*Math.cos(2*Math.PI*s.moonDay/L.LUNAR);
    N.MOON.position.set(Math.cos(psi)*MO,off,-Math.sin(psi)*MO);N.MOON.rotation.y=psi+Math.PI;
    if(moonOrbit){moonOrbit.rotation.set(0,sunAz,ease(moonOrbit.rotation.z,s.lined?0:Math.asin(1.45/MO),k));moonOrbit.visible=v!=='day'}
    // lunar eclipse: the Moon glows red in Earth's shadow (sunlight bent through Earth's atmosphere)
    const ecl=L.eclipseNow(),mm=N.MOON.material;mm.emissive=mm.emissive||new THREE.Color();mm.emissive.set('#7A2410');mm.emissiveIntensity=ease(mm.emissiveIntensity||0,ecl==='lunar'?.55:0,k);
    if(umbra){umbra.visible=ecl==='solar';if(umbra.visible){const n=N.MOON.position.clone().normalize();umbra.position.copy(n).multiplyScalar(1.016);umbra.lookAt(N.EARTH_SYSTEM.localToWorld(n.clone().multiplyScalar(3)))}}
    // ---- tides: two bulges lined up with the Moon, bigger at spring tides
    if(tide){tide.visible=v==='eclipse'&&s.ev==='tides';if(tide.visible){const sp=Math.abs(Math.cos(4*Math.PI*s.moonDay/L.LUNAR));tide.rotation.y=psi;tide.scale.set(1.13+.09*sp,.98,.98)}}
    // ---- the star line-up: the chosen star breathes, the rest dim a little
    L.STARS.forEach(x=>{const m=N[x.node];if(!m)return;const on=x.id===s.star;const want=x.r*(on?1+(S.REDUCED?0:Math.sin(t*2)*.03):1);m.scale.setScalar(ease(m.scale.x,want,k));
      m.material.uniforms.gain.value=ease(m.material.uniforms.gain.value,on?1.75:.85,k);if(m.userData.glow)m.userData.glow.material.opacity=ease(m.userData.glow.material.opacity,on?.75:.25,k)});
    // ---- the light pulse along the ruler
    if(pulse){const d=L.DIST[s.far],x1=stopObjs[s.far]?.position.x??0,x0=RUL.x-21.5,el=s.pulse>0?(performance.now()-s.pulse)/1000:-1;
      if(el>=0&&el<3.8){pulse.visible=v==='distance';const f=Math.min(1,el/3),e2=f*f*(3-2*f);pulse.position.set(x0+(x1-x0)*e2,RUL.y,RUL.z);pulse.scale.setScalar(2.2+Math.sin(t*12)*.25)}else pulse.visible=false}
    pills.stops.forEach((p,i)=>{p.show(v==='distance');p.cls(i===s.far?'big':'')});
    // ---- one readout pill on the thing that matters in this view
    let at=null,txt='';
    if(v==='stars'){const x=L.STARS.find(y=>y.id===s.star),m=N[x.node];at=m.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,x.r+.3,0));txt=`${x.n.replace(' (our Sun)','')} · ${x.temp.replace('about ','')}`}
    else if(v==='distance'){const d=L.DIST[s.far];at=stopObjs[s.far].position.clone().add(new THREE.Vector3(0,1.9,0));const el=s.pulse>0?(performance.now()-s.pulse)/1000:-1;txt=el>=0&&el<3?'Light on its way…':`Light takes ${d.light}`}
    else if(v==='day'){at=N.NZ_PIN_HEAD.getWorldPosition(new THREE.Vector3());const n=at.clone().sub(N.EARTH_SYSTEM.position).normalize(),sd=N.EARTH_SYSTEM.position.clone().multiplyScalar(-1).normalize();txt=`Wellington · ${L.clock(s.hour)} · ${n.dot(sd)>0?'day':'night'}`}
    else if(v==='moon'){at=N.MOON.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,.5,0));txt=L.phase(s.moonDay)}
    else if(v==='eclipse'){at=(s.ev==='tides'?N.EARTH_SYSTEM.position.clone().add(new THREE.Vector3(0,1.4,0)):N.MOON.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,.5,0)));txt=s.ev==='tides'?'High tide under the Moon, and opposite':ecl?`${ecl==='solar'?'Solar':'Lunar'} eclipse`:'No eclipse'}
    if(at){pills.main.set(txt).at(at).show(true)}else pills.main.show(false);
  }};
}
