const $=id=>document.getElementById(id);
const key='assembl.planting-focus.reviews.v1';
const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
const nz=new Intl.NumberFormat('en-NZ',{style:'currency',currency:'NZD',maximumFractionDigits:0});
const base='./';
async function studioReady(){
 const until=Date.now()+25000;
 while(Date.now()<until){if(window.__nzStudio?.study&&$('cards-rail').children.length)return window.__nzStudio;await new Promise(r=>setTimeout(r,85));}
 throw Error('Garden did not initialise');
}
export async function initialise(){
 const s=await studioReady();
 const eng=s.engine,bed=eng.beds[0];
 if(!bed?.points?.length)return;
 const nx=bed.points.reduce((x,v)=>x+v.x,0)/bed.points.length,nzPos=bed.points.reduce((z,v)=>z+v.z,0)/bed.points.length;
 const y=s.terrainEngine.getHeight(nx,nzPos);
 const aim=()=>{const small=innerWidth<610;return [nx+(small?4.2:4.5),y+(small?3.95:4.35),nzPos+(small?6.5:6.55),nx,y+.27,nzPos];};
 const snap=(values)=>{
  const damping=s.controls.enableDamping;s.controls.enableDamping=false;
  try{s.controls.update();s.setCamera(...values);}finally{s.controls.enableDamping=damping;}
 };
 const frame=()=>snap(aim());
 let views={};
 try{views=JSON.parse(localStorage.getItem(key)||'{}')||{};}catch{}
 document.head.append(Object.assign(document.createElement('link'),{rel:'stylesheet',href:new URL('./focus-garden.css',import.meta.url).href}));
 const h=document.createElement('section');
 h.className='bed-toolbar';h.setAttribute('aria-label','Plant a native bed');
 h.innerHTML=`<div class="bed-top"><small class="bed-label">Aotearoa · bed study</small><div class="bed-actions">
 <button id="bed-paint" aria-pressed="false" type="button">Paint</button><button id="bed-reset" type="button" aria-label="Reset garden view">Reset</button><button id="bed-undo" type="button">Undo</button><button id="bed-compare" aria-expanded="false" type="button">Compare</button>
 <a href="${base}" target="_blank" rel="noopener noreferrer">Full site ↗</a></div></div>
 <p id="bed-hint" aria-live="polite"></p>
 <div class="bed-dock"><div class="bed-group" aria-label="Planting mix">
 <button type="button" class="bed-mix" id="mix-coast" aria-pressed="true" style="--mix:#4b6447">Coastal</button>
 <button type="button" class="bed-mix" id="mix-fern" aria-pressed="false" style="--mix:#7a875b">Fern glade</button></div>
 <label class="bed-season"><input type="range" id="bed-season" aria-label="Planting season" min="0" max="11.95" step=".05"><span id="bed-season-note"></span></label>
 <div class="bed-group" aria-label="Garden age"><button id="bed-new" type="button" aria-pressed="true">New</button><button id="bed-five" type="button" aria-pressed="false">5 years</button></div></div>`;
 document.body.append(h);
 const compare=document.createElement('section');
 compare.className='bed-compare';compare.hidden=true;compare.setAttribute('aria-labelledby','bed-comparison-title');
 compare.innerHTML=`<div class="bed-compare-top"><h2 id="bed-comparison-title">Compare two planting options</h2><button id="bed-close" type="button">Close</button></div>
 <p>Save two looks. Both use the same camera. Budget covers the sample garden, not the house; rates are estimates.</p>
 <div class="bed-side"><figure id="bed-a"></figure><figure id="bed-b"></figure></div>
 <p id="bed-delta" aria-live="polite"></p>
 <div class="bed-save"><button id="bed-save-a" type="button">Save current as A</button><button id="bed-save-b" type="button">Save current as B</button><button id="bed-download" type="button">Download comparison</button></div>
 <p id="bed-save-status" aria-live="polite"></p>`;
 document.body.append(compare);
 const year=n=>{$(n===1?'bed-new':'bed-five').setAttribute('aria-pressed','true');$(n===1?'bed-five':'bed-new').setAttribute('aria-pressed','false');document.querySelector(`[data-year="${n}"]`)?.click();};
 const setMonth=n=>{const r=$('season-slider');r.value=String(n);r.dispatchEvent(new Event('input',{bubbles:true}));$('bed-season').value=r.value;$('bed-season-note').textContent=$('season-label').textContent;};
 $('bed-season').oninput=e=>setMonth(e.target.value);
 $('bed-new').onclick=()=>year(1);$('bed-five').onclick=()=>year(5);
 $('bed-undo').onclick=()=>$('btn-undo').click();
 let painting=false;
 const canvas=document.querySelector('#canvas-wrap canvas');
 function mode(next){
  painting=next;s.setTool(next?'paint-mix':'orbit');document.documentElement.toggleAttribute('data-bed-paint',next);
  $('bed-paint').setAttribute('aria-pressed',String(next));$('bed-hint').textContent=next?'Brush across the soil to plant':'Drag to look around · Pinch or scroll to zoom';
 }
 $('bed-paint').onclick=()=>mode(!painting);$('bed-reset').onclick=frame;
 if(canvas){
  canvas.tabIndex=0;canvas.setAttribute('aria-label','Interactive garden view. Use arrow keys to turn and plus or minus to zoom.');
  canvas.addEventListener('keydown',e=>{
   if(painting||e.altKey||e.metaKey||e.ctrlKey)return;
   const deltas={ArrowLeft:[-.13,0,1],ArrowRight:[.13,0,1],ArrowUp:[0,-.11,1],ArrowDown:[0,.11,1],'+':[0,0,.89],'=':[0,0,.89],'-':[0,0,1.12]};
   if(!Object.hasOwn(deltas,e.key))return;
   e.preventDefault();e.stopPropagation();
   const [da,dp,zf]=deltas[e.key], t=s.controls.target, v=s.camera.position;
   const dx=v.x-t.x,dy=v.y-t.y,dz=v.z-t.z,r=Math.max(.3,Math.hypot(dx,dy,dz));
   const az=Math.atan2(dx,dz)+da,polar=Math.max(.12,Math.min(1.5,Math.acos(Math.max(-1,Math.min(1,dy/r)))+dp)),dist=Math.max(2,Math.min(30,r*zf));
   s.setCamera(t.x+dist*Math.sin(polar)*Math.sin(az),t.y+dist*Math.cos(polar),t.z+dist*Math.sin(polar)*Math.cos(az),t.x,t.y,t.z);
  });
 }
 function mix(index){
  document.querySelectorAll('#cards-rail .card')[index]?.click();mode(painting);
  $('mix-coast').setAttribute('aria-pressed',String(index===0));$('mix-fern').setAttribute('aria-pressed',String(index===1));
 }
 $('mix-coast').onclick=()=>mix(0);$('mix-fern').onclick=()=>mix(1);
 const signed=(n,fmt)=>Math.abs(n)<.049?'No change':(n>0?'+':'−')+fmt(Math.abs(n));
 function redraw(){
  for(const slot of ['a','b']){
   const root=$('bed-'+slot);root.replaceChildren();
   const v=views[slot];
   if(v?.img&&/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(v.img)){const im=new Image();im.src=v.img;im.alt='Planting option '+slot.toUpperCase();root.append(im);}
   const cap=document.createElement('figcaption');
   cap.textContent=v?`Option ${slot.toUpperCase()} · ${v.season} · ${v.age} · ${nz.format(v.materials)} materials · ${v.days.toFixed(1)} crew days`:`Option ${slot.toUpperCase()} · not saved`;
   root.append(cap);
  }
  const a=views.a,b=views.b;
  $('bed-download').disabled=!(a?.img&&b?.img);
  $('bed-delta').textContent=a&&b?`B vs A: ${signed(b.materials-a.materials,n=>nz.format(n))} materials · ${signed(b.days-a.days,n=>n.toFixed(1)+' crew days')}`:'';
 }
 async function capture(slot){
  const status=$('bed-save-status');status.textContent='Capturing the same view…';
  const buttons=['bed-save-a','bed-save-b'].map($);buttons.forEach(el=>el.disabled=true);
  const previous=[...s.camera.position.toArray(),...s.controls.target.toArray()];
  try{
   frame();
   const raw=await s.captureBedFrame();
   const metrics=s.study.readEstimate(false);
   const data={img:raw,materials:metrics.materials,days:metrics.days,season:$('bed-season-note').textContent,age:$('bed-five').getAttribute('aria-pressed')==='true'?'5 years':'new planting'};
   views[slot]=data;
   try{localStorage.setItem(key,JSON.stringify(views));status.textContent=`Option ${slot.toUpperCase()} saved in this browser.`;}catch{status.textContent=`Option ${slot.toUpperCase()} saved for this session.`;}
   redraw();
  }catch{status.textContent='This browser could not capture the view. The scene is unchanged.';}
  finally{snap(previous);buttons.forEach(el=>el.disabled=false);}
 }
 function show(on){compare.hidden=!on;$('bed-compare').setAttribute('aria-expanded',String(on));if(on){redraw();$('bed-close').focus();}else $('bed-compare').focus();}
 $('bed-compare').onclick=()=>show(compare.hidden);$('bed-close').onclick=()=>show(false);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!compare.hidden)show(false);});
 $('bed-save-a').onclick=()=>capture('a');$('bed-save-b').onclick=()=>capture('b');
 $('bed-download').onclick=async()=>{
  try{
   const a=views.a,b=views.b;
   const canvas=document.createElement('canvas');canvas.width=1440;canvas.height=740;const ctx=canvas.getContext('2d');
   ctx.fillStyle='#fffdfb';ctx.fillRect(0,0,1440,740);ctx.fillStyle='#654a4e';ctx.font='600 30px system-ui';ctx.fillText('assembl.  |  Aotearoa Planting Studio',28,56);
   for(const [j,v] of [a,b].entries()){
    const im=new Image();im.src=v.img;await im.decode();
    const x=28+j*700,maxW=684,maxH=496,ratio=Math.min(maxW/im.width,maxH/im.height),w=im.width*ratio,h=im.height*ratio;
    ctx.fillStyle='#eee1e1';ctx.fillRect(x,84,maxW,maxH);ctx.drawImage(im,x+(maxW-w)/2,84+(maxH-h)/2,w,h);
    ctx.fillStyle='#654a4e';ctx.font='600 23px system-ui';ctx.fillText(`Option ${j?'B':'A'} · ${v.season} · ${v.age}`,x,618);
    ctx.font='500 20px system-ui';ctx.fillText(`${nz.format(v.materials)} materials · ${v.days.toFixed(1)} crew days`,x,648);
   }
   ctx.fillStyle='#654a4e';ctx.font='500 21px system-ui';ctx.fillText($('bed-delta').textContent,28,690);ctx.font='500 15px system-ui';ctx.fillText('Concept study. Editable estimating assumptions, not supplier quotes.',28,717);
   canvas.toBlob(blob=>{if(!blob)return;const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='assembl-planting-options.png';a.click();setTimeout(()=>URL.revokeObjectURL(u),10000);},'image/png');
  }catch{$('bed-save-status').textContent='The comparison could not download.';}
 };
 if(reduced&&$('btn-wind').getAttribute('aria-pressed')==='true')$('btn-wind').click();
 s.study.base.visible=false;document.documentElement.setAttribute('data-garden-bed','');frame();year(5);setMonth(11.4);mode(false);
}
initialise().catch(e=>console.warn('Close-up garden view unavailable.',e));
