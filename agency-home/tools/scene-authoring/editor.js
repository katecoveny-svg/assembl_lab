import {getProject} from '@theatre/core';
import studio from '@theatre/studio';
import state from './waiheke.theatre.json';

studio.initialize({usePersistentStorage:false});
const project=getProject('Waiheke',{state});
const sheet=project.sheet('Pavilion');
const camera=sheet.object('Camera',{travel:0,dining:0});
const frame=document.querySelector('iframe');
const send=()=>frame.contentWindow?.postMessage({type:'waiheke-rehearsal',...camera.value},location.origin);
camera.onValuesChange(send);
window.addEventListener('message',e=>{if(e.origin===location.origin&&e.source===frame.contentWindow&&e.data==='pavilion-ready')send()});
const slider=document.querySelector('input');
slider.max=state.sheetsById.Pavilion.sequence.length;
slider.oninput=()=>{sheet.sequence.pause();sheet.sequence.position=Number(slider.value);send()};
document.querySelector('#play').onclick=async()=>{await project.ready;sheet.sequence.position=0;sheet.sequence.play()};
document.querySelector('#export').onclick=()=>{
 const blob=new Blob([JSON.stringify(studio.createContentOfSaveFile('Waiheke'),null,2)+'\n'],{type:'application/json'});
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='waiheke.theatre.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);
};
studio.setSelection([camera]);
