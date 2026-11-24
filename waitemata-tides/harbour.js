import * as T from './vendor/three.module.min.js';

// Original illustrative harbour section. Vertical units at the wharf are metres.
export function createHarbour(holder) {
  const renderer = new T.WebGLRenderer({antialias:true, alpha:false, powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
  renderer.outputColorSpace=T.SRGBColorSpace;
  const canvas=renderer.domElement;
  canvas.setAttribute('role','img');
  canvas.setAttribute('aria-label','Illustrative harbour with a tide staff, wharf and moored yacht at the selected water level');
  holder.replaceChildren(canvas);
  const scene=new T.Scene();
  scene.fog=new T.FogExp2(0xb8c7ba,0.0029);
  const camera=new T.PerspectiveCamera(38,1,.2,1250);
  const mat=(color,roughness=.82)=>new T.MeshStandardMaterial({color,roughness});
  function mesh(geometry,material,parent=scene){
    const object=new T.Mesh(geometry,material);parent.add(object);return object;
  }
  function bar(x,y,z,w,h,d,material,parent=scene){
    const object=mesh(new T.BoxGeometry(w,h,d),material,parent);object.position.set(x,y,z);return object;
  }
  function rod(a,b,r,material,parent=scene){
    const start=new T.Vector3(...a),end=new T.Vector3(...b),direction=end.clone().sub(start);
    const o=mesh(new T.CylinderGeometry(r,r,direction.length(),8),material,parent);
    o.position.copy(start).lerp(end,.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize());return o;
  }
  const sky=mesh(new T.SphereGeometry(930,40,18),new T.ShaderMaterial({
    side:T.BackSide,depthWrite:false,
    vertexShader:'varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec3 v;void main(){
      vec3 d=normalize(v);float h=max(d.y,0.);
      vec3 c=mix(vec3(.91,.75,.55),vec3(.28,.52,.69),smoothstep(-.04,.5,h));
      float sun=max(dot(d,normalize(vec3(-.36,.14,-1.))),0.);
      c+=vec3(.32,.22,.11)*pow(sun,24.)+vec3(.5,.46,.29)*smoothstep(.99977,.99993,sun);
      gl_FragColor=vec4(c,1.);
      #include <colorspace_fragment>
    }`
  }));
  sky.renderOrder=-10;
  scene.add(new T.HemisphereLight(0xffefe1,0x6c8890,2.1));
  const light=new T.DirectionalLight(0xffdda9,2.05);light.position.set(-50,35,-25);scene.add(light);
  function ridge(depth, width, base, amplitude, color, island=false) {
    const pts=[],colors=[],indices=[];
    for(let i=0;i<=180;i++){
      const x=(i/180-.5)*width;
      const profile=island ? Math.max(0,1-Math.abs((x-11)/92))**1.45 : .36+.20*Math.sin(x*.028)+.14*Math.cos(x*.07);
      const crest=island ? 1.9*Math.exp(-((x-11)**2)/38)+1.1*Math.exp(-((x-5)**2)/12) : 0;
      const y=base+amplitude*profile+crest+profile*(.5*Math.sin(x*.54)+.2*Math.cos(x*1.1));
      pts.push(x,-7,-depth,x,y,-depth);
      const c=new T.Color(color),s=.91+.09*Math.sin(x*.25);colors.push(c.r*.7,c.g*.7,c.b*.7,c.r*s,c.g*s,c.b*s);
      if(i){let n=2*i;indices.push(n-2,n,n-1,n-1,n,n+1);}
    }
    let geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pts,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setIndex(indices);
    mesh(geo,new T.MeshBasicMaterial({vertexColors:true,side:T.DoubleSide}));
  }
  ridge(310,2200,3,20,0x849492);ridge(185,520,1,18,0x476d69,true);
  const water=mesh(new T.PlaneGeometry(1500,1500),new T.ShaderMaterial({
    vertexShader:'varying vec3 p;void main(){vec4 w=modelMatrix*vec4(position,1.);p=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
    fragmentShader:`varying vec3 p;void main(){
      vec2 q=p.xz;float d=length(cameraPosition-p);
      float ripple=sin(q.y*7.8+1.5*sin(q.x*1.34+q.y*1.2)+sin(q.y*2.5+q.x*.74));
      float fine=sin(q.y*15.4+2.2*sin(q.x*1.8+q.y*2.3)+sin(q.x*2.1));
      float broad=sin(q.y*1.24+q.x*.19+.9*sin(q.x*.48));
      float fres=pow(1.-abs(normalize(cameraPosition-p).y),3.);
      vec3 c=mix(vec3(.032,.15,.16),vec3(.26,.43,.45),fres);
      c+=vec3(.038,.062,.059)*(.45*broad+.32*ripple+.23*fine+.55)*(1.-smoothstep(25.,170.,d));
      float shine=exp(-pow((q.x+(.29*abs(q.y))+2.)/(2.+.14*abs(q.y)),2.));
      c+=vec3(.51,.37,.20)*shine*smoothstep(.36,.97,.45*ripple+.27*broad+.28*fine)*(1.-smoothstep(80.,200.,d));
      c=mix(c,vec3(.58,.65,.60),smoothstep(70.,550.,d));gl_FragColor=vec4(c,1.);
      #include <colorspace_fragment>
    }`
  }));water.rotation.x=-Math.PI/2;
  const timbers=[0x866242,0x907153,0x7a5b44,0x80664d,0x9b7854].map(c=>mat(c));
  const pile=mat(0x54483a),wet=mat(0x35473e),iron=mat(0x384449),wood=mat(0xa36941);
  for(const x of [-7.3,-3.7]){
    bar(x,4.13,3,.28,.49,17,pile);
    for(const z of [-4.8,.7,6.2,11]){
      rod([x,-2,z],[x,5,z],.25,pile);rod([x,-1.8,z],[x,2.4,z],.257,wet);
    }
  }
  for(let i=0;i<53;i++)bar(-5.5,4.53,-5.58+i*.326,4.68,.23,.31,timbers[(i*7)%5]);
  for(const z of [-4.8,4.8]){
    rod([-4.2,4.63,z],[-4.2,5.13,z],.12,iron);bar(-4.2,5.08,z,.65,.12,.2,iron);
  }
  rod([-3.65,1,-4.85],[-3.65,4.16,.7],.11,pile);
  // Coarse alternate bands and fine 0.2 m graduations make the tide travel visible.
  const cream=mat(0xf4dfac),oxide=mat(0xad422e);
  bar(-2.81,2.55,-4.64,.38,5.1,.26,cream);
  for(let i=0;i<25;i++){
    bar(-2.81,i*.2+.05,-4.487,i%5===0?.38:.16,.075,.035,oxide);
  }
  const boat=new T.Group();scene.add(boat);boat.position.set(8,0,-23);boat.rotation.y=-.55;
  const sections=[[-3.4,.08,.4],[-2.8,.86,.38],[-1.2,1.17,.38],[1,1.2,.42],[2.6,.84,.57],[3.55,.025,.8]];
  const pts=[],idx=[];
  sections.forEach(([z,w,h],i)=>{
    pts.push(-w,h,z,-w*.77,-.10,z,0,-.43,z,w*.77,-.10,z,w,h,z);
    if(i)for(let k=0;k<4;k++){let a=i*5+k;idx.push(a-5,a,a-4,a,a+1,a-4);}
  });
  const hull=new T.BufferGeometry();hull.setAttribute('position',new T.Float32BufferAttribute(pts,3));hull.setIndex(idx);hull.computeVertexNormals();
  const hullMat=mat(0xeee9d6);hullMat.side=T.DoubleSide;mesh(hull,hullMat,boat);
  bar(0,.4,-.38,1.67,.19,4.5,wood,boat);bar(0,.67,-.12,1.30,.43,1.85,cream,boat);
  bar(0,.70,-.13,1.33,.14,1.25,iron,boat);
  rod([0,.5,.55],[0,7.7,.55],.048,cream,boat);rod([0,1.48,.55],[0,1.51,-2],.054,wood,boat);
  for(const [x,z] of [[0,3.18],[0,-2.9],[-1,0],[1,0]])rod([0,7.4,.55],[x,.52,z],.014,iron,boat);
  function render() {
    const w=holder.clientWidth,h=canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w,h,false);camera.aspect=w/h;
    const compact=w/h<1.6;
    camera.position.set(compact?5.5:7.5,compact?7.9:7.5,compact?17:14);
    camera.lookAt(compact?-2.8:-1,2.65,-10);camera.updateProjectionMatrix();renderer.render(scene,camera);
  }
  new ResizeObserver(render).observe(holder);
  return {setHeight(height){water.position.y=height;boat.position.y=height;render();}};
}
