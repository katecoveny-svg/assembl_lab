import {tideCard} from './tide-card.js?v=310406fd5e';
export function lab(asset){const $=s=>document.querySelector(s);
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

}
