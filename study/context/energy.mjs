import {mountWeatherContext} from './panel.mjs';
const api=window.StudyKit?.current?.api,notebook=document.querySelector('#k-lesson-work');
if(api&&notebook){
 const host=document.createElement('section');notebook.after(host);mountWeatherContext(host);
 const sync=()=>{host.hidden=api.step.k!=='flask'};sync();
 window.addEventListener('study:energy-topic',sync);
}
