export function setupPlanReveal(asset) {
 const section=document.querySelector('#plan-study'),field=document.querySelector('#plan-field'),host=document.querySelector('#plan-geometry');
 const slider=document.querySelector('#plan-scrub'),output=document.querySelector('#plan-value'),heading=document.querySelector('#folio-stage');
 const top=field.querySelector('.section-still'),beauty=field.querySelector('.beauty-still'),hint=document.querySelector('#model-hint');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let engine,started,loaded=false,still=false,pointer=null,drawId=0,amount=0;
 function images(){if(loaded)return;loaded=true;field.querySelector('.plan-paper').src=asset('16c-ink.webp');top.src=asset('section16c.webp');beauty.src=asset('16c-cutaway.webp')}
 function paint(){
  drawId=0;if(!engine||!field.clientWidth)return;
  const style=getComputedStyle(field),r=field.querySelector('.folio-lens').getBoundingClientRect().width/2;
  engine.reveal(parseFloat(style.getPropertyValue('--px'))/100,parseFloat(style.getPropertyValue('--py'))/100,r/field.clientWidth,amount<42?1:1-(amount-42)/58);
 }
 function schedule(){if(engine&&!drawId)drawId=requestAnimationFrame(paint)}
 function display(){
  amount=Number(slider.value);const t=Math.max(0,1-amount/42),lift=t*t*(3-2*t),cover=Math.max(0,(amount-42)/58);
  field.classList.toggle('orbiting',amount===0);field.classList.toggle('all-plan',amount===100);
  field.style.setProperty('--uncover',((1-cover)*100)+'%');field.style.setProperty('--plate-alpha',amount>=42?'1':'0');
  if(amount<=42)field.classList.remove('has-lens');
  if(engine){engine.stage(lift);schedule()}
  beauty.hidden=!!engine;beauty.style.opacity=String(lift);
  const name=amount===0?'Cutaway':amount<42?'Changing view':amount===42?'Overhead':amount<100?'Revealing plan':'Floor plan';
  output.value=name;heading.textContent=amount===0?'Furnished cutaway':amount<=42?'Over the rooms':'The original drawing';
  slider.setAttribute('aria-valuetext',name+', '+amount+' percent');
  hint.firstChild.textContent=still?'Saved model views.':amount===0?'Drag the cutaway to turn it.':amount>=42?'Move across the rooms to inspect the drawing.':'Keep dragging to meet the plan.';
  field.tabIndex=0;field.setAttribute('aria-label',amount===0?'Furnished 16C cutaway. Drag or use arrow keys to turn.':'16C floor plan and model. Use the slider to compare.');
 }
 function fallback(){engine=null;still=true;host.replaceChildren();section.dataset.renderer='still';document.querySelector('#section-mode').textContent=' · Still view';display()}
 async function load(){
  images();const choice=new URLSearchParams(location.search).get('renderer');if(choice==='still'){fallback();return}
  try{const {sectionModel}=await import('./section-model.js');
   try{engine=await sectionModel(host,asset,choice==='webgl',fallback)}catch(error){if(choice==='webgl')throw error;engine=await sectionModel(host,asset,true,fallback)}
   section.dataset.renderer=engine.backend;display()
  }catch{fallback()}
 }
 function ensure(){return started??=load()}
 slider.addEventListener('input',()=>{field.classList.remove('has-lens');display();ensure()});
 function lens(e){if(amount<42)return;const r=field.getBoundingClientRect();field.style.setProperty('--px',100*(e.clientX-r.x)/r.width+'%');field.style.setProperty('--py',100*(e.clientY-r.y)/r.height+'%');field.classList.add('has-lens');ensure();schedule()}
 field.addEventListener('pointerdown',e=>{if(e.button!==0)return;pointer={id:e.pointerId,x:e.clientX,y:e.clientY,armed:false};ensure()});
 field.addEventListener('pointermove',e=>{
  if(amount>=42&&e.pointerType==='mouse'){if(!reduced.matches)lens(e);return}
  if(!pointer||e.pointerId!==pointer.id)return;const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;
  if(!pointer.armed&&e.pointerType!=='mouse'&&Math.abs(dy)>Math.abs(dx)+5){pointer=null;return}
  if(Math.abs(dx)>4||e.pointerType==='mouse')pointer.armed=true;if(!pointer.armed)return;
  if(amount===0){engine?.turn(-dx*.009,e.pointerType==='mouse'?dy*.006:0);pointer.x=e.clientX;pointer.y=e.clientY}
  else lens(e);
 });
 field.addEventListener('pointerup',e=>{if(pointer&&amount>=42&&!pointer.armed)lens(e);pointer=null});
 function clear(){pointer=null;field.classList.remove('has-lens');schedule()}
 field.addEventListener('pointercancel',clear);field.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse')clear()});
 field.addEventListener('keydown',async e=>{if(e.key==='Escape'){clear();slider.focus({preventScroll:true});return}
  const move={ArrowLeft:[.11,0],ArrowRight:[-.11,0],ArrowUp:[0,.08],ArrowDown:[0,-.08]}[e.key];
  if(move&&amount===0){e.preventDefault();await ensure();engine?.turn(...move)}
 });
 new IntersectionObserver(([e])=>{if(e.isIntersecting)images();else clear()},{rootMargin:'140px'}).observe(section);
 return visible=>{if(!visible)clear();section.hidden=!visible;document.querySelector('.plate-img').hidden=visible;if(visible)display()};
}
