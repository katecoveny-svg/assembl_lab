import * as T from 'three';
import {createCityModel} from './city-model.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
export async function cityScene(canvas,{onSelect=()=>{},onReady=()=>{}}={}){
 const renderer=new T.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:new URLSearchParams(location.search).has('capture')});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.25));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;
 const scene=new T.Scene();scene.background=new T.Color('#ede5e9');scene.add(new T.HemisphereLight('#fffaf1','#5f485b',2));const light=new T.DirectionalLight('#ffffff',2.7);light.position.set(-.2,.6,-.1);scene.add(light);
 const camera=new T.PerspectiveCamera(38,1,.0001,5),controls=new OrbitControls(camera,canvas);controls.minDistance=.012;controls.maxDistance=1.8;controls.maxPolarAngle=Math.PI*.48;controls.enableDamping=false;
 const {root:model,data,groups,triangles,landmark,landmarkMesh}=await createCityModel();scene.add(model);
 const c=data.centre,ground=.0192,views={city:{t:[c[0],ground,c[1]],p:[c[0]+.038,.051,c[1]-.059]},waterfront:{t:[c[0],ground,c[1]-.012],p:[c[0]-.040,.039,c[1]-.055]},overview:{t:[0,.018,0],p:[.65,.65,.8]}};
 views.skytower={t:[landmark.centre[0],landmark.ground+164*data.scale,landmark.centre[1]],p:[landmark.centre[0]+.012,landmark.ground+.012,landmark.centre[1]-.018]};
 const render=()=>renderer.render(scene,camera);let current='city';function view(id){current=id;const v=views[id]||views.city;controls.target.fromArray(v.t);camera.position.fromArray(v.p);if(canvas.clientWidth<420){camera.position.sub(controls.target).multiplyScalar(1.35).add(controls.target);}controls.update();render();}
 const resize=()=>{renderer.setSize(canvas.clientWidth,canvas.clientHeight,false);camera.aspect=canvas.clientWidth/canvas.clientHeight;camera.updateProjectionMatrix();view(current)};new ResizeObserver(resize).observe(canvas);controls.addEventListener('change',render);controls.listenToKeyEvents(canvas);
 const ray=new T.Raycaster();let down;canvas.addEventListener('pointerdown',e=>down=[e.clientX,e.clientY]);canvas.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;const r=canvas.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2),camera);const hit=ray.intersectObjects(Object.values(groups).filter(m=>m.visible))[0];if(hit){const id=hit.object.geometry.attributes.feature.getX(hit.face.a);onSelect(data.buildings[id]);}});
 resize();view('city');onReady({landmarkParts:landmark.parts.length,buildings:data.buildings.length,triangles,drawCalls:renderer.info.render.calls,counts:data.counts});
 return {view,data,model,landmark,setLayer:(kind,visible)=>{groups[kind].visible=visible;if(kind==='tagged')landmarkMesh.visible=visible;render()},render};
}
