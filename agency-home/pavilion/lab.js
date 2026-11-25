import {setupPlanReveal} from './plan-reveal.js';
import {tideCard} from './tide-card.js';
export function lab(asset){const $=s=>document.querySelector(s);
const plates={drawing:['plan16a.webp','Floor plan','Floor plan of the two-bedroom timber home with a deck along the living area.'],model:['16a-model-to-site-poster.webp','Site model','Aerial visualisation of the two timber homes and the existing house.'],exterior:['16a-poster.webp','Evening exterior','Visualisation of the two timber homes at dusk.']};
$('.arch-views').hidden=false;
const activeMotion=matchMedia('(prefers-reduced-motion: reduce)'),prior=$('#prior-plate'),caseImage=$('#arch-img');let plate='exterior',transition=0;
const sectionVisibility=setupPlanReveal(asset);
function showPlate(key,action){
 sectionVisibility(key==='section');if(key===plate)return;
 if(key==='section'){plate=key;++transition;prior.hidden=true;$('#arch-label').textContent='16C · Registered section';$('#arch-context').textContent='Selected view · Registered plan and model';
 $('#brief-16a a[href^="mailto"]').href='mailto:assembl@assembl.co.nz?subject=A%20project%20like%2016A&body=I%20was%20looking%20at%20the%20registered%2016C%20plan%20and%20model.';
 document.querySelectorAll('[data-plate]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.plate===key)));return}
 const [name,title,alt]=plates[key],oldKey=plate;plate=key;const token=++transition;
 if(!activeMotion.matches){prior.src=caseImage.src;prior.toggleAttribute('data-drawing',oldKey==='drawing');prior.hidden=false;prior.getAnimations().forEach(a=>a.cancel());prior.animate([{opacity:1},{opacity:0}],{duration:380,fill:'forwards'}).finished.then(()=>{if(token===transition)prior.hidden=true}).catch(()=>{})}
 delete caseImage.dataset.image;caseImage.src=asset(name);caseImage.alt=alt;caseImage.toggleAttribute('data-drawing',key==='drawing');$('#arch-label').textContent=title;
 $('#arch-context').textContent='Selected view · '+title;$('#brief-16a a[href^="mailto"]').href='mailto:assembl@assembl.co.nz?subject='+encodeURIComponent('A project like 16A')+'&body='+encodeURIComponent('I was looking at the 16A '+title.toLowerCase()+' study.');
 document.querySelectorAll('[data-plate]').forEach(b=>b.setAttribute('aria-pressed',String(key===b.dataset.plate)));
 if(action)window.dispatchEvent(new CustomEvent('assembl:interaction',{detail:{name:'plate_selected',value:key}}));
}
document.querySelectorAll('[data-plate]').forEach(b=>b.onclick=()=>showPlate(b.dataset.plate,true));
showPlate('exterior',false);
const filmWrap=$('.film-wrap'),copyBlocks=[$('.opening'),$('.film-caption'),$('.lab-intro'),filmWrap];
let editorialFrame=0;
function editorialScroll(){
 if(!editorialFrame)editorialFrame=requestAnimationFrame(()=>{
  editorialFrame=0;
  if(activeMotion.matches)return;
  for(const block of copyBlocks){
   const r=block.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight)continue;
   const progress=Math.max(-1,Math.min(1,(innerHeight/2-r.top-r.height/2)/(innerHeight/2+r.height/2)));
   block.style.setProperty('--text-drift',(progress*(innerWidth<=680?8:17)).toFixed(1)+'px');
   if(block===filmWrap)block.style.setProperty('--film-drift',(progress*1.8).toFixed(2)+'%');
  }
 });

}
window.addEventListener('scroll',editorialScroll,{passive:true});window.addEventListener('resize',editorialScroll);editorialScroll();
tideCard(asset);
let audioContext,soundOn=false;
const soundControl=$('#sound');
soundControl.hidden=false;
function clickSound(){
 if(!soundOn||!audioContext||audioContext.state!=='running')return;
 const click=audioContext.createOscillator(),gain=audioContext.createGain(),t=audioContext.currentTime;
 click.type='sine';click.frequency.setValueAtTime(530,t);click.frequency.exponentialRampToValueAtTime(175,t+.026);
 gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(.042,t+.002);gain.gain.exponentialRampToValueAtTime(.0001,t+.029);
 click.connect(gain);gain.connect(audioContext.destination);click.start(t);click.stop(t+.031);
}
soundControl.addEventListener('click',async()=>{
 if(soundOn){soundOn=false;await audioContext.suspend()}else{
 const AudioAPI=window.AudioContext||window.webkitAudioContext;if(!AudioAPI)return;
 try{audioContext??=new AudioAPI();await audioContext.resume();soundOn=true;clickSound()}catch{return}
 }
 soundControl.setAttribute('aria-pressed',String(soundOn));soundControl.setAttribute('aria-label',soundOn?'Mute interface click sound':'Enable interface click sound');soundControl.textContent=soundOn?'Sound on':'Sound off';
});
document.addEventListener('click',e=>{if(e.isTrusted&&e.target.closest('button,a')&&e.target!==soundControl)clickSound()});

 const film=$('.film-wrap video'),play=$('#play-film');
 const source='https://lab.assembl.co.nz/media/work/waiheke-flythrough.mp4';
 let onScreen=false,autoTried=false,manualPlayback=false,resumeWhenVisible=false;
 play.hidden=false;
 async function playFilm(manual){
  manualPlayback=manual;
  if(!film.hasAttribute('src'))film.src=source;
  film.hidden=false;film.muted=true;
  try{await film.play()}catch{
   if(!film.paused)return;
   film.classList.remove('playing');play.hidden=false;
  }
 }
 film.addEventListener('playing',()=>{
  if(document.hidden||!onScreen&&!manualPlayback){film.pause();return}
  film.classList.add('playing');play.hidden=true;
 });
 film.addEventListener('ended',()=>{film.classList.remove('playing');play.hidden=false;play.textContent='Replay fly-through ▷'});
 film.addEventListener('error',()=>{film.classList.remove('playing');film.hidden=true;film.removeAttribute('src');play.hidden=false;play.textContent='Retry fly-through'});
 function syncFilm(){
  const net=navigator.connection;
  const restricted=activeMotion.matches||net?.saveData||matchMedia('(prefers-reduced-data: reduce)').matches
   ||['3g','2g','slow-2g'].includes(net?.effectiveType)||(net?.downlink>0&&net.downlink<.7)
   ||(navigator.deviceMemory>0&&navigator.deviceMemory<4)||(navigator.hardwareConcurrency>0&&navigator.hardwareConcurrency<4);
  if(document.hidden||!onScreen||restricted&&!manualPlayback){
   if(!film.paused){resumeWhenVisible=true;film.pause()}return;
  }
  if(resumeWhenVisible){resumeWhenVisible=false;playFilm(manualPlayback);return}
  if(!manualPlayback&&!autoTried&&!restricted){autoTried=true;playFilm(false)}
 }
 play.onclick=()=>{autoTried=true;playFilm(true)};
 new IntersectionObserver(([e])=>{onScreen=e.intersectionRatio>=.32;syncFilm()},{threshold:[0,.32]}).observe(filmWrap);
 activeMotion.addEventListener('change',syncFilm);navigator.connection?.addEventListener('change',syncFilm);
 document.addEventListener('visibilitychange',syncFilm);
}
