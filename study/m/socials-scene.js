import {GLTFLoader} from '../../ar/vendor/three/loaders/GLTFLoader.js';
// The exam desk: a Blender model (assets/models/socials/build_socials.py) whose named nodes the lesson's state drives.
// The board shows the step's own drawing, painted from the same SVG the 2D view uses, so 3D and 2D never disagree.
export function socialsScene(S,L){
  const {THREE,scene,renderer,canvas}=S,host=canvas.parentElement,figure=host.parentElement,s=L.state;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;if(S.bloom)S.bloom.strength=0;
  scene.background=new THREE.Color('#f6f1ea');scene.environmentIntensity=.45;
  S.sun.intensity=2.1;S.sun.position.set(-3,6,4);S.setShadowBox(2.4,[0,.8,0]);S.ground.position.y=0;S.ground.material.opacity=.1;
  const env=new THREE.Scene();env.background=new THREE.Color('#dedad5');
  for(const [x,y,z,sx,sy,sz,c] of [[-4,3,0,.1,6,7,0xffffff],[4,3,-2,.1,6,4,0xe3dcf0],[0,7,0,8,.1,8,0xffffff],[0,2,-5,6,5,.1,0x6b5a72]]){const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),new THREE.MeshBasicMaterial({color:c}));m.position.set(x,y,z);env.add(m)}
  const pm=new THREE.PMREMGenerator(renderer),em=pm.fromScene(env,.04);scene.environment?.dispose?.();scene.environment=em.texture;pm.dispose();
  // camera views: one per step, each framing its part of the desk with the board behind
  const V=(name,pos,target)=>S.view(name,pos,target,{min:1.2,max:8,dur:.8});
  const ZONES={plan:['CLOCK','EXAM_BAG'],graph:['GRAPH'],continuum:['CONTINUUM'],gov:['GOVERNMENT'],inno:['INNOVATION','BALANCE'],words:['CARDS'],para:['PARAGRAPH_TOWER','BALANCE']};
  function frameViews(){const w=new THREE.Vector3(),board=new THREE.Vector3(0,1.3,-.62);
    V('overview',[2.4,2.5,3.4],[0,.95,-.05]);V('test',[2.4,2.5,3.4],[0,.95,-.05]);V('source',[0,1.4,1.75],[0,1.28,-.6]);
    for(const [v,nodes] of Object.entries(ZONES)){const c=new THREE.Vector3();let n=0;nodes.forEach(k=>{if(N[k]){N[k].getWorldPosition(w);c.add(w);n++}});if(!n)continue;c.divideScalar(n);
      // look between the zone and the board, from in front and a little to the zone's side
      const target=c.clone().lerp(board,.3);target.y=1.08;
      const dir=new THREE.Vector3(c.x*.22,.36,1).normalize();V(v,target.clone().addScaledVector(dir,2.7).toArray(),target.toArray())}}
  V('overview',[2.4,2.5,3.4],[0,.95,-.05]);
  // the board's live drawing
  const board=document.createElement('canvas');board.width=1600;board.height=840;const bg=board.getContext('2d');
  const tex=new THREE.CanvasTexture(board);tex.colorSpace=THREE.SRGBColorSpace;tex.flipY=false;tex.anisotropy=renderer.capabilities.getMaxAnisotropy();
  let lastSvg='',painting=false,queued=null;
  function paint(markup){if(markup===lastSvg)return;lastSvg=markup;if(painting){queued=markup;return}painting=true;
    const img=new Image();img.onload=()=>{bg.fillStyle='#FBF7F1';bg.fillRect(0,0,1600,840);bg.drawImage(img,0,0,1600,840);tex.needsUpdate=true;painting=false;if(queued){const q=queued;queued=null;lastSvg='';paint(q)}};
    img.onerror=()=>{painting=false};img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 420" width="1600" height="840">${markup}</svg>`)}
  const pill=S.label({cls:'big'});let pillText='';
  let desk=null,N={},view='',t0=0;
  new GLTFLoader().load('/assets/models/socials/socials-desk.glb',g=>{
    desk=g.scene;desk.traverse(o=>{if(o.name)N[o.name]=o;if(o.isMesh){o.castShadow=!o.material.transparent;o.receiveShadow=true;if(o.material.transparent){o.material.depthWrite=false}}});
    scene.add(desk);frameViews();if(view)S.goView(view,true);
    // tap the desk: people on the continuum, the branches, the balance pans and the flash card all respond
    const tap=(n,fn)=>{if(N[n])S.pick(N[n],()=>{fn();S.api.redraw()})};
    L.PEOPLE.forEach((p,i)=>tap('TOKEN_'+i,()=>{s.sel=p.id;s.view='continuum'}));
    [['BRANCH_LEGISLATIVE','leg'],['BRANCH_EXECUTIVE','exe'],['BRANCH_JUDICIAL','jud'],['BEEHIVE','exe'],['PARLIAMENT_HOUSE','leg']].forEach(([n,f])=>tap(n,()=>{s.feature=f;s.view='gov'}));
    tap('PAN_STRENGTHS',()=>{s.str=Math.min(3,s.str+1);s.lens='eval'});tap('PAN_WEAKNESSES',()=>{s.weak=Math.min(3,s.weak+1);s.lens='eval'});
    tap('CARD_FLIP',()=>{s.flipped=!s.flipped});tap('JETBOAT',()=>{s.idea='jet'});
    const face=N.BOARD_FACE;if(face){face.material=new THREE.MeshBasicMaterial({map:tex,toneMapped:false});face.castShadow=false}
    for(let i=0;i<6;i++){const m=N['BAR_'+i+'_MESH'];if(m){m.material=m.material.clone()}}
    ['BRANCH_LEGISLATIVE','BRANCH_EXECUTIVE','BRANCH_JUDICIAL'].forEach(k=>N[k]&&N[k].traverse(o=>{if(o.isMesh)o.material=o.material.clone()}));
    const bulb=N.BULB_GLASS;if(bulb){bulb.material=bulb.material.clone();bulb.material.emissive=new THREE.Color('#FFD36B')}
    document.getElementById('k-main').setAttribute('aria-hidden','true');figure.classList.add('s3-on');host.style.visibility='visible';
    canvas.setAttribute('aria-label','A 3D exam desk made in Blender. Drag to turn, plus and minus to zoom. The board shows the same drawing as the 2D view.');
    document.documentElement.dataset.socialsAsset='ready';
  },undefined,e=>{host.style.visibility='hidden';figure.classList.remove('s3-on');document.getElementById('k-main').removeAttribute('aria-hidden');document.documentElement.dataset.socialsAsset='fallback';console.warn('Exam desk model unavailable',e)});
  const ease=(a,b,k)=>a+(b-a)*k;
  const SER=['#E8606A','#8E6FD1','#3F9C86'];
  return {resize(){},update(st,stp,dt,t){
    const v=L.view();paint(L.draw());
    if(v!==view){view=v;S.goView(v);t0=t}
    if(!desk)return;const k=Math.min(1,dt*6),T=t-t0;
    // clock: the hour hand marks where Section A ends; the minute hand sweeps
    if(N.HAND_HOUR)N.HAND_HOUR.rotation.z=ease(N.HAND_HOUR.rotation.z,-((s.minsA+5)/120)*Math.PI*2,k);
    if(N.HAND_MIN)N.HAND_MIN.rotation.z=S.REDUCED?0:-t*.6;
    // the 3D graph: the data's first series (or both, side by side) as bars
    const d=L.DATA[s.data],vals=d.series.length>1&&s.gtype==='mbar'?d.cats.slice(0,3).flatMap((c,i)=>d.series.map(x=>x.v[i])):d.series[0].v,mx=Math.max(...d.series.flatMap(x=>x.v));
    for(let i=0;i<6;i++){const b=N['BAR_'+i];if(!b)continue;const want=i<vals.length?Math.max(.01,vals[i]/mx*.34):.001;b.scale.y=ease(b.scale.y,want,k);b.visible=i<vals.length;
      const m=N['BAR_'+i+'_MESH'];if(m)m.material.color.set(d.series.length>1&&s.gtype==='mbar'?SER[i%2]:SER[i%3])}
    // the continuum: people at their positions, you in plum
    L.PEOPLE.forEach((p,i)=>{const o=N['TOKEN_'+i];if(!o)return;o.position.x=ease(o.position.x,p.st/2*.6,k);o.position.y=ease(o.position.y,(p.id===s.sel?.06+Math.abs(Math.sin(t*3))*.02:0)+.035,k)});
    if(N.TOKEN_YOU)N.TOKEN_YOU.position.x=ease(N.TOKEN_YOU.position.x,s.you/2*.6,k);
    // government: the chosen branch lifts and brightens
    const F={leg:'BRANCH_LEGISLATIVE',exe:'BRANCH_EXECUTIVE',jud:'BRANCH_JUDICIAL'}[s.feature];
    ['BRANCH_LEGISLATIVE','BRANCH_EXECUTIVE','BRANCH_JUDICIAL'].forEach(n=>{const o=N[n];if(!o)return;const on=n===F&&v==='gov';o.position.y=ease(o.position.y,on?.05:0,k);o.traverse(m=>{if(m.isMesh){m.material.emissive=m.material.emissive||new THREE.Color();m.material.emissiveIntensity=ease(m.material.emissiveIntensity||0,on?.35:0,k);m.material.emissive.copy(m.material.color)}})});
    if(N.BEEHIVE)N.BEEHIVE.rotation.y=v==='gov'&&s.feature==='exe'&&!S.REDUCED?ease(N.BEEHIVE.rotation.y,Math.sin(t)*.15,k):ease(N.BEEHIVE.rotation.y,0,k);
    // innovation: the jet boat runs on its water, the idea bulb lights for "what" and "why"
    if(N.JETBOAT){const run=v==='inno'&&!S.REDUCED;N.JETBOAT.position.x=run?Math.sin(t*.9)*.12:ease(N.JETBOAT.position.x,0,k);N.JETBOAT.position.y=.03+(run?Math.sin(t*5)*.004:0);N.JETBOAT.rotation.y=run?Math.cos(t*.9)*.25:0}
    if(N.BULB_GLASS)N.BULB_GLASS.material.emissiveIntensity=ease(N.BULB_GLASS.material.emissiveIntensity||0,v==='inno'&&(s.lens==='what'||s.lens==='why')?1.6:0,k);
    // the balance: strengths against weaknesses
    if(N.BALANCE_BEAM){const tilt=Math.max(-.35,Math.min(.35,(s.str-s.weak)*.12));N.BALANCE_BEAM.rotation.z=ease(N.BALANCE_BEAM.rotation.z,tilt,k*.6);['PAN_STRENGTHS','PAN_WEAKNESSES'].forEach(n=>{if(N[n])N[n].rotation.z=-N.BALANCE_BEAM.rotation.z})}
    // definitions: the top card flips
    if(N.CARD_FLIP)N.CARD_FLIP.rotation.x=ease(N.CARD_FLIP.rotation.x,s.flipped?Math.PI:0,k);
    // two paragraphs: one block per part, dropping into the tower
    for(let i=0;i<6;i++){const b=N['BLOCK_'+i];if(!b)continue;const on=i<s.build;b.scale.setScalar(ease(b.scale.x,on?1:.001,k));b.visible=b.scale.x>.01}
    // one readout pill on the active part of the desk
    const at={plan:'CLOCK',graph:'GRAPH',continuum:'CONTINUUM',gov:'GOVERNMENT',inno:'BALANCE',words:'CARDS',para:'PARAGRAPH_TOWER'}[v];
    if(at&&N[at]){const p=new THREE.Vector3();N[at].getWorldPosition(p);p.y+=v==='graph'?.42:v==='gov'?.62:.45;
      const txt=v==='plan'?`A ${s.minsA} min · B ${110-s.minsA} min`:v==='graph'?`${d.series[0].name==='Students'?'Survey':'Data'} · ${d.cats.length} groups`:v==='continuum'?`You: ${s.you<-1.2?'strongly disagree':s.you<-.3?'disagree':s.you<=.3?'unsure':s.you<=1.2?'agree':'strongly agree'}`:v==='gov'?({leg:'Legislature',exe:'Executive',jud:'Judiciary'}[s.feature]||'Parliament'):v==='inno'?`${s.str} strengths · ${s.weak} weaknesses`:v==='words'?(s.flipped?'Definition':'Say it, then flip'):`${s.build} of 6 parts`;
      if(txt!==pillText){pill.set(txt);pillText=txt}pill.at(p).show(true)}else pill.show(false);
  }};
}
