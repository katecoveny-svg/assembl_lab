import * as T from 'three';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const $=s=>document.querySelector(s);let renderer,scene,camera,controls,model,busy=false;
function draw(){if(renderer)renderer.render(scene,camera);}
function view(top=false){if(!camera)return;camera.position.set(...(top?[0,.95,.001]:[.42,.38,.50]));camera.position.multiplyScalar(Math.max(1,1.5/camera.aspect));controls.target.set(0,.045,0);controls.update();draw();}
$('#reset').onclick=()=>view();$('#top').onclick=()=>view(true);$('#retry').onclick=load;
async function load(){if(busy)return;busy=true;$('#retry').disabled=true;$('#launch').hidden=true;$('#status').textContent='Loading inspected model…';try{
 if(!renderer){renderer=new T.WebGLRenderer({canvas:$('#view'),antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;scene=new T.Scene();camera=new T.PerspectiveCamera(40,1,.01,10);controls=new OrbitControls(camera,$('#view'));controls.enableDamping=false;controls.enablePan=false;controls.minDistance=.3;controls.maxDistance=1.8;controls.maxPolarAngle=Math.PI*.49;controls.addEventListener('change',draw);scene.add(new T.HemisphereLight(0xffffff,0x786275,2.5));const key=new T.DirectionalLight(0xffffff,3);key.position.set(1,2,2);scene.add(key);new ResizeObserver(()=>{const r=$('#stage').getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();view();}).observe($('#stage'));}
 const manifest=await fetch('models/ed-zone.json').then(r=>{if(!r.ok)throw Error('Manifest unavailable');return r.json();});
 const incoming=(await new GLTFLoader().loadAsync('models/ed-zone.glb')).scene;
 if(model){scene.remove(model);const textures=new Set();model.traverse(o=>{o.geometry?.dispose();for(const m of [].concat(o.material||[])){if(m.map)textures.add(m.map);m.dispose();}});textures.forEach(t=>t.dispose());}model=incoming;scene.add(model);view();
 $('#measure').textContent=`Measured export: ${manifest.boundsMetres.map(n=>(n*100).toFixed(1)).join(' × ')} cm (width × height × depth). ${manifest.triangles.toLocaleString()} triangles. GLB ${(manifest.bytes.glb/1e6).toFixed(2)} MB; USDZ ${(manifest.bytes.usdz/1e6).toFixed(2)} MB.`;
 $('#status').textContent='Model ready. Drag to inspect, or choose a view. No automatic motion.';
 const apple=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1),android=/Android/.test(navigator.userAgent),launch=$('#launch');
 // Native launch requires public/reachable HTTPS; loopback deliberately remains browser-only.
 if(location.protocol==='https:'&&!['localhost','127.0.0.1'].includes(location.hostname)&&(apple||android)){
  if(apple&&launch.relList.supports('ar')){launch.rel='ar';launch.href=new URL('models/ed-zone.usdz',location.href).href+'#allowsContentScaling=0';launch.hidden=false;}
  else if(android){const file=new URL('models/ed-zone.glb',location.href).href;launch.href=`intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(file)}&mode=ar_preferred&resizable=false&title=Fictional%20ED%20tabletop#Intent;scheme=https;package=com.google.android.googlequicksearchbox;S.browser_fallback_url=${encodeURIComponent(location.href)};end;`;launch.hidden=false;}
  if(!launch.hidden)$('#ar-note').textContent='Open the static tabletop on this device. Close the native viewer or use Back to return here, then Return to Winter Surge lesson.';
 }
 }catch(e){$('#status').textContent='The model could not load. Use Reload model to retry, or return to the lesson. '+e.message;}finally{busy=false;$('#retry').disabled=false;}}
load();
