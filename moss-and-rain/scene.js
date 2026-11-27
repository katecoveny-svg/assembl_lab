import * as T from '/assets/vendor/three/three.module.min.js';
import {addStone, stoneSpecs, stoneMaterial, canopy, generator} from './surface.js';
import {addMoss} from './moss.js';

export function createScene(canvas, announce) {
  const gl=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'low-power'});
  const reduce=matchMedia('(prefers-reduced-motion: reduce)'),rng=generator(616);
  const scene=new T.Scene();scene.background=canopy();
  const camera=new T.PerspectiveCamera(37,1,.1,22), ray=new T.Raycaster(), target=new T.Vector3();
  const pixels=new Uint8Array(128*128),map=new T.DataTexture(pixels,128,128,T.RedFormat);
  map.minFilter=map.magFilter=T.LinearFilter;map.needsUpdate=true;
  const u={uWetMap:{value:map},uImpact:{value:new T.Vector3(0,0,0)},uAge:{value:20}};
  const material=stoneMaterial(u),stones=stoneSpecs.map(s=>addStone(scene,s,material));
  const compact=canvas.clientWidth<680;
  addMoss(scene,u,compact);

  const earth=new T.PlaneGeometry(22,16,45,42);
  earth.rotateX(-Math.PI/2);const ep=earth.attributes.position;
  for(let i=0;i<ep.count;i++){const x=ep.getX(i),z=ep.getZ(i);ep.setY(i,-.15+.042*Math.sin(x*3.+z)*Math.cos(z*2.)+.017*rng());}
  earth.computeVertexNormals();scene.add(new T.Mesh(earth,material));
  const pebble=new T.IcosahedronGeometry(1,1);
  // Stone shading uses world positions; place loose gravel with merged, world-space vertices.
  const gravel=[],base=pebble.attributes.position,v=new T.Vector3();
  for(let j=0;j<520;j++){let x=rng()*11-5.5,z=rng()*7-4,sz=.019+rng()**3*.15;
    for(let i=0;i<base.count;i++){v.fromBufferAttribute(base,i);gravel.push(x+v.x*sz,-.112+v.y*sz*.65,z+v.z*sz*.87);}}
  pebble.dispose();const gg=new T.BufferGeometry();gg.setAttribute('position',new T.Float32BufferAttribute(gravel,3));gg.computeVertexNormals();scene.add(new T.Mesh(gg,material));

  const drops=Array.from({length:120},()=>[rng()*5-2.5,rng()*3.1,rng()*3-1.5]);
  const rainGeo=new T.BufferGeometry(),rainV=new T.Float32BufferAttribute(new Float32Array(drops.length*6),3);
  rainGeo.setAttribute('position',rainV);const rain=new T.LineSegments(rainGeo,new T.LineBasicMaterial({color:0xa7bcc3,transparent:true,opacity:.30,depthWrite:false}));rain.frustumCulled=false;rain.visible=false;scene.add(rain);

  const rt=new T.WebGLRenderTarget(1,1,{minFilter:T.LinearFilter,magFilter:T.LinearFilter});
  rt.depthTexture=new T.DepthTexture(1,1,T.UnsignedIntType);
  const post=new T.Scene(), pc=new T.OrthographicCamera(-1,1,1,-1,0,1);
  const photo=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{plate:{value:rt.texture},depth:{value:rt.depthTexture},px:{value:new T.Vector2()},focus:{value:3.8}},vertexShader:
    'varying vec2 uvv;void main(){uvv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`varying vec2 uvv;uniform sampler2D plate,depth; uniform vec2 px;uniform float focus;
    void main(){float z=texture2D(depth,uvv).x;float d=2.2/(22.-21.9*z);
    float blur=clamp((abs(d-focus)-.48)*3.9,0.,7.0);
    vec3 c=texture2D(plate,uvv).rgb*2.;float n=2.;
    for(int i=0;i<12;i++){float j=float(i)+.5;vec2 shift=vec2(cos(j*2.39996),sin(j*2.39996))*sqrt(j/12.)*blur*px;c+=texture2D(plate,uvv+shift).rgb;n+=1.;}
    c/=n;float vignette=1.-.17*pow(length((uvv-.5)*1.4),1.7);
    gl_FragColor=vec4(c*vignette,1.);}`});
  post.add(new T.Mesh(new T.PlaneGeometry(2,2),photo));
  let yaw=.16,zoom=0,goal=0,rainTime=0,visible=true,raf=0,last=0,drag,showerPending=false;
  function arrange(){
    const width=canvas.clientWidth,height=canvas.clientHeight, aspect=width/height;
    const frameWidth=aspect<1?3.05:4.20;
    const dist=frameWidth/(2*Math.tan(Math.PI*camera.fov/360)*aspect)*(1-.42*zoom);
    target.set(-.08-.17*zoom,.61+.31*zoom,.04+.47*zoom);
    camera.aspect=aspect;camera.position.set(target.x+Math.sin(yaw)*dist,target.y+dist*.385,target.z+Math.cos(yaw)*dist*.925);
    camera.lookAt(target);camera.updateProjectionMatrix();camera.updateMatrixWorld();photo.uniforms.focus.value=camera.position.distanceTo(target)-.29;
  }
  function paint(x,z,radius,amount){
    const cx=(x/8+.5)*128,cy=(z/8+.5)*128,r=radius*16;
    for(let j=Math.max(0,Math.floor(cy-r));j<=Math.min(127,cy+r);j++)for(let i=Math.max(0,Math.floor(cx-r));i<=Math.min(127,cx+r);i++){
      const f=Math.max(0,1-Math.hypot(i-cx,j-cy)/r);
      const k=i+j*128;pixels[k]=Math.min(255,pixels[k]+amount*f*f*(3-2*f));
    }
    map.needsUpdate=true;
  }
  function render(){gl.setRenderTarget(rt);gl.render(scene,camera);gl.setRenderTarget(null);gl.render(post,pc);}
  function request(){if(!raf && visible && !document.hidden)raf=requestAnimationFrame(frame);}
  function frame(t){
    raf=0;if(!visible||document.hidden)return;
    const dt=last?Math.min(.06,(t-last)/1000):.016;last=t;u.uAge.value+=dt;
    if(Math.abs(zoom-goal)>.001){zoom=reduce.matches?goal:zoom+(goal-zoom)*(1-Math.exp(-7*dt));arrange();}
    if(showerPending){rainTime+=dt;rain.visible=!reduce.matches&&rainTime<1.05;
      if(rainTime>.17||reduce.matches){const wet=Math.min(255,Math.round(255*(reduce.matches?1:(rainTime-.17)/.83)));for(let i=0;i<pixels.length;i++)pixels[i]=Math.max(pixels[i],wet);map.needsUpdate=true;}
      if(rain.visible){drops.forEach(([x,y,z],i)=>{const top=3.1-((y+rainTime*3.7)%3.1);rainV.setXYZ(i*2,x,top,z);rainV.setXYZ(i*2+1,x+.012,top-.095,z+.011);});rainV.needsUpdate=true;}
      if(rainTime>1.10||reduce.matches){showerPending=false;rain.visible=false;announce('Wet moss. The green leaf tissue shows through.');}
    }
    render();if(showerPending||Math.abs(zoom-goal)>.001||u.uAge.value<1.4)request();else last=0;
  }
  function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;
    const ratio=Math.min(devicePixelRatio,compact?1.25:1.4,1500/w);gl.setPixelRatio(ratio);gl.setSize(w,h,false);rt.setSize(Math.round(w*ratio),Math.round(h*ratio));photo.uniforms.px.value.set(1/(w*ratio),1/(h*ratio));arrange();request();}
  function impact(point){paint(point.x,point.z,.57,680);u.uImpact.value.copy(point);u.uAge.value=reduce.matches?20:0;
    announce('A patch of moss is wet. Compare its green leaves with the dry silver tips.');request();}
  function dropAt(x,y){const rect=canvas.getBoundingClientRect();ray.setFromCamera(new T.Vector2((x-rect.left)/rect.width*2-1,1-(y-rect.top)/rect.height*2),camera);
    const hit=ray.intersectObjects(stones,false)[0];if(hit)impact(hit.point);}
  function reset(){pixels.fill(0);map.needsUpdate=true;rain.visible=false;rainTime=0;showerPending=false;goal=zoom=0;yaw=.16;u.uAge.value=20;arrange();announce('Dry moss. The leaf tips look silver.');request();}
  function shower(){if(showerPending)return;rainTime=0;showerPending=true;request();}
  function closer(){goal=1-goal;request();return !!goal;}
  canvas.onpointerdown=e=>{if(!e.isPrimary||e.button!==0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,yaw,moved:false};canvas.setPointerCapture(e.pointerId);};
  canvas.onpointermove=e=>{if(drag?.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>6)drag.moved=true;
    if(drag.moved&&Math.abs(dx)>Math.abs(dy)){yaw=T.MathUtils.clamp(drag.yaw-dx/canvas.clientWidth*1.7,-.79,.98);arrange();request();}};
  canvas.onpointerup=e=>{if(drag?.id!==e.pointerId)return;const tap=!drag.moved;drag=null;if(tap)dropAt(e.clientX,e.clientY);};canvas.onpointercancel=()=>{drag=null;};
  canvas.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();impact(new T.Vector3(-.12,1,.66));}
    if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();yaw=T.MathUtils.clamp(yaw+(e.key==='ArrowLeft'?-.11:.11),-.79,.98);arrange();request();}};
  const io=new IntersectionObserver(([e])=>{visible=e.isIntersecting;if(visible)request();else{cancelAnimationFrame(raf);raf=0;last=0;}});io.observe(canvas);
  const ro=new ResizeObserver(resize);ro.observe(canvas);document.addEventListener('visibilitychange',request);
  resize();render();
  return {shower,reset,closer,dispose(){io.disconnect();ro.disconnect();document.removeEventListener('visibilitychange',request);cancelAnimationFrame(raf);
    scene.traverse(x=>{x.geometry?.dispose();x.material?.dispose();});scene.background.dispose();photo.dispose();post.children[0].geometry.dispose();map.dispose();rt.dispose();gl.dispose();}};
}
