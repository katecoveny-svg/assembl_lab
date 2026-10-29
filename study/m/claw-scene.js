import {GLTFLoader} from '../../ar/vendor/three/loaders/GLTFLoader.js';

// The viewer reads the lesson's state; it never samples an outcome or awards a prize.
export function clawScene(S){
  const {THREE,scene,renderer,canvas}=S;
  const host=canvas.parentElement,figure=host.parentElement;
  const reviewing=new URLSearchParams(location.search).has('review');let frameTimes=[],lastFrame=0,nextReport=0;
  const status=document.getElementById('claw-load-status');
  figure.classList.remove('s3-on');host.style.visibility='hidden';
  if(status)status.textContent='Loading live 3D · Blender render shown while you wait';
  host.querySelector('.s3-hint').textContent='Drag to turn · + / − to zoom · Home to reset';
  canvas.setAttribute('aria-label','Live Blender claw machine. Arrow keys orbit, plus and minus zoom, Home resets the view. Use Play once below to run a trial. Motion illustrates sampled outcomes, not physical grip.');
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  if(S.bloom)S.bloom.strength=0;
  scene.background=new THREE.Color('#f5f0e7');scene.environmentIntensity=.4;
  S.sun.intensity=2;S.sun.shadow.normalBias=.004;S.sun.shadow.bias=-.0001;
  S.setShadowBox(2.6,[0,1,0]);S.sun.position.set(-3,7,4);S.ground.position.y=-.055;S.ground.material.opacity=.12;
  // Broad neutral cards make chrome readable without a downloaded HDR texture.
  const env=new THREE.Scene();env.background=new THREE.Color('#d9d7d3');
  for(const [x,y,z,sx,sy,sz,c] of [[-4,3,0,.1,6,7,0xffffff],[4,3,-2,.1,6,4,0xd6d7e8],[0,7,0,8,.1,8,0xffffff],[0,2,-5,6,5,.1,0x595b71]]){
    const card=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),new THREE.MeshBasicMaterial({color:c}));card.position.set(x,y,z);env.add(card);
  }
  const pmrem=new THREE.PMREMGenerator(renderer),envMap=pmrem.fromScene(env,.04);
  scene.environment.dispose();scene.environment=envMap.texture;pmrem.dispose();env.traverse(o=>{o.geometry?.dispose();o.material?.dispose()});
  const fill=new THREE.DirectionalLight(0xd5e6ff,.7);fill.position.set(3,3,-1);scene.add(fill);
  let selected='machine',asset=null,motion=null,loadError=null;
  let assetBounds=new THREE.Box3(new THREE.Vector3(-.8,-.055,-.7),new THREE.Vector3(.8,2.14,.8));
  const bar=document.createElement('div');bar.className='claw-views';bar.setAttribute('role','group');bar.setAttribute('aria-label','Model camera');
  const setView=(name,instant=false)=>{selected=name;S.goView(name,instant);bar.querySelectorAll('button[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===name)))};
  for(const [name,label] of [['machine','Whole machine'],['detail','Claw detail']]){const b=document.createElement('button');b.type='button';b.dataset.view=name;b.textContent=label;b.setAttribute('aria-pressed',String(name===selected));b.onclick=()=>setView(name);bar.append(b)}
  const home=document.createElement('button');home.type='button';home.textContent='Reset view';home.onclick=()=>setView(selected,true);bar.append(home);host.append(bar);
  const run=document.createElement("button");run.type="button";run.className="claw-run";run.textContent="Run one trial";run.onclick=()=>S.api.runClawTrial();host.append(run);
  function frameViews(w,h){
    const factor=Math.max(1,.74/(w/h));
    const target=new THREE.Vector3(0,1.04,0),direction=new THREE.Vector3(2.6,1.15,3.77).normalize();
    const right=new THREE.Vector3().crossVectors(direction,new THREE.Vector3(0,1,0)).normalize(),up=new THREE.Vector3().crossVectors(right,direction).normalize();
    const tan=Math.tan(THREE.MathUtils.degToRad(S.camera.fov/2));let distance=0;
    for(const x of [assetBounds.min.x,assetBounds.max.x])for(const y of [assetBounds.min.y,assetBounds.max.y])for(const z of [assetBounds.min.z,assetBounds.max.z]){
      const p=new THREE.Vector3(x,y,z).sub(target);distance=Math.max(distance,p.dot(direction)+1.08*Math.max(Math.abs(p.dot(up))/tan,Math.abs(p.dot(right))/(tan*w/h)));
    }
    S.view('machine',target.clone().addScaledVector(direction,distance).toArray(),target.toArray(),{min:2.4,max:9,dur:.65,arc:0});
    S.view('detail',[.48*factor,1.40+.24*factor,1.55*factor],[.05,1.40,.04],{min:.65,max:4,dur:.65,arc:0});
    setView(selected,true);
  }
  frameViews(600,560);
  new GLTFLoader().load('/assets/models/claw/claw-atelier.glb',async g=>{
    try{
      asset=g.scene;
      asset.traverse(o=>{if(o.isMesh){o.castShadow=!o.material.transparent;o.receiveShadow=true;if(o.material.transparent){o.material.depthWrite=false;o.material.side=THREE.DoubleSide;}}});
      scene.add(asset);assetBounds=new THREE.Box3().setFromObject(asset,true);const box=host.getBoundingClientRect();frameViews(box.width,box.height);
      // Validate the artist's versioned hierarchy before displaying live motion.
      if(!asset.getObjectByName('CLAW_MACHINE'))throw new Error('Missing assembl.claw.v2 rig');
      {
        const {createClawMotion}=await import('./claw-motion.js');motion=createClawMotion(asset,THREE);
      }
      document.getElementById('k-main').setAttribute('aria-hidden','true');figure.classList.add('s3-on');host.style.visibility='visible';
      if(status)status.textContent=motion?'Live 3D · motion illustrates probability outcomes':'Live 3D · static geometry reference';
      document.documentElement.dataset.clawAsset='ready';
    }catch(e){fail(e)}
  },undefined,fail);
  function fail(e){loadError=String(e);host.style.display='none';document.getElementById('k-main').removeAttribute('aria-hidden');host.style.visibility='hidden';figure.classList.remove('s3-on');document.documentElement.dataset.clawAsset='fallback';if(status)status.textContent='3D unavailable · static Blender render, live probability controls';console.warn('Claw model unavailable',e)}
  // Read-only review data on a local review URL; never used as learning evidence.
  if(new URLSearchParams(location.search).has('review'))window.clawReview={get status(){return loadError||(!asset?'loading':motion?'animated':'static')},get info(){return {calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,frame:renderer.info.render.frame,pixelRatio:renderer.getPixelRatio(),meshes:asset?countMeshes(asset):0,camera:S.camera.position.toArray(),target:S.controls.target.toArray()}},get pose(){return motion?.inspect?.()}};
  function countMeshes(root){let n=0;root.traverse(o=>{if(o.isMesh)n++});return n}
  return {resize:frameViews,update(s,st,dt,t){
    motion?.update(s,S.REDUCED);
    run.hidden=!st.controls.includes("play1");run.disabled=!!(s.anim&&s.anim.t<1);
    if(reviewing){const now=performance.now();if(lastFrame&&now-lastFrame<250)frameTimes.push(now-lastFrame);lastFrame=now;
      if(t>nextReport){nextReport=t+1;const times=frameTimes.slice(-180).sort((a,b)=>a-b);frameTimes=frameTimes.slice(-180);
        canvas.dataset.review=JSON.stringify({status:loadError||(!asset?'loading':motion?'animated':'static'),...window.clawReview.info,medianFrameMs:times[Math.floor(times.length/2)],p95FrameMs:times[Math.floor(times.length*.95)],pose:motion?.inspect?.()});
      }
    }
  }};
}
