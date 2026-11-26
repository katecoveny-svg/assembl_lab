const open=document.querySelector('#open-garden'),close=document.querySelector('#leave-garden');
const host=document.querySelector('.garden-window'),note=document.querySelector('#garden-state');
let frame;
open.onclick=()=>{
 if(frame)return;
 frame=document.createElement('iframe');
 frame.title='Paint the Aotearoa planting bed';frame.src='/nz-planting-studio/classic?view=bed&entry=paint';
 frame.addEventListener('load',()=>{note.textContent='Aotearoa Planting Studio · paint the soil'});
 host.append(frame);open.hidden=true;open.setAttribute('aria-expanded','true');close.hidden=false;note.textContent='Opening the garden…';
};
close.onclick=()=>{
 frame?.remove();frame=null;close.hidden=true;open.hidden=false;open.setAttribute('aria-expanded','false');note.textContent='Aotearoa Planting Studio';open.focus({preventScroll:true});
};
