import {createTeardown,fmt} from '/study/teardown/kit/teardown.js';
import * as model from './model.js';
import {build} from './machine.js';
const truth={label:'Ideal water model',note:'1 kg water starts at 20 °C. Constant net cooling, equilibrium freezing at 0 °C. Pink colour is illustrative; sugar, heat leaks and motor heat are excluded. Not a drink recipe or commercial appliance prediction.'};
const api=await createTeardown({id:'slushie',title:'Make it slush.',subtitle:'Cool it. Mix it. Find the sweet spot.',intro:false,start:900,cycleSeconds:90,step:60,groundY:-21,
 canvasLabel:'Original slush machine cutaway: horizontal clear freezing bowl, rotating helical scraper, tap, compressor, connected refrigeration tubing and condenser',
 model:{period:1800,unit:' s',at:model.at,checks:model.checks,inputs:[{key:'cooling',label:'Cooling power',min:0,max:350,step:10,value:200,format:v=>v+' W'},{key:'rpm',label:'Mix speed',min:0,max:60,step:2,value:24,format:v=>v+' rpm'}]},
 build,truth:[truth],live:{label:'Ice fraction',unit:'%',digits:0,value:s=>s.ice*100,a:s=>s.stage,b:s=>fmt(s.temperature,1)+' °C'},readouts:[{label:'Time in batch',get:s=>fmt(s.seconds/60,1)+' min'},{label:'Heat removed',get:s=>fmt(s.energy/1000,1)+' kJ'}],
 status:()=> 'Drag to explore · teaching model',say:s=>s.stage,
 subsystems:[{key:'bowl',label:'Bowl'},{key:'mix',label:'Mixing'},{key:'cooling',label:'Cooling'},{key:'body',label:'Body'}],
 views:{exploded:{hidden:true,az:65,el:15,dist:220,narrowDist:290,target:[0,4,0]},hero:{label:'Hero',az:70,el:10,dist:137,narrowDist:195,target:[0,3,0]},rear:{label:'Drive side',az:135,el:15,dist:145,narrowDist:180,target:[0,3,0]},apart:{hidden:true,az:30,el:20,dist:230,narrowDist:290,target:[0,3,0]}},
 callouts:[],sources:[{label:'OpenStax: phase change and latent heat',href:'https://openstax.org/books/college-physics-2e/pages/14-3-phase-change-and-latent-heat',note:'Q = mcΔT before freezing; Q = mL during freezing. Values used: c = 4,180 J kg⁻¹ K⁻¹ and L = 334,000 J kg⁻¹.'},{label:'Original Assembl teaching design',note:'Geometry is illustrative, not a manufacturer’s model. A helical scraper turns around a cold drum; the refrigeration circuit carries heat away. Real drinks freeze over a range because of dissolved sugar.'}],
});
api.setLabels(false);
const fallback=document.querySelector('.tdk-fallback p');if(fallback)fallback.textContent='Your browser could not start 3D. The numerical cooling model still works; try a WebGL-capable browser to inspect the machine.';
const $=s=>document.querySelector(s);
const left=$('.tdk-console > .tdk-col');
const actions=document.createElement('div');actions.className='slush-actions';
const play=$('[data-act=play]');actions.append(play);
const inside=document.createElement('button');inside.className='tdk-btn';inside.textContent='Take it apart';inside.setAttribute('aria-pressed','false');inside.onclick=()=>{api.freeze(false);const on=inside.getAttribute('aria-pressed')!=='true';inside.setAttribute('aria-pressed',on);inside.textContent=on?'Put it together':'Take it apart';api.setAssembly(on?0:1);api.setView(on?'apart':'hero')};actions.append(inside);
const reset=document.createElement('button');reset.className='tdk-btn';reset.textContent='New batch';reset.onclick=()=>{api.seek(0);api.freeze(false);api.play(true)};actions.append(reset);
left.append(actions);
const timeline=document.createElement('label');timeline.className='batch-scrub';timeline.innerHTML='<span>Explore the batch <output id="batch-time"></output></span><input type="range" min="0" max="1799" value="900" aria-label="Batch time in seconds">';left.append(timeline);timeline.querySelector('input').oninput=e=>{api.play(false);api.seek(Number(e.target.value));api.freeze(false)};play.addEventListener('click',()=>api.freeze(false));
const note=document.createElement('p');note.className='mini-note';note.textContent='A 30-minute batch, sped up. Mixing shown slowly. Try zero cooling: stirring alone won’t freeze it.';left.append(note);
const details=document.createElement('details');details.className='science';details.innerHTML='<summary>What’s the science?</summary><p>Cooling first lowers the temperature. At 0°C, more energy must leave to form ice, even though the temperature stays steady. That is latent heat.</p><p>Mixing scrapes and distributes ice; this simple model does not predict crystal size or texture. Compare cooling settings for the whole batch, not a mid-batch change. Pink represents an illustrative water mixture, not a sugar-containing drink.</p>';details.append($('.tdk-below'));$('.tdk').append(details);
const oldDock=$('.tdk-dock');oldDock.hidden=true;
const controls=document.createElement('div');controls.className='slush-view-controls';for(const s of ['[data-view=hero]','[data-view=rear]','[data-tgl=explode]'])controls.append($(s));$('.tdk-centre').append(controls);
function ui(){const s=api.state();if(api.playing)timeline.querySelector('input').value=s.seconds;$('#batch-time').textContent=fmt(s.seconds/60,1)+' min';play.textContent=api.playing?'Pause mixing':'Start mixing';requestAnimationFrame(ui)}ui();
