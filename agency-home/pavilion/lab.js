import {tideCard} from './tide-card.js';
export function lab(asset){const $=s=>document.querySelector(s);
const plates={drawing:['plan16a.webp','Floor plan','Floor plan of the two-bedroom timber home with a deck along the living area.'],model:['16a-model-to-site-poster.webp','Site model','Aerial visualisation of the two timber homes and the existing house.'],exterior:['16a-poster.webp','Evening exterior','Visualisation of the two timber homes at dusk.']};
$('.arch-views').hidden=false;
const activeMotion=matchMedia('(prefers-reduced-motion: reduce)'),prior=$('#prior-plate'),caseImage=$('#arch-img');let plate='exterior',manual=false,transition=0;
function showPlate(key,action){
 if(action)manual=true;if(key===plate)return;
 const [name,title,alt]=plates[key],oldKey=plate;plate=key;const token=++transition;
 if(!activeMotion.matches){prior.src=caseImage.src;prior.toggleAttribute('data-drawing',oldKey==='drawing');prior.hidden=false;prior.getAnimations().forEach(a=>a.cancel());prior.animate([{opacity:1},{opacity:0}],{duration:380,fill:'forwards'}).finished.then(()=>{if(token===transition)prior.hidden=true}).catch(()=>{})}
 delete caseImage.dataset.image;caseImage.src=asset(name);caseImage.alt=alt;caseImage.toggleAttribute('data-drawing',key==='drawing');$('#arch-label').textContent=title;
 $('#arch-context').textContent='Selected view · '+title;$('#brief-16a a[href^="mailto"]').href='mailto:assembl@assembl.co.nz?subject='+encodeURIComponent('A project like 16A')+'&body='+encodeURIComponent('I was looking at the 16A '+title.toLowerCase()+' study.');
 document.querySelectorAll('[data-plate]').forEach(b=>b.setAttribute('aria-pressed',String(key===b.dataset.plate)));
 if(action)window.dispatchEvent(new CustomEvent('assembl:interaction',{detail:{name:'plate_selected',value:key}}));
}
document.querySelectorAll('[data-plate]').forEach(b=>b.onclick=()=>showPlate(b.dataset.plate,true));
function editorialScroll(){const r=$('.film-wrap').getBoundingClientRect();if(!activeMotion.matches&&r.bottom>0&&r.top<innerHeight)$('.film-wrap').style.setProperty('--film-drift',((.5-(r.top+r.height/2)/innerHeight)*2.0).toFixed(2)+'%');
 if(manual||innerWidth<=680||activeMotion.matches)return;const run=$('.plate-run').getBoundingClientRect(),h=$('.plate').offsetHeight;
 if(run.top<innerHeight*.9&&run.bottom>0){const progress=Math.max(0,Math.min(1,(-run.top+innerHeight*.025)/Math.max(1,run.height-h)));showPlate(progress<.25?'drawing':progress<.66?'model':'exterior',false)}
}
window.addEventListener('scroll',editorialScroll,{passive:true});window.addEventListener('resize',editorialScroll);
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

 const film=$('.film-wrap video'),play=$('#play-film');play.hidden=false;
 play.onclick=async()=>{film.src='https://lab.assembl.co.nz/media/work/waiheke-flythrough.mp4';film.hidden=false;play.hidden=true;try{await film.play()}catch{film.hidden=true;play.hidden=false;play.textContent='Film needs a connection · Retry'}};
 film.onended=()=>{film.hidden=true;play.hidden=false;play.textContent='Replay fly-through ▷'};
}