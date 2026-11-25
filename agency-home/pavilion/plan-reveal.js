export function setupPlanReveal(asset) {
 const section=document.querySelector('#plan-study'), field=document.querySelector('#plan-field');
 const host=document.querySelector('#plan-geometry'), slider=document.querySelector('#plan-scrub');
 const top=field.querySelector('.section-still'), beauty=field.querySelector('.beauty-still');
 const paper=field.querySelector('.plan-paper'), turn=document.querySelector('#turn-cutaway');
 const output=document.querySelector('#plan-value'), heading=document.querySelector('#folio-stage');
 const hint=document.querySelector('#model-hint'), mode=document.querySelector('#section-mode');
 let orbit=false,engine,loading,pointer=null,x=50,y=50;
 function responsiveModel(image,stem){
  image.sizes='(max-width: 680px) 100vw, min(100vw, 116svh)';
  image.srcset=asset(stem+'-phone.webp')+' 539w, '+asset(stem+'.webp')+' 1060w';
  image.src=asset(stem+'.webp');
 }
 function images(){
  if(!top.hasAttribute('src'))responsiveModel(top,'section16c');
  if(!paper.hasAttribute('src'))paper.src=asset('16c-ink.webp');
 }
 function lens(left,down){
  x=Math.round(Math.max(0,Math.min(100,left)));y=Math.round(Math.max(0,Math.min(100,down)));
  field.style.setProperty('--px',x+'%');field.style.setProperty('--py',y+'%');
  field.classList.add('has-lens');slider.value=x;output.value=x+'%';
  slider.setAttribute('aria-valuetext',x+' percent across, '+y+' percent down the floor plan');
 }
 function atPoint(e){
  const r=field.getBoundingClientRect();lens(100*(e.clientX-r.left)/r.width,100*(e.clientY-r.top)/r.height);
 }
 function hideLens(){field.classList.remove('has-lens')}
 function layout(){
  hideLens();pointer=null;field.classList.toggle('orbiting',orbit);
  // The first overhead plate is a capture of this projection. After opening 3D,
  // keep the live orthographic model under the same fixed drawing coordinates.
  host.hidden=!orbit&&!engine;beauty.hidden=!orbit||!!engine;top.hidden=orbit||!!engine;
  slider.disabled=orbit;turn.setAttribute('aria-pressed',String(orbit));
  turn.textContent=orbit?'Reveal the 16C plan':'Turn the cutaway';
  heading.textContent=orbit?'Furnished cutaway':'Model and original plan';
  hint.firstChild.textContent=orbit?(engine?'Drag or use the arrow keys to turn.':'Furnished view. '):'Move over the house to reveal its plan. On touch, drag sideways.';
  field.setAttribute('aria-label',orbit?'Furnished 16C cutaway. Use arrow keys to turn.':'16C model. Arrow keys move the circular plan lens. Escape clears it.');
  if(engine){engine.stage(orbit?1:0);engine.reveal(.5,.5,0,1)}
 }
 function fallback(){
  engine=null;host.replaceChildren();section.dataset.renderer='still';mode.textContent=' · Still view';layout();
 }
 async function openModel(){
  const choice=new URLSearchParams(location.search).get('renderer');
  if(choice==='still'){fallback();return}
  try{
   const {sectionModel}=await import('./section-model.js');
   try{engine=await sectionModel(host,asset,choice==='webgl',fallback)}
   catch(error){if(choice==='webgl')throw error;engine=await sectionModel(host,asset,true,fallback)}
   section.dataset.renderer=engine.backend;layout();
  }catch{fallback()}
 }
 turn.onclick=()=>{
  orbit=!orbit;
  if(orbit&&!beauty.hasAttribute('src'))responsiveModel(beauty,'16c-cutaway');
  layout();if(orbit)loading??=openModel();
 };
 slider.addEventListener('focus',()=>lens(Number(slider.value),y));
 slider.addEventListener('input',()=>lens(Number(slider.value),y));
 slider.addEventListener('keydown',e=>{
  if(e.key==='ArrowUp'||e.key==='ArrowDown'){
   e.preventDefault();lens(Number(slider.value),y+(e.key==='ArrowDown'?5:-5));
  }else if(e.key==='Escape')hideLens();
 });
 field.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch'&&!orbit)atPoint(e)});
 field.addEventListener('pointerdown',e=>{
  if(!e.isPrimary||e.button!==0)return;
  pointer={id:e.pointerId,x:e.clientX,y:e.clientY,armed:false};
  if(!orbit)atPoint(e);
 });
 field.addEventListener('pointermove',e=>{
  if(!orbit&&e.pointerType!=='touch'){atPoint(e);return}
  if(!pointer||pointer.id!==e.pointerId)return;
  const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;
  if(!pointer.armed){
   if(e.pointerType==='touch'&&Math.abs(dy)>Math.abs(dx)+4){pointer=null;hideLens();return}
   if(Math.abs(dx)<4&&Math.abs(dy)<4)return;
   pointer.armed=true;field.setPointerCapture(e.pointerId);
  }
  if(orbit){engine?.turn(-dx*.009,dy*.006);pointer.x=e.clientX;pointer.y=e.clientY}
  else atPoint(e);
 });
 field.addEventListener('pointerup',()=>{pointer=null});
 field.addEventListener('pointercancel',()=>{pointer=null;hideLens()});
 field.addEventListener('pointerleave',e=>{if(e.pointerType!=='touch'&&!pointer)hideLens()});
 field.addEventListener('keydown',e=>{
  if(e.key==='Escape'){hideLens();return}
  const move={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
  if(!move)return;e.preventDefault();
  if(orbit)engine?.turn(-move[0]*.11,-move[1]*.08);else lens(x+move[0]*5,y+move[1]*5);
 });
 field.addEventListener('blur',hideLens);
 new IntersectionObserver(([e])=>{if(e.isIntersecting)images();else hideLens()},{rootMargin:'180px'}).observe(section);
 layout();
 return visible=>{if(visible)images();else hideLens();section.hidden=!visible;document.querySelector('.plate-img').hidden=visible};
}
