import {PROJECT,CHAPTERS,OPTIONS,RESERVED,readState,safeState,stateQuery,packet,escapeHtml,validateGlb} from './data.js';
const $=id=>document.getElementById(id);
let state=readState(location.search),viewer=null,customModel=false,questions=[],downloadURL=null,visibilityModel='';
try{const raw=JSON.parse(localStorage.getItem('assembl-whaiao-questions')||'[]');if(Array.isArray(raw))questions=raw.filter(x=>typeof x==='string').map(x=>x.slice(0,500)).slice(0,20);}catch{}
const fallback=$('plan');
const status=text=>$('view-status').textContent=text;
function currentChapter(){return CHAPTERS.find(c=>c.id===state.chapter)||CHAPTERS[0];}
function plan(){
 const roof=state.roof?'#d3d7cd':'#f5efe5',o=OPTIONS[state.option];
 fallback.innerHTML='<svg viewBox="0 0 760 480" role="img" aria-label="Plan of the illustrative pavilion. Use the room buttons or chapter list to explore.">'+
 '<rect width="760" height="480" fill="#e9e6df"/><rect x="54" y="30" width="650" height="410" rx="3" fill="#c8cbbb"/>'+
 '<rect x="91" y="333" width="576" height="62" fill="#b18f6a"/><rect x="112" y="92" width="225" height="240" fill="'+roof+'" stroke="#777f73" stroke-width="3"/>'+
 '<rect x="447" y="143" width="170" height="169" fill="'+roof+'" stroke="#777f73" stroke-width="3"/>'+
 '<rect x="337" y="250" width="110" height="82" fill="#e1ddd2"/><rect x="252" y="55" width="309" height="50" fill="'+roof+'" stroke="#777f73" stroke-width="2"/>'+
 '<rect x="'+(state.option==='garden'?340:355)+'" y="160" width="'+(state.option==='garden'?100:70)+'" height="'+(state.option==='garden'?83:62)+'" fill="#9eaa89"/>'+
 (state.roof?'<rect x="274" y="283" width="282" height="'+(o.canopyDepth*15)+'" fill="#7a847b" opacity=".65"/>':'')+
 '<g fill="#3c443d" font-family="Arial,sans-serif" font-size="14" text-anchor="middle"><text x="225" y="200">Shared room</text><text x="532" y="229">Flexible room</text><text x="390" y="350">Arrival terrace</text><text x="390" y="270">Courtyard</text></g>'+
 '<text x="60" y="465" fill="#5e665a" font-family="Arial,sans-serif" font-size="11">Illustrative plan · not a Whaiao project or construction drawing</text></svg>';
}
function render(){
 const chapter=currentChapter(),o=OPTIONS[state.option];
 $('chapter-list').replaceChildren(...CHAPTERS.map(c=>{const b=document.createElement('button');b.type='button';b.setAttribute('aria-current',String(c.id===state.chapter));b.className='chapter';const n=document.createElement('span'),label=document.createElement('b');n.textContent=c.number;label.textContent=c.title;b.append(n,label);b.onclick=()=>select(c.id);b.disabled=customModel;return b;}));
 $('chapter-eyebrow').textContent=customModel?'YOUR MODEL · LOCAL VIEW':chapter.eyebrow;
 $('chapter-title').textContent=customModel?'Your model is open.':chapter.title;
 $('chapter-story').textContent=customModel?'The model stays in this browser. The demonstration story points are hidden because they do not describe this building. Orbit the model, then ask Whaiao to define and approve the project chapters and viewpoints.':chapter.story;
 $('choice-title').textContent=chapter.choice;$('choice-reason').textContent=chapter.reason;$('discussion-question').textContent=chapter.question;$('stage-label').textContent=chapter.stage;
 $('chapter-detail').hidden=customModel;$('room-list').hidden=customModel;$('roof').disabled=customModel;$('roof').setAttribute('aria-pressed',String(state.roof));$('roof').textContent=state.roof?'Open the roof':'Show the roof';
 $('light').textContent=state.light==='day'?'Evening light':'Daylight';$('light').setAttribute('aria-pressed',String(state.light==='evening'));
 $('option-name').textContent=o.name;$('option-description').textContent=o.description;
 $('covered-area').textContent=String(o.canopyDepth*o.canopyWidth)+' m²';$('garden-area').textContent=String(o.gardenWidth*o.gardenDepth)+' m²';
 document.querySelectorAll('[name=option]').forEach(el=>{el.checked=el.value===state.option;el.disabled=customModel;});
 $('options-section').hidden=customModel;$('reset-model').hidden=!customModel;$('model-name').textContent=customModel?visibilityModel:'Illustrative spatial study';
 $('model-truth').textContent=customModel?'Local model · narrative and sharing not configured':'Demonstration model · not a Whaiao design';
 const index=CHAPTERS.findIndex(c=>c.id===state.chapter);$('previous').disabled=customModel||index===0;$('next').disabled=customModel||index===CHAPTERS.length-1;
 $('chapter-count').textContent=String(index+1)+' / '+String(CHAPTERS.length);
 $('summary-option').textContent=o.name;plan();viewer?.update(state);
 const u=new URL(location.href);u.search=stateQuery(state);u.hash='';history.replaceState(null,'',u);
}
function select(id){
 state=safeState({...state,chapter:id,...(['gather','make'].includes(id)?{roof:false}:{})});render();const c=currentChapter(),r=PROJECT.rooms.find(r=>r.id===c.room);
 viewer?.view(c.view||r?.view||[24,21,27],c.target||r?.target||[0,0,0]);
 $('chapter-title').focus({preventScroll:true});
}
$('room-list').replaceChildren(...PROJECT.rooms.map(r=>{const b=document.createElement('button');b.type='button';b.textContent=r.label;b.onclick=()=>select(r.id);return b;}));
document.querySelectorAll('[name=option]').forEach(r=>r.onchange=()=>{state=safeState({...state,option:r.value});render();});
$('roof').onclick=()=>{state={...state,roof:!state.roof};render();};
$('light').onclick=()=>{state={...state,light:state.light==='day'?'evening':'day'};render();};
$('plan-view').onclick=()=>viewer?.view([0,38,.01],[0,0,0]);
$('whole-view').onclick=()=>customModel?viewer?.fit():viewer?.view([24,21,27],[0,0,0]);
$('previous').onclick=()=>select(CHAPTERS[Math.max(0,CHAPTERS.findIndex(c=>c.id===state.chapter)-1)].id);
$('next').onclick=()=>select(CHAPTERS[Math.min(CHAPTERS.length-1,CHAPTERS.findIndex(c=>c.id===state.chapter)+1)].id);
function questionList(){
 $('question-list').replaceChildren(...questions.map((q,i)=>{const li=document.createElement('li'),text=document.createElement('span'),b=document.createElement('button');text.textContent=q;b.type='button';b.textContent='Remove';b.setAttribute('aria-label','Remove question '+String(i+1));b.onclick=()=>{questions.splice(i,1);saveQuestions();};li.append(text,b);return li;}));
 $('questions-empty').hidden=questions.length>0;
}
function saveQuestions(){try{localStorage.setItem('assembl-whaiao-questions',JSON.stringify(questions));$('question-status').textContent='Saved on this device. Nothing has been sent.';}catch{$('question-status').textContent='Kept for this visit. Device storage is unavailable.';}questionList();}
$('question-form').onsubmit=e=>{e.preventDefault();const q=$('question').value.trim();if(!q)return;if(questions.length>=20){$('question-status').textContent='Keep up to 20 questions. Remove one to add another.';return;}questions.push(q.slice(0,500));$('question').value='';saveQuestions();};
$('share').onclick=async()=>{
 const u=new URL(location.href);u.search=stateQuery(state);u.hash='';$('share-link').value=u.href;$('share-link').hidden=false;
 try{await navigator.clipboard.writeText(u.href);$('share-status').textContent='Link copied. It contains the demonstration chapter, option and light settings only.';}catch{$('share-link').focus();$('share-link').select();$('share-status').textContent='Your link is selected below. Copy it to revisit this demonstration view.';}
 if(customModel)$('share-status').textContent='This link opens the illustrative study. Your local model and questions are not included.';
};
function download(content,type,name){if(downloadURL)URL.revokeObjectURL(downloadURL);downloadURL=URL.createObjectURL(new Blob([content],{type}));const a=$('last-download');a.href=downloadURL;a.download=name;a.hidden=false;a.textContent='Download '+name;a.click();}
function summaryContent(includeImage=true){
 const p=packet(state,questions,$('include-questions').checked),e=escapeHtml;
 let image='';if(includeImage&&$('include-image').checked&&!customModel){try{const uri=viewer?.capture();if(uri?.startsWith('data:image/png'))image='<img class="summary-image" alt="View of the illustrative pavilion" src="'+uri+'">';}catch{}}
 return '<header><p class="summary-kicker">assembl · project story</p><h1>'+e(p.project)+'</h1><p>'+e(p.revision)+' · after-hui discussion pack</p></header>'+
 '<p class="summary-truth">'+e(p.truth)+'</p>'+image+
 '<section><h2>The option on screen</h2><h3>'+e(p.selectedOption)+'</h3><p>'+e(p.optionStatus)+'. Covered edge: '+String(p.areas.covered)+' m². Planted area: '+String(p.areas.planted)+' m². Illustrative model areas only; no cost or compliance assessment.</p></section>'+
 '<section><h2>The questions to carry forward</h2>'+p.chapters.map(c=>'<article><h3>'+e(c.title)+'</h3><p><b>'+e(c.designChoice)+'</b>. '+e(c.reason)+'</p><p class="summary-question">'+e(c.discussionQuestion)+'</p></article>').join('')+'</section>'+
 (p.myQuestions?.length?'<section><h2>My questions · included by choice</h2><ol>'+p.myQuestions.map(q=>'<li>'+e(q)+'</li>').join('')+'</ol></section>':'')+
 '<section><h2>Before this becomes a real project story</h2><ol>'+p.nextSteps.map(s=>'<li>'+e(s)+'</li>').join('')+'</ol></section>'+
 '<footer>Source: '+e(p.source)+'<br>www.assembl.co.nz · independent demonstration</footer>';
}
$('prepare-summary').onclick=()=>{$('summary-preview').innerHTML=summaryContent();$('summary-dialog').showModal();};
$('close-summary').onclick=()=>$('summary-dialog').close();
$('download-summary').onclick=()=>{
 const content='<!doctype html><html lang="en-NZ"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Project story · after-hui pack</title><style>body{font:16px/1.65 system-ui,sans-serif;color:#393c34;background:#fffdf8;max-width:850px;margin:auto;padding:40px}h1{font-size:46px;line-height:1.1}h2{margin-top:40px}article{border-top:1px solid #dcded5;padding:20px 0}li{margin:10px 0}.summary-truth{background:#eceee5;padding:20px}.summary-image{max-width:100%;height:auto}footer{margin-top:40px;font-size:12px;color:#69705f}@media print{body{padding:0}article{break-inside:avoid}}</style></head><body>'+summaryContent()+'</body></html>';
 download(content,'text/html','assembl-project-story-after-hui.html');
};
$('download-json').onclick=()=>download(JSON.stringify(packet(state,questions,$('include-questions').checked),null,2),'application/json','assembl-project-story-handoff.json');
$('print-summary').onclick=()=>{$('print-sheet').innerHTML=summaryContent();window.print();};
$('open-model').onclick=()=>$('model-dialog').showModal();$('close-model').onclick=()=>$('model-dialog').close();
$('model-file').onchange=async e=>{
 const file=e.target.files[0];if(!file)return;
 $('model-result').textContent='Checking the model…';$('load-model').disabled=true;
 try{
  if(!viewer)throw Error('The 3D renderer is unavailable here. The illustrative plan and story still work.');
  if(file.size>25*1024*1024)throw Error('Choose a web-optimised GLB smaller than 25 MB.');
  const buffer=await file.arrayBuffer(),json=validateGlb(buffer);
  const primitives=(json.meshes||[]).flatMap(m=>m.primitives||[]),accessors=new Set(primitives.map(p=>p.attributes?.POSITION).filter(x=>x!=null));
  const vertices=[...accessors].reduce((sum,id)=>sum+(json.accessors?.[id]?.count||0),0);
  if(primitives.length>800||vertices>600000||(json.images||[]).length>32)throw Error('This model exceeds the demonstration budget. Export up to 600,000 vertices, 800 mesh primitives and 32 embedded images.');
  await viewer.loadGLB(buffer);customModel=true;visibilityModel=file.name.slice(0,120);render();$('model-result').textContent='Opened locally. Your file has not been uploaded.';$('model-dialog').close();
 }catch(error){$('model-result').textContent=error.message||'The model could not be opened.';}
 finally{$('load-model').disabled=false;e.target.value='';}
};
$('load-model').onclick=()=>$('model-file').click();
$('reset-model').onclick=()=>{customModel=false;visibilityModel='';viewer?.resetModel();render();status('Illustrative model restored. Drag to orbit or select a chapter.');};
$('permission-list').replaceChildren(...RESERVED.map(r=>{const li=document.createElement('li'),b=document.createElement('b'),p=document.createElement('p');b.textContent=r.title+' · '+r.state;p.textContent=r.reason;li.append(b,p);return li;}));
questionList();render();
import('./viewer.js').then(({createViewer})=>{
 viewer=createViewer($('model-host'),select,status);$('spatial-stage').classList.add('has-3d');viewer.update(state);const c=currentChapter(),r=PROJECT.rooms.find(r=>r.id===c.room);viewer.view(c.view||r?.view||[24,21,27],c.target||r?.target||[0,0,0]);status('Illustrative 3D model ready. Drag to orbit; arrow keys turn the view.');
}).catch(error=>{status(error.message||'Plan view is available. The story and comparisons still work.');$('plan-view').disabled=true;$('whole-view').disabled=true;$('load-model').disabled=true;$('light').disabled=true;});
window.addEventListener('pagehide',()=>{viewer?.dispose();if(downloadURL)URL.revokeObjectURL(downloadURL);});
