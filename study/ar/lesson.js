import {mountStudyAR} from './delivery.js';
const mounted=new WeakSet();
export async function mountLessonAR(id){
 if(!document.querySelector('link[data-study-ar-css]')){const link=document.createElement('link');link.rel='stylesheet';link.href='/study/ar/delivery.css';link.dataset.studyArCss='';document.head.append(link)}
 let host=document.querySelector(`[data-study-ar="${id}"]:not(script)`);
 if(!host){host=document.createElement('section');host.dataset.studyAr=id;host.setAttribute('aria-label','Explore in your space');host.style.cssText='margin:24px auto;max-width:600px;width:calc(100% - 32px)';(document.querySelector('main')||document.querySelector('#app')||document.body).append(host)}
 if(mounted.has(host))return;mounted.add(host);
 const result=await mountStudyAR(host,id);host.classList.add('study-ar-lesson');
 const launch=host.querySelector('.study-ar-launch');
 const more=document.createElement('details'),summary=document.createElement('summary');summary.textContent='3D files & sharing';more.append(summary);
 for(const child of [...host.children])if(child!==launch)more.append(child);
 if(launch){const note=document.createElement('p');note.className='study-ar-brief';note.textContent='Prepared 3D model. Lesson controls stay in this browser.';host.append(note)}
 host.append(more);return result;
}
for(const script of document.querySelectorAll('script[src="/study/ar/lesson.js"][data-study-ar]')){
 const start=()=>mountLessonAR(script.dataset.studyAr);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
}
