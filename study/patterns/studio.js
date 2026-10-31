import {createLiquid} from './liquid.js';
import {createSculpture} from './sculpture.js';
import {createGarden} from './garden.js';
import {createFluid} from './fluid.js';
import {createTuring} from './turing.js';
import {createSlime} from './slime.js';
import {createVessel} from './vessel.js';
import {createFlock} from './flock.js';
import {captionLines} from './caption.js';
import {cleanRecipe} from './atelier-shapes.js';
const el=id=>document.getElementById(id);
const modern={
 liquid:{name:'Liquid Atelier',hint:'Touch to pour',description:'Dense ribbons of colour. Drag to pour your own swirling pigment.',prompt:'A seeded, domain-warped pigment field. This is procedural marbling, not a physical fluid simulation. Try changing just one colour.',factory:createLiquid},
 sculpture:{name:'Sculpture Atelier',hint:'Drag to turn your sculpture',description:'Four generated forms, four finishes, and your own studio lighting.',prompt:'Real 3D geometry, procedural studio lighting and reflective materials. The same shape feels different in chrome and glass. What changes?',factory:createSculpture},
 garden:{name:'Luminous Type Garden',hint:'Touch to transform',description:'Your word, grown from layers of luminous silk petals.',prompt:'Editable letters guide layers of procedural petals. Drag through them and see the letterform bend. No image generation or upload is involved.',factory:createGarden},
 // Living systems: real simulations that keep running after you let go.
 fluid:{name:'Living Ink',hint:'Drag to stir · tap to drop ink',description:'A real fluid you can stir. Inks swirl, fold and mix like pigment, and keep moving after you let go.',prompt:'This is a genuine (if coarse) fluid simulation: the ink is carried by a velocity field that is kept incompressible every frame. Swirl adds vorticity back where the grid loses it. Colours mix by absorbing light, like paint. Try stirring two inks into each other.',factory:createFluid,energy:'Swirl',swatches:true,listen:true},
 turing:{name:'Turing Garden',hint:'Paint to plant · change the word to reseed',description:'Two virtual chemicals react and spread. Spots, mazes and dividing cells grow from your word and your brushstrokes.',prompt:'The Gray–Scott reaction–diffusion model. Alan Turing proposed that reactions like this could pattern living things. Slide Pattern slowly and watch one regime turn into another. A mathematical model, not a particular animal.',factory:createTuring,energy:'Pattern',swatches:true,word:true},
 slime:{name:'Slime Mould',hint:'Draw to lay food',description:'Thousands of tiny agents follow each other’s trails and build a living network between the food you draw.',prompt:'Each agent only senses the trail just ahead, then turns and steps. Nobody plans the network. Real slime moulds have been compared with Tokyo’s rail map; this is a simplified agent model inspired by them. Draw two pieces of food and watch for the shortest link.',factory:createSlime,energy:'Wander',swatches:true},
 // Make and test: a drawn profile thrown into a vessel, and flocking with its rules on show.
 vessel:{name:'Kiln',hint:'Draw half a silhouette · the wheel throws it',description:'Draw the outline of one side of a vessel. The wheel spins it into porcelain you can export.',prompt:'Your stroke becomes a lathe profile: every point is spun once around the axis. The walls get a thickness and a rolled rim, so the mesh is a closed solid. Ridges adds the marks of hand throwing. Real-time glaze, not a kiln simulation; the OBJ has not been checked for printing or food use.',factory:createVessel,energy:'Ridges',swatches:true},
 flock:{name:'Flocking rules',hint:'Tap a bird to follow it · drag to be the hawk',description:'Hundreds of birds, three simple rules and no leader. The highlighted bird shows its rules as arrows.',prompt:'Craig Reynolds’ boids (1987). Each bird only sees the neighbours inside its circle. Set one rule to zero and predict what will change before you look. Fixed time steps mean the same seed and settings replay fairly. A model of the idea, not measured starling data.',factory:createFlock,energy:'Vision',sliders:[['sep','Separation',0,3,.1,1],['ali','Alignment',0,3,.1,1],['coh','Cohesion',0,3,.1,1]]}
};
const defaults=cleanRecipe();
const settings={...defaults};const renderers=new Map();let active='sculpture',time=0,tempo=1,paused=matchMedia('(prefers-reduced-motion: reduce)').matches,legacy,ready=false,last=0,raf=0;
let savedFile=null,savedURL=null,pointer=null,version=0,captureRevision=0;
const host=el('canvas-host');
const startupControls=document.querySelectorAll('.mode,.quick-controls button,.header-actions button,#open-settings');startupControls.forEach(button=>button.disabled=true);
function motion(){el('pause').textContent=paused?'Play':'Pause';el('pause').setAttribute('aria-pressed',String(paused));const software=renderers.get(active)?.renderer.renderer==='canvas2d'||renderers.get(active)?.renderer.rendererKind==='canvas2d';el('motion-status').textContent=(paused?'Paused':'Live')+(software?' · software':'');}
function invalidate(){captureRevision++;savedFile=null;['download','share','print'].forEach(id=>el(id).disabled=true);el('preview').hidden=true;el('dimensions').textContent='Capture the current artwork to prepare a file.';el('export-status').textContent='Capture a still from your current artwork.';}
function currentCanvas(){return modern[active]?renderers.get(active)?.canvas:legacy?.canvas;}
function showError(error){el('render-error').textContent=error.message+' The original drawing worlds remain available under More.';el('render-error').hidden=false;console.error(error);}
function rendererFor(id){if(renderers.has(id))return renderers.get(id);const canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');canvas.hidden=true;host.append(canvas);try{const renderer=modern[id].factory(canvas);canvas.dataset.renderer=renderer.renderer||renderer.rendererKind||(id==='garden'?'canvas2d':'webgl');const item={renderer,canvas};renderers.set(id,item);const r=host.getBoundingClientRect();renderer.resize(Math.round(r.width),Math.round(r.height),Math.min(devicePixelRatio||1,2));renderer.reset(settings.seed,settings);renderer.render(0,settings);return item;}catch(error){canvas.remove();throw error;}}
function draw(){if(!ready)return;try{if(modern[active])renderers.get(active)?.renderer.render(time,settings);else legacy.render();}catch(error){paused=true;motion();showError(error);}}
function tick(now){raf=requestAnimationFrame(tick);if(!last)last=now;if(now-last<32)return;const dt=Math.min((now-last)/1000,.07);last=now;if(!paused&&!document.hidden&&((!el('settings').open&&!el('exports').open)||recording)){time+=dt*tempo;hear();for(let i=0;i<(modern[active]?1:tempo);i++)draw();}}
function thumbnail(id){const item=renderers.get(id);if(!item||!el('thumb-'+id))return;const out=document.createElement('canvas');out.width=180;out.height=120;const c=out.getContext('2d'),source=item.canvas;const sw=source.width,sh=source.height,scale=Math.max(180/sw,120/sh);c.drawImage(source,(180-sw*scale)/2,(120-sh*scale)/2,sw*scale,sh*scale);el('thumb-'+id).src=out.toDataURL('image/png');}
function controls(){
 syncQuick();el('studio').classList.toggle('sculpture-active',active==='sculpture');el('copy-recipe').hidden=active!=='sculpture';
 const e=modern[active]||legacy.engines[active];el('engine-tag').textContent=e.name;el('engine').value=active;el('engine-description').textContent=e.description;el('gesture-hint').textContent=e.hint;el('prompt').textContent=e.prompt;host.setAttribute('aria-label','Interactive '+e.name+'. '+e.hint+'. Arrow keys work too.');
 document.querySelectorAll('[data-mode]').forEach(b=>{const selected=b.dataset.mode===active;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));});
 el('swatches').hidden=!(active==='liquid'||modern[active]?.swatches);el('material-controls').hidden=active!=='sculpture';el('word-control').hidden=!(active==='garden'||modern[active]?.word);el('energy-label').textContent=modern[active]?.energy||(active==='sculpture'?'Twist':active==='garden'?'Bloom':'Flow');el('energy').setAttribute('aria-label',el('energy-label').textContent);el('energy').closest('label').hidden=!modern[active];
 worldSliders();el('vessel-obj').hidden=active!=='vessel';el('listen').hidden=!modern[active]?.listen;
 el('dark').disabled=active==='liquid';el('live-controls').replaceChildren();if(modern[active]){const label=document.createElement('label');label.htmlFor='detail-energy';label.textContent=el('energy-label').textContent;const input=document.createElement('input');Object.assign(input,{id:'detail-energy',type:'range',min:0,max:100,value:Math.round(settings.energy*100)});input.oninput=()=>{settings.energy=Number(input.value)/100;el('energy').value=input.value;draw();invalidate();};el('live-controls').append(label,input);}
 if(!modern[active]){if(e.word){const label=document.createElement('label');label.htmlFor='legacy-word';label.textContent='Your word · up to 12 characters';const input=document.createElement('input');input.id='legacy-word';input.maxLength=12;input.value=legacy.state.text;input.type='text';input.oninput=()=>{legacy.set('text',input.value.replace(/[<>"&]/g,'').slice(0,12));invalidate();};el('live-controls').append(label,input);}for(const [key,label,min,max,step] of e.controls){const l=document.createElement('label');l.htmlFor='c-'+key;l.textContent=label;const out=document.createElement('output');out.textContent=Number(legacy.state[key].toFixed(2));l.append(out);const input=document.createElement('input');Object.assign(input,{type:'range',id:'c-'+key,min,max,step,value:legacy.state[key]});input.oninput=()=>{legacy.set(key,Number(input.value));out.textContent=Number(Number(input.value).toFixed(2));invalidate();};el('live-controls').append(l,input);}}
}
// Per-world rule sliders in the dock (Flocking rules); the world's own defaults fill any missing value.
function worldSliders(){
 const box=el('world-sliders'),list=modern[active]?.sliders;box.replaceChildren();box.hidden=!list;if(!list)return;el('energy').closest('label').hidden=true;
 for(const [key,label,min,max,step,value] of list){if(!Number.isFinite(settings[key]))settings[key]=value;const l=document.createElement('label');l.className='world-slider';const t=document.createElement('span');t.textContent=label;const input=document.createElement('input');Object.assign(input,{type:'range',min,max,step,value:settings[key]});input.setAttribute('aria-label',label+' weight');input.oninput=()=>{settings[key]=Number(input.value);draw();invalidate();};l.append(t,input);box.append(l);}
}
el('vessel-obj').onclick=()=>{const renderer=renderers.get('vessel')?.renderer;if(!renderer?.exportObj)return;draw();downloadText(renderer.exportObj(),'assembl-vessel.obj','application/octet-stream');el('gesture-hint').textContent='OBJ ready · artwork mesh, not checked for printing';};
// Sound to ink: loudness and pitch are measured here, in the browser. Nothing is recorded or sent.
let listening=null;
function stopListening(){if(!listening)return;listening.stream.getTracks().forEach(t=>t.stop());listening.ac.close();listening=null;el('listen').textContent='Listen';el('listen').setAttribute('aria-pressed','false');}
function hear(){
 if(!listening)return;const {an,ac,wave,spec}=listening;an.getFloatTimeDomainData(wave);let sum=0;for(const v of wave)sum+=v*v;
 const level=Math.min(1,Math.sqrt(sum/wave.length)*4);an.getByteFrequencyData(spec);let weighted=0,total=0;for(let i=2;i<spec.length;i++){weighted+=spec[i]*i;total+=spec[i];}
 const hz=total?weighted/total*ac.sampleRate/an.fftSize:0,pitch=hz?Math.max(0,Math.min(1,Math.log2(hz/150)/Math.log2(30))):0;
 renderers.get(active)?.renderer.sound?.(level,pitch);
}
el('listen').onclick=async()=>{
 if(listening){stopListening();return;}
 try{const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});const ac=new AudioContext(),an=ac.createAnalyser();an.fftSize=2048;ac.createMediaStreamSource(stream).connect(an);
  listening={stream,ac,an,wave:new Float32Array(an.fftSize),spec:new Uint8Array(an.frequencyBinCount)};el('listen').textContent='Stop';el('listen').setAttribute('aria-pressed','true');el('gesture-hint').textContent='Listening · hum, clap or sing · nothing is recorded';if(paused){paused=false;motion();}}
 catch(error){el('gesture-hint').textContent='Microphone unavailable · drag to stir instead';}
};
// Time-lapse: record six seconds of the live canvas as a video file, in the browser.
let recording=false,videoURL=null;
el('record').onclick=async()=>{
 const canvas=currentCanvas();if(!canvas?.captureStream||!window.MediaRecorder){el('export-status').textContent='This browser cannot record the canvas. Capture a still instead.';return;}
 const type=['video/mp4;codecs=avc1','video/mp4','video/webm;codecs=vp9','video/webm'].find(t=>MediaRecorder.isTypeSupported(t));
 const stream=canvas.captureStream(30),rec=new MediaRecorder(stream,type?{mimeType:type,videoBitsPerSecond:8e6}:{}),chunks=[],stopped=new Promise(r=>rec.onstop=r);
 rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
 const wasPaused=paused;el('record').disabled=true;el('exports').close();recording=true;paused=false;motion();el('motion-status').textContent='● Recording 6 s';
 rec.start(250);await new Promise(r=>setTimeout(r,6000));rec.stop();await stopped;stream.getTracks().forEach(t=>t.stop());
 recording=false;paused=wasPaused;motion();el('record').disabled=false;
 const blob=new Blob(chunks,{type:(rec.mimeType||type||'video/webm').split(';')[0]}),ext=blob.type.includes('mp4')?'mp4':'webm';
 if(videoURL)URL.revokeObjectURL(videoURL);videoURL=URL.createObjectURL(blob);
 const a=el('download-video');a.href=videoURL;a.download='assembl-'+active+'-6s.'+ext;a.hidden=false;a.textContent='Download video · '+ext.toUpperCase()+' · '+(blob.size/1048576).toFixed(1)+' MB';
 const v=el('video-preview');v.src=videoURL;v.hidden=false;el('preview').hidden=true;v.play().catch(()=>{});
 el('exports').showModal();el('export-status').textContent='Video ready: six seconds of the live canvas, at screen size, 30 frames a second.';
};
async function selectMode(id){const token=++version;if(!modern[id]?.listen)stopListening();el('render-error').hidden=true;try{for(const item of renderers.values())item.canvas.hidden=true;el('legacy-host').hidden=Boolean(modern[id]);if(modern[id]){const item=rendererFor(id);if(token!==version)return;item.canvas.hidden=false;}else{if(!legacy)legacy=await window.legacyStudioReady;if(token!==version)return;legacy.select(id);const r=host.getBoundingClientRect();legacy.resize(Math.round(r.width),Math.round(r.height));legacy.palette(settings.dark);}active=id;time=0;controls();ready=true;startupControls.forEach(button=>button.disabled=false);draw();if(modern[id])thumbnail(id);motion();invalidate();}catch(error){showError(error);el('open-settings').disabled=false;}}
function resize(){const r=host.getBoundingClientRect(),w=Math.round(r.width),h=Math.round(r.height);if(!w||!h)return;for(const {renderer} of renderers.values())renderer.resize(w,h,Math.min(devicePixelRatio||1,2));if(legacy&&!modern[active])legacy.resize(w,h);draw();}
new ResizeObserver(resize).observe(host);
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>selectMode(b.dataset.mode));
el('engine').onchange=async()=>{await selectMode(el('engine').value);el('settings').close();};
el('open-settings').onclick=()=>{controls();el('settings').showModal();};el('close-settings').onclick=()=>el('settings').close();
el('pause').onclick=()=>{paused=!paused;motion();};el('step').onclick=()=>{paused=true;time+=1/30;draw();motion();invalidate();};
el('randomise').onclick=()=>{settings.seed=Math.floor(Math.random()*99999);time=0;if(modern[active]){renderers.get(active).renderer.reset(settings.seed,settings);draw();thumbnail(active);syncAtelier();}else{legacy.remix(settings.seed);controls();}invalidate();};
el('reset').onclick=()=>{Object.assign(settings,defaults);for(const m of Object.values(modern))for(const [key,,,,,value] of m.sliders||[])settings[key]=value;worldSliders();time=0;tempo=1;el('speed').value=1;el('speed-value').textContent='1×';el('energy').value=55;el('word').value='PLAY';el('dark').checked=false;syncQuick();if(modern[active]){renderers.get(active).renderer.reset(settings.seed,settings);draw();thumbnail(active);}else{legacy.palette(false);legacy.reset();controls();}invalidate();};
function syncQuick(){syncAtelier();document.querySelectorAll('[data-tone]').forEach(b=>{const selected=Number(b.dataset.tone)===settings.tone;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));});document.querySelectorAll('[data-material]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.material===settings.material)));}
document.querySelectorAll('[data-tone]').forEach(b=>b.onclick=()=>{settings.tone=Number(b.dataset.tone);syncQuick();draw();invalidate();});
document.querySelectorAll('[data-material]').forEach(b=>b.onclick=()=>{settings.material=b.dataset.material;syncQuick();draw();invalidate();});
el('energy').oninput=()=>{settings.energy=Number(el('energy').value)/100;draw();invalidate();};
el('word').oninput=()=>{settings.word=el('word').value.replace(/[<>"&]/g,'').slice(0,12);draw();invalidate();};
el('dark').onchange=()=>{settings.dark=el('dark').checked;if(!modern[active])legacy.palette(settings.dark);draw();invalidate();};
el('speed').oninput=()=>{tempo=Number(el('speed').value);el('speed-value').textContent=tempo+'×';};
function interact(x,y,dx=0,dy=0){if(modern[active])renderers.get(active)?.renderer.interact(x,y,dx,dy);else legacy?.interact(x,y);draw();invalidate();}
function point(e){const r=host.getBoundingClientRect();return {x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))};}
host.addEventListener('pointerdown',e=>{if(e.button!==0)return;pointer={...point(e),id:e.pointerId};host.setPointerCapture(e.pointerId);interact(pointer.x,pointer.y);const ring=document.querySelector('.touch-ring');ring.classList.add('active');ring.style.left=pointer.x*100+'%';ring.style.top=pointer.y*100+'%';});
host.addEventListener('pointermove',e=>{if(!pointer||e.pointerId!==pointer.id)return;const p=point(e);interact(p.x,p.y,p.x-pointer.x,p.y-pointer.y);pointer={...p,id:e.pointerId};const ring=document.querySelector('.touch-ring');ring.style.left=p.x*100+'%';ring.style.top=p.y*100+'%';});
for(const name of ['pointerup','pointercancel','lostpointercapture'])host.addEventListener(name,()=>{pointer=null;document.querySelector('.touch-ring').classList.remove('active');});
host.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const dx=e.key==='ArrowLeft'?-.09:e.key==='ArrowRight'?.09:0,dy=e.key==='ArrowUp'?-.09:e.key==='ArrowDown'?.09:0;interact(.5+dx,.5+dy,dx,dy);}});
el('open-export').onclick=()=>{paused=true;motion();el('exports').showModal();};el('close-export').onclick=()=>el('exports').close();el('caption-on').onchange=()=>{el('captions').hidden=!el('caption-on').checked;invalidate();};['format','art-title','art-caption','export-layout','brand-name'].forEach(id=>el(id).addEventListener('input',invalidate));
el('capture').onclick=async()=>{
 paused=true;motion();draw();const button=el('capture'),revision=captureRevision,captureMode=active;button.disabled=true;
 let resized=null;
 try{
  const canvas=currentCanvas();if(!canvas)throw Error('Artwork unavailable');
  const [w,h]=({square:[2400,2400],story:[2160,3840],wide:[3200,1800],portrait:[2160,2700]})[el('format').value];
  const out=document.createElement('canvas');out.width=w;out.height=h;const c=out.getContext('2d');
  c.fillStyle=settings.dark?'#240b21':settings.background;c.fillRect(0,0,w,h);
  const layout=el('export-layout').value, margin=w*.055,caption=el('caption-on').checked,footer=(caption||layout!=='gallery')?w*.28:w*.07;
  const item=renderers.get(active),r=host.getBoundingClientRect();
  if(item){resized={item,w:r.width,h:r.height};item.renderer.resize(w-margin*2,h-margin*2-footer,1);item.renderer.render(time,settings);}
  const scale=Math.min((w-margin*2)/canvas.width,(h-margin*2-footer)/canvas.height),dw=canvas.width*scale,dh=canvas.height*scale;
  c.drawImage(canvas,(w-dw)/2,margin+(h-margin*2-footer-dh)/2,dw,dh);
  if(resized){resized.item.renderer.resize(resized.w,resized.h,Math.min(devicePixelRatio||1,2));resized=null;draw();}
  const hex=settings.dark?'240b21':settings.background.slice(1), lum=parseInt(hex.slice(0,2),16)*.299+parseInt(hex.slice(2,4),16)*.587+parseInt(hex.slice(4,6),16)*.114;c.fillStyle=lum<135?'#fffdfb':'#240b21';
  if(caption||layout!=='gallery'){c.font='500 '+w*(layout==='poster'?.065:.035)+'px Instrument Sans';let y=captionLines(c,el('art-title').value||'A study in '+settings.form,margin,h-footer+w*.04,w-margin*2,w*.075);c.font=w*.018+'px Instrument Sans';captionLines(c,el('art-caption').value,margin,y+w*.01,w-margin*2,w*.027);}
  c.font='500 '+Math.max(22,w*.014)+'px Instrument Sans';c.fillText((el('brand-name').value.trim()||'assembl')+' · living studio',margin,h-margin*.65);
  const blob=await new Promise(resolve=>out.toBlob(resolve,'image/png'));if(revision!==captureRevision)return;if(!blob)throw Error('No image');
  savedFile=new File([blob],'assembl-'+captureMode+'-'+w+'x'+h+'.png',{type:'image/png'});
  if(savedURL)URL.revokeObjectURL(savedURL);savedURL=URL.createObjectURL(blob);el('preview').src=savedURL;el('preview').hidden=false;el('print-art').src=savedURL;
  el('dimensions').textContent=w+' × '+h+' px · PNG · '+(item?'rendered again at export size':'captured from the drawing canvas');
  el('download').disabled=false;el('print').disabled=false;const can=Boolean(navigator.canShare&&navigator.canShare({files:[savedFile]}));el('share').hidden=!can;el('share').disabled=!can;
  el('export-status').textContent='Ready. This preview is your exact file.';
 }catch(error){if(revision!==captureRevision)return;invalidate();el('export-status').textContent='Could not render this frame. Try a smaller frame or another world.';console.error(error);}
 finally{if(resized){resized.item.renderer.resize(resized.w,resized.h,Math.min(devicePixelRatio||1,2));draw();}button.disabled=false;}
};
el('download').onclick=()=>{if(!savedFile)return;const a=document.createElement('a');a.href=savedURL;a.download=savedFile.name;a.click();};el('share').onclick=async()=>{if(!savedFile)return;try{await navigator.share({files:[savedFile]});}catch(error){el('export-status').textContent=error.name==='AbortError'?'Sharing cancelled. Your download is still ready.':'Sharing unavailable. Use Download PNG instead.';}};el('print').onclick=()=>{if(savedFile)window.print();};
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',e=>{if(e.matches){paused=true;motion();}});
window.addEventListener('pagehide',event=>{cancelAnimationFrame(raf);raf=0;if(event.persisted)return;if(savedURL)URL.revokeObjectURL(savedURL);if(artifactURL)URL.revokeObjectURL(artifactURL);for(const {renderer} of renderers.values())renderer.dispose();});
window.addEventListener('pageshow',event=>{if(event.persisted&&!raf){last=0;raf=requestAnimationFrame(tick);resize();}});
const palettes={lilac:['#c9bcdf','#fffdfb'],cobalt:['#4263eb','#e7edff'],citrus:['#dcff54','#31212f'],rose:['#ed8bb0','#462332'],mint:['#9fdfc5','#173d36'],clay:['#c86e51','#f3e8d4'],plum:['#492b3e','#f5f1f2'],pearl:['#f4eee3','#24282f']};
document.querySelectorAll('[data-palette]').forEach(b=>b.onclick=()=>{[settings.color,settings.background]=palettes[b.dataset.palette];settings.dark=false;el('dark').checked=false;syncAtelier();draw();invalidate();});
const looks={
 porcelain:{form:'knot',material:'porcelain',lighting:'daylight',thickness:.85,flutes:0,seed:42},
 glass:{form:'bloom',material:'glass',lighting:'rose',thickness:.8,flutes:0,seed:628},
 chrome:{form:'ribbon',material:'chrome',lighting:'gallery',thickness:.6,flutes:0,seed:173},
 coral:{form:'halo',material:'coral',lighting:'daylight',thickness:1.15,flutes:10,seed:78},
};
function syncAtelier(){
 if(!el('atelier-form'))return;
 for(const [id,key]of [['form','form'],['finish','material'],['light','lighting'],['thickness','thickness'],['flutes','flutes'],['zoom','zoom'],['seed','seed'],['color','color'],['background','background'],['roughness','roughness']])el('atelier-'+id).value=settings[key];
 el('thickness-value').textContent=settings.thickness.toFixed(2);el('flutes-value').textContent=settings.flutes;
 const software=renderers.get('sculpture')?.canvas.dataset.renderer==='canvas2d';
 el('export-obj').disabled=false;
 if(software)el('atelier-notice').textContent='Software 3D · simplified reflective materials. Shape controls and mesh export remain available.';
}
function recipe(){return {schema:'assembl.living-studio/2',mode:active,settings:{...settings},time,view:renderers.get(active)?.renderer.getView?.()};}
function restoreRecipe(r){
 Object.assign(settings,cleanRecipe(r.settings));time=Number.isFinite(r.time)?Math.max(0,Math.min(r.time,86400)):0;
 renderers.get(active)?.renderer.reset(settings.seed,settings);renderers.get(active)?.renderer.setView?.(r.view);
 el('energy').value=Math.round(settings.energy*100);el('word').value=settings.word;el('dark').checked=settings.dark;
 controls();draw();invalidate();
}
for(const [id,key,numeric]of [['form','form'],['finish','material'],['light','lighting'],['thickness','thickness',true],['flutes','flutes',true],['zoom','zoom',true],['seed','seed',true],['color','color'],['background','background'],['roughness','roughness',true]]){
 el('atelier-'+id).addEventListener('input',e=>{settings[key]=numeric?Number(e.target.value):e.target.value;Object.assign(settings,cleanRecipe(settings));syncAtelier();draw();invalidate();});
}
document.querySelectorAll('[data-look]').forEach(b=>b.onclick=async()=>{await selectMode('sculpture');Object.assign(settings,defaults,looks[b.dataset.look]);time=0;renderers.get(active)?.renderer.reset(settings.seed,settings);controls();draw();invalidate();});
let artifactURL=null;
function downloadText(text,name,type){if(artifactURL)URL.revokeObjectURL(artifactURL);artifactURL=URL.createObjectURL(new Blob([text],{type}));const a=el('last-artifact');a.href=artifactURL;a.download=name;a.textContent='Download '+name;a.hidden=false;a.click();}
el('export-recipe').onclick=()=>downloadText(JSON.stringify(recipe(),null,2),'assembl-sculpture-recipe.json','application/json');
el('export-obj').onclick=()=>{const renderer=renderers.get(active)?.renderer;if(!renderer?.exportObj)return;draw();downloadText(renderer.exportObj(),'assembl-sculpture.obj','application/octet-stream');el('atelier-notice').textContent='OBJ artwork mesh prepared. Use the download link if it did not start. Printability has not been validated.';};
el('import-recipe').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>20000)throw Error('Choose a recipe smaller than 20 KB.');const r=JSON.parse(await file.text());if(r.schema!=='assembl.living-studio/2')throw Error('Choose a Living Studio recipe.');await selectMode('sculpture');restoreRecipe(r);el('atelier-notice').textContent='Recipe opened.';}catch(error){el('atelier-notice').textContent=error.message;}e.target.value='';};
el('copy-recipe').onclick=async()=>{const u=new URL(location.href);u.search='';u.searchParams.set('mode',active);u.hash='recipe='+encodeURIComponent(JSON.stringify(recipe()));el('recipe-link').value=u.href;el('recipe-link').hidden=false;try{await navigator.clipboard.writeText(u.href);el('copy-recipe').textContent='Link copied';setTimeout(()=>el('copy-recipe').textContent='Copy link',2000);}catch{el('recipe-link').focus();el('recipe-link').select();el('atelier-notice').textContent='Your recipe link is ready below. Copy the selected text, or save the recipe file.';}};
let variations=[];try{const saved=JSON.parse(localStorage.getItem('assembl-atelier-variations-v2')||'[]');if(Array.isArray(saved))variations=saved.filter(v=>v.recipe?.schema==='assembl.living-studio/2'&&typeof v.image==='string'&&v.image.startsWith('data:image/jpeg')).slice(0,8);}catch{}
function listVariations(){el('variation-grid').replaceChildren();el('variation-empty').hidden=variations.length>0;variations.forEach((v,i)=>{const b=document.createElement('button'),image=document.createElement('img'),label=document.createElement('span');image.src=v.image;image.alt='Saved '+v.recipe.settings.form+' sculpture';label.textContent=v.recipe.settings.form+' · '+v.recipe.settings.material;b.append(image,label);b.onclick=async()=>{await selectMode('sculpture');restoreRecipe(v.recipe);paused=true;motion();el('atelier-notice').textContent='Variation '+(i+1)+' restored.';};el('variation-grid').append(b);});}
el('save-variation').onclick=()=>{draw();const canvas=currentCanvas();if(!canvas)return;const out=document.createElement('canvas');out.width=300;out.height=225;const c=out.getContext('2d');c.fillStyle='#eee9ed';c.fillRect(0,0,300,225);const z=Math.min(300/canvas.width,225/canvas.height);c.drawImage(canvas,(300-canvas.width*z)/2,(225-canvas.height*z)/2,canvas.width*z,canvas.height*z);variations.unshift({recipe:recipe(),image:out.toDataURL('image/jpeg',.8)});variations=variations.slice(0,8);try{localStorage.setItem('assembl-atelier-variations-v2',JSON.stringify(variations));el('atelier-notice').textContent='Variation kept on this device.';}catch{el('atelier-notice').textContent='Kept for this visit. Device storage is unavailable; save a recipe to keep it.';}listVariations();};
listVariations();
let initialRecipe=null;try{if(location.hash.startsWith('#recipe=')){const raw=decodeURIComponent(location.hash.slice(8));if(raw.length<20000){const r=JSON.parse(raw);if(r.schema==='assembl.living-studio/2')initialRecipe=r;}}}catch{}
const requestedMode=initialRecipe?.mode||new URLSearchParams(location.search).get('mode');
const initialMode=modern[requestedMode]?requestedMode:'sculpture';
legacy=await window.legacyStudioReady;
await document.fonts.ready;
await selectMode(initialMode);if(initialRecipe)restoreRecipe(initialRecipe);motion();requestAnimationFrame(tick);
// Every thumbnail is a captured frame from its actual renderer, never a concept image.
for(const id of ['liquid','garden','fluid']){try{rendererFor(id);thumbnail(id);}catch(error){console.warn(id+' thumbnail unavailable',error);}}

