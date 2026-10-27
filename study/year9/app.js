// assembly Year 9 studio: four small tools that run entirely in the browser.
// Study sprint (worked example → your turn → explain), app builder (tested templates, no AI call),
// vision detective (classical pixel measurements), AI judgement (answers checked against a source card).
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const REDUCED=matchMedia('(prefers-reduced-motion: reduce)').matches;
const store={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch{return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}}};
function download(name,content,type='text/html'){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000)}

// ---------------------------------------------------------------- tool tabs (hash is shareable: #study #code #vision #ai)
const TOOLS=['study','code','vision','ai'];
function selectTool(id,focus=false,remember=true){
 if(!TOOLS.includes(id))id='study';
 TOOLS.forEach(t=>{const on=t===id;$('tab-'+t).setAttribute('aria-selected',String(on));$('tab-'+t).tabIndex=on?0:-1;$('panel-'+t).hidden=!on});
 if(focus)$('tab-'+id).focus();
 if(remember)history.replaceState(null,'','#'+id);
}
TOOLS.forEach((t,i)=>{
 $('tab-'+t).addEventListener('click',()=>selectTool(t));
 $('tab-'+t).addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();
  const n=e.key==='Home'?0:e.key==='End'?TOOLS.length-1:(i+(e.key==='ArrowRight'?1:-1)+TOOLS.length)%TOOLS.length;selectTool(TOOLS[n],true)});
});
document.querySelectorAll('[data-tool-link]').forEach(a=>a.addEventListener('click',()=>selectTool(a.dataset.toolLink)));
{const h=location.hash.slice(1);selectTool(TOOLS.includes(h)?h:'study',false,false)}

// ---------------------------------------------------------------- 1 · study sprint
const STUDY={
 science:{machine:'/study/junior/?m=reactions',machineTitle:'The reaction chamber',machineText:'Change temperature and concentration, watch the particle collisions, then come back and explain the pattern.',
  workedTitle:'Worked example: particles and temperature',workedText:'Two samples have the same concentration. Sample A is at 20 °C. Sample B is at 40 °C. Which reacts faster, and why?',
  workedAnswer:'<b>Sample B.</b> Its particles have more kinetic energy on average. They collide more often, and more of those collisions have enough energy to react. Temperature changes the chance of a successful collision; it doesn’t make more particles.',
  questionTitle:'Your turn: concentration',questionText:'A third sample stays at 20 °C, but its reactant concentration is doubled. What happens to the reaction rate, and what is the particle-level reason?',
  hint:'Picture the same volume with twice as many reactant particles. What changes about the collisions?',placeholder:'The rate… because the particles…',
  check:v=>/faster|increase|quicker|greater|higher|speeds? up|goes up/.test(v)&&/collid|collision/.test(v)&&/more|often|frequen/.test(v),
  success:'Yes. A higher concentration puts more reactant particles in the same volume, so collisions happen more often. Temperature is the same in this comparison.',
  retry:'Say what happens to the rate, then link it to how often particles collide. More particles in the same space means more frequent collisions.'},
 maths:{machine:'/study/m/lines.html#rule',machineTitle:'The straight-line machine',machineText:'Find the rule from two tanks filling and draining: gradient, intercept and y = mx + c.',
  workedTitle:'Worked example: find the rule',workedText:'A straight line passes through (0, 2) and (2, 8). Find its equation.',
  workedAnswer:'The intercept is <b>2</b>. The gradient is rise ÷ run = (8 − 2) ÷ (2 − 0) = <b>3</b>. So the rule is <b>y = 3x + 2</b>. Check: when x = 2, y = 3 × 2 + 2 = 8.',
  questionTitle:'Your turn: build the equation',questionText:'A line passes through (0, 1) and (3, 10). Write its equation in the form y = mx + c.',
  hint:'The intercept is the y-value when x = 0. For the gradient, work out (10 − 1) ÷ (3 − 0).',placeholder:'y = …',
  check:v=>{const t=v.toLowerCase().replace(/\s/g,'').replace(/−/g,'-').replace(/^y=/,'');return t==='3x+1'||t==='1+3x'},
  success:'Correct: y = 3x + 1. The intercept is 1, and every step of 1 in x adds 3 to y.',
  retry:'Find c from the point (0, 1). Then the gradient is a rise of 9 over a run of 3. Write it as y = mx + c.'},
 english:{machine:'/study/m/essay.html#questions',machineTitle:'The paragraph machine',machineText:'Practise retrieve, infer and explain-the-effect questions on an unseen text.',
  workedTitle:'Worked example: inference',workedText:'A character “folded the letter twice and slipped it beneath a loose floorboard”. What can you infer?',
  workedAnswer:'A supported inference is that the character wants to <b>hide the letter</b>. The hidden place supports that reading. We can’t know what the letter says, or the character’s whole personality, from this one action.',
  questionTitle:'Your turn: choose the strongest reading',questionText:'Another character “re-read the final line, then put the letter back exactly where it had been”. Which inference is best supported?',
  choices:['The character certainly wrote the letter.','The letter matters to the character, and they want to keep it hidden.','The character dislikes everyone named in the letter.'],
  hint:'Choose the idea that needs the fewest extra guesses. Look at how carefully the letter is put back.',check:v=>Number(v)===1,
  success:'Yes. Re-reading suggests the letter matters; putting it back exactly suggests keeping it hidden. The other answers add facts the text doesn’t give.',
  retry:'Separate what the words show from what they can’t prove. The careful actions support “it matters” and “keep it hidden”.'},
 social:{machine:'/study/m/market.html#inquiry',machineTitle:'The market machine',machineText:'Its social inquiry step weighs up different perspectives on a bike park.',
  workedTitle:'Worked example: one decision, two views',workedText:'A council adds a protected bike lane and removes 12 parking spaces. A shop owner worries about customer access. A student welcomes a safer ride. Can both perspectives be valid?',
  workedAnswer:'<b>Yes.</b> They have different experiences and priorities. Good social-studies thinking explains each perspective with evidence. It doesn’t force everyone to want the same outcome.',
  questionTitle:'Your turn: plan the evidence',questionText:'Which next step would best help the council understand the effects before making the change permanent?',
  choices:['Only ask people who already cycle.','Collect before-and-after counts, plus feedback from road users, nearby businesses and residents.','Go with whichever view is said most loudly.'],
  hint:'Look for evidence over time, and from the different groups affected.',check:v=>Number(v)===1,
  success:'Correct. Before-and-after evidence from several affected groups gives a fairer basis for deciding.',
  retry:'A fair evaluation needs more than one group and more than one moment in time.'}
};
let subject='science',hints=0;
const progress=(n)=>['sp1','sp2','sp3'].forEach((id,i)=>$(id).classList.toggle('done',i<n));
function renderStudy(){
 const s=STUDY[subject];hints=0;
 document.querySelectorAll('[data-subject]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.subject===subject)));
 $('workedTitle').textContent=s.workedTitle;$('workedText').textContent=s.workedText;$('workedAnswer').innerHTML=s.workedAnswer;
 $('questionTitle').textContent=s.questionTitle;$('questionText').textContent=s.questionText;
 $('machineLinkTitle').textContent=s.machineTitle;$('machineLinkText').textContent=s.machineText;$('machineLink').href=s.machine;
 $('answerArea').innerHTML=s.choices
  ?`<fieldset class="y9-choices"><legend class="sr">Choose one answer</legend>${s.choices.map((c,i)=>`<label><input type="radio" name="studyAnswer" value="${i}"><span>${esc(c)}</span></label>`).join('')}</fieldset>`
  :`<label class="sr" for="studyAnswer">Your answer</label><textarea id="studyAnswer" class="y9-input" rows="3" placeholder="${esc(s.placeholder)}"></textarea>`;
 $('studyFeedback').textContent='';$('studyFeedback').className='y9-fb';$('explain').value='';$('saveNote').textContent='';progress(1);
 showSaved();
}
document.querySelectorAll('[data-subject]').forEach(b=>b.addEventListener('click',()=>{subject=b.dataset.subject;renderStudy()}));
$('studyHint').addEventListener('click',()=>{const f=$('studyFeedback');f.className='y9-fb hint';f.textContent=STUDY[subject].hint+(++hints>1?' Now have a go before you check again.':'')});
$('studyCheck').addEventListener('click',()=>{
 const s=STUDY[subject],raw=s.choices?document.querySelector('input[name="studyAnswer"]:checked')?.value:$('studyAnswer').value,f=$('studyFeedback');
 if(raw===undefined||!String(raw).trim()){f.className='y9-fb hint';f.textContent='Have a go first. Your own attempt is the useful part.';return}
 const good=s.check(String(raw).toLowerCase());f.className='y9-fb '+(good?'good':'try');f.textContent=good?s.success:s.retry;
 if(good){progress(2);$('explain').focus({preventScroll:true})}
});
const RKEY='assembl-year9-reflections';
function showSaved(){const all=store.get(RKEY,[]);$('downloadReflections').hidden=!all.length;if(all.length&&!$('saveNote').textContent)$('saveNote').textContent=`${all.length} reflection${all.length===1?'':'s'} saved on this device.`}
$('saveReflection').addEventListener('click',()=>{
 const text=$('explain').value.trim();if(text.length<15){$('saveNote').textContent='Write a little more first: what did you notice, and why does it happen?';return}
 const all=store.get(RKEY,[]);all.push({subject,text,date:new Date().toISOString()});
 if(store.set(RKEY,all.slice(-30))){$('saveNote').textContent=`Saved in this browser (${Math.min(all.length,30)} so far). Clearing browser data removes them.`;progress(3);$('downloadReflections').hidden=false}
 else $('saveNote').textContent='This browser blocked saving. Copy your reflection somewhere safe.';
});
$('downloadReflections').addEventListener('click',()=>{const all=store.get(RKEY,[]);download('my-year9-reflections.txt',all.map(r=>`${r.date.slice(0,10)} · ${r.subject}\n${r.text}\n`).join('\n'),'text/plain')});
renderStudy();

// ---------------------------------------------------------------- 2 · app builder (tested templates; nothing is generated by AI)
const APP_INFO={
 trail:{name:'Trail Kai',title:'Ready for the trail?',prompt:'A simple way to pack food and essentials before a ride.',items:['Water bottle','Snack or sandwich','Phone and jacket'],done:'Trail check complete'},
 focus:{name:'Focus Ten',title:'One task. Ten minutes.',prompt:'A calm study sprint with a short list of things to do.',items:['Choose one task','Put distractions away','Write what I learned'],done:'Sprint planned'},
 nature:{name:'Taiao Notes',title:'Notice. Record. Check.',prompt:'A small log for noticing local nature.',items:['Sketch the shape','Record the kind of place','Check with a field guide'],done:'Observation noted'}};
const ACCENTS={mint:['Mint','#BFE8D6'],sky:['Sky','#BFDDF5'],blush:['Blush','#F3B8C8'],butter:['Butter','#F7E7A6'],lavender:['Lavender','#D9CBF2']};
$('accentPick').innerHTML=Object.entries(ACCENTS).map(([k,[n,c]],i)=>`<label><input type="radio" name="appColour" value="${k}"${i?'':' checked'}><span><i style="background:${c}"></i>${n}</span></label>`).join('');
let appState={checks:[false,false,false],count:0,notes:''};
function appConfig(){const type=$('appType').value,info=APP_INFO[type];return{type,info,name:$('appName').value.trim()||info.name,audience:document.querySelector('input[name="audience"]:checked').value,feature:document.querySelector('input[name="feature"]:checked').value,colour:document.querySelector('input[name="appColour"]:checked').value}}
function featureMarkup(c){
 if(c.feature==='checklist')return`<div class="y9-mini-list">${c.info.items.map((x,i)=>`<label><input id="p-check${i}" data-app-check="${i}" type="checkbox"${appState.checks[i]?' checked':''}>${esc(x)}</label>`).join('')}</div>`;
 if(c.feature==='counter')return`<div class="y9-mini-count" aria-live="polite">${appState.count}</div><div class="y9-mini-row"><button class="y9-mini-btn" id="p-minus" type="button">− Remove one</button><button class="y9-mini-btn" id="p-plus" type="button">+ Add one</button></div>`;
 return`<label for="p-notes" class="y9-mini-lab">Your note</label><textarea id="p-notes" rows="4" placeholder="Write one useful note…">${esc(appState.notes)}</textarea><button class="y9-mini-btn" id="p-clear" type="button">Clear note</button>`;
}
function renderApp(reset=false,keepFocus=null){
 const c=appConfig();if(reset)appState={checks:[false,false,false],count:0,notes:''};
 const stat=c.feature==='counter'?[appState.count,'items counted']:c.feature==='notes'?[appState.notes.trim()?1:0,'note written']:[appState.checks.filter(Boolean).length+' / 3','things checked'];
 const p=$('appPreview');p.style.setProperty('--app-accent',ACCENTS[c.colour][1]);
 p.innerHTML=`<div class="y9-mini-head"><b>${esc(c.name)}</b><span aria-hidden="true"></span></div><h4>${esc(c.info.title)}</h4><p>For ${esc(c.audience)}. ${esc(c.info.prompt)}</p><div class="y9-mini-stat"><b>${stat[0]}</b>${stat[1]}</div>${featureMarkup(c)}<p class="y9-mini-status" role="status">${c.feature==='checklist'&&appState.checks.every(Boolean)?esc(c.info.done)+' ✓':'Every good app starts with one small step.'}</p>`;
 $('briefText').textContent=`Make “${c.name}” for ${c.audience}. ${c.info.prompt} The main feature is a ${c.feature}, with a ${ACCENTS[c.colour][0].toLowerCase()} accent.`;
 $('buildPlan').innerHTML=[`Keep one job in focus: the ${c.feature}.`,'Use large buttons and plain labels.','Keep nothing after the page closes.','Let you read and download the code.'].map(x=>`<li>${esc(x)}</li>`).join('');
 $('codeView').textContent=buildAppSource(c);bindPreview();
 if(keepFocus&&$(keepFocus))$(keepFocus).focus({preventScroll:true});
}
function bindPreview(){
 document.querySelectorAll('[data-app-check]').forEach(el=>el.addEventListener('change',()=>{appState.checks[Number(el.dataset.appCheck)]=el.checked;renderApp(false,el.id)}));
 $('p-plus')?.addEventListener('click',()=>{appState.count++;renderApp(false,'p-plus')});
 $('p-minus')?.addEventListener('click',()=>{appState.count=Math.max(0,appState.count-1);renderApp(false,'p-minus')});
 $('p-notes')?.addEventListener('input',e=>{appState.notes=e.target.value;const b=$('appPreview').querySelector('.y9-mini-stat b');if(b)b.textContent=appState.notes.trim()?'1':'0'});
 $('p-clear')?.addEventListener('click',()=>{appState.notes='';renderApp(false,'p-notes')});
}
function buildAppSource(c){
 const json=v=>JSON.stringify(v).replace(/</g,'\\u003c'),accent=ACCENTS[c.colour][1];
 return`<!doctype html>
<html lang="en-NZ"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(c.name)}</title>
<style>
*{box-sizing:border-box}
body{margin:0;background:${accent};color:#222A55;font:16px/1.5 system-ui,sans-serif;min-height:100vh;display:grid;place-items:center;padding:20px}
main{background:#fff;border-radius:24px;padding:24px;width:min(100%,420px);box-shadow:0 14px 34px -22px rgba(27,36,82,.5)}
h1{font-size:30px;line-height:1.1;margin:0 0 8px}
button{font:inherit;font-weight:600;min-height:46px;width:100%;margin-top:10px;background:#222A55;color:#fff;border:0;border-radius:14px}
label{display:flex;gap:10px;padding:12px 0;border-bottom:1px solid #E8E1D5}
textarea{width:100%;min-height:130px;padding:10px;font:inherit;border:1.5px solid #D8CEBF;border-radius:12px}
.stat{font-size:42px;font-weight:700}
</style></head><body><main><h1 id="title"></h1><p id="about"></p><div id="app"></div>
<p role="status">Made with the assembly app builder. Nothing is saved after you close this page.</p></main>
<script>
const name=${json(c.name)},info=${json(c.info)},feature=${json(c.feature)};
let checks=[false,false,false],count=0,notes='';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
document.getElementById('title').textContent=name;document.getElementById('about').textContent=info.prompt;
function draw(){
 const a=document.getElementById('app');
 if(feature==='checklist'){
  a.innerHTML='<div class="stat">'+checks.filter(Boolean).length+' / 3</div>'+info.items.map((x,i)=>'<label><input data-i="'+i+'" type="checkbox" '+(checks[i]?'checked':'')+'>'+esc(x)+'</label>').join('');
  a.querySelectorAll('input').forEach(el=>el.onchange=()=>{checks[el.dataset.i]=el.checked;draw()});
 }else if(feature==='counter'){
  a.innerHTML='<div class="stat">'+count+'</div><button id="minus">− Remove one</button><button id="plus">+ Add one</button>';
  document.getElementById('plus').onclick=()=>{count++;draw()};
  document.getElementById('minus').onclick=()=>{count=Math.max(0,count-1);draw()};
 }else{
  a.innerHTML='<label for="note">Your note</label><textarea id="note">'+esc(notes)+'</textarea><button id="clear">Clear note</button>';
  const n=document.getElementById('note');n.oninput=()=>notes=n.value;
  document.getElementById('clear').onclick=()=>{notes='';draw()};
 }
}
draw();
<\/script></body></html>`;
}
$('builderControls').addEventListener('submit',e=>e.preventDefault());
$('builderControls').addEventListener('input',e=>{if(e.target.id==='appType')$('appName').value=APP_INFO[e.target.value].name;renderApp(e.target.id==='appType'||e.target.name==='feature')});
$('showCode').addEventListener('click',()=>{const open=$('showCode').getAttribute('aria-expanded')==='true';$('showCode').setAttribute('aria-expanded',String(!open));$('codeView').hidden=open;$('showCode').textContent=open?'Show the code':'Hide the code'});
document.querySelectorAll('.test-check').forEach(x=>x.addEventListener('change',()=>{const n=[...document.querySelectorAll('.test-check')].filter(y=>y.checked).length;$('testResult').textContent=n===3?'All three checks done. You can explain and download this build.':`${n} of 3 checks done.`}));
$('downloadApp').addEventListener('click',()=>{const c=appConfig();download((c.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'my-app')+'.html',buildAppSource(c));$('testResult').textContent='Downloaded. Open the file and test the feature again.'});
renderApp(true);

// ---------------------------------------------------------------- 3 · vision detective (luminance, contrast, colour bins, neighbour gradients)
const canvas=$('visionCanvas'),ctx=canvas.getContext('2d',{willReadFrequently:true}),W=canvas.width,H=canvas.height;
let source=null,edgeMask=null;
const INK='#222A55';
function drawSample(kind){
 ctx.save();ctx.lineJoin='round';ctx.lineCap='round';
 if(kind==='leaf'){ctx.fillStyle='#F3EEE4';ctx.fillRect(0,0,W,H);ctx.fillStyle='#8DC07A';ctx.strokeStyle=INK;ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(100,340);ctx.bezierCurveTo(80,130,300,38,530,100);ctx.bezierCurveTo(520,290,290,390,100,340);ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.moveTo(100,340);ctx.lineTo(500,115);ctx.stroke();ctx.strokeStyle='#3F6E46';ctx.lineWidth=3;for(let i=0;i<7;i++){ctx.beginPath();ctx.moveTo(155+i*48,305-i*28);ctx.lineTo(150+i*48,205-i*14);ctx.stroke()}}
 else if(kind==='wheel'){ctx.fillStyle='#E6F1FB';ctx.fillRect(0,0,W,H);const cx=320,cy=215,r=160;ctx.strokeStyle=INK;ctx.lineWidth=24;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();
  ctx.lineWidth=3;for(let i=0;i<24;i++){const a=i*Math.PI/12;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);ctx.stroke()}ctx.fillStyle='#F9D2B8';ctx.beginPath();ctx.arc(cx,cy,24,0,Math.PI*2);ctx.fill();ctx.stroke()}
 else{ctx.fillStyle='#F7F3EC';ctx.fillRect(0,0,W,H);[['#F3B8C8',140,170,80],['#BFE8D6',360,160,120],['#BFDDF5',460,310,65]].forEach(([c,x,y,r])=>{ctx.fillStyle=c;ctx.strokeStyle=INK;ctx.lineWidth=4;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.stroke()});
  ctx.fillStyle='#F7E7A6';ctx.fillRect(120,290,150,100);ctx.strokeRect(120,290,150,100)}
 ctx.fillStyle=INK;ctx.font='600 18px "IBM Plex Mono", monospace';ctx.fillText({leaf:'SAMPLE A · LEAF',wheel:'SAMPLE B · WHEEL',mixed:'SAMPLE C · SHAPES'}[kind],24,H-22);
 ctx.restore();source=ctx.getImageData(0,0,W,H);edgeMask=null;resetVision();
}
function resetVision(){['vBrightness','vContrast','vEdges','vColour'].forEach(id=>$(id).textContent='—');
 $('visionExplanation').innerHTML='<h3>What can you measure?</h3><p>Brightness averages the light in every pixel. Contrast is how much it varies. Edges mark sudden changes between neighbouring pixels. None of these can reliably tell you a leaf’s species.</p>'}
function paint(){ctx.putImageData(source,0,0);if(!edgeMask||!$('showEdges').checked)return;const img=ctx.getImageData(0,0,W,H),d=img.data;
 for(let i=0;i<edgeMask.length;i++)if(edgeMask[i]){d[i*4]=214;d[i*4+1]=70;d[i*4+2]=106;d[i*4+3]=255}ctx.putImageData(img,0,0)}
function analyse(){
 const d=source.data,n=W*H,lum=new Float32Array(n);let sum=0,sum2=0;const bins=new Set();
 for(let i=0;i<n;i++){const r=d[i*4],g=d[i*4+1],b=d[i*4+2],y=.2126*r+.7152*g+.0722*b;lum[i]=y;sum+=y;sum2+=y*y;bins.add((r>>5)<<6|(g>>5)<<3|(b>>5))}
 const mean=sum/n,sd=Math.sqrt(Math.max(0,sum2/n-mean*mean)),th=Number($('threshold').value);edgeMask=new Uint8Array(n);let edges=0;
 for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){const i=y*W+x,g=Math.abs(lum[i]-lum[i+1])+Math.abs(lum[i]-lum[i+W]);if(g>th){edgeMask[i]=1;edges++}}
 paint();const pct=(edges/n*100).toFixed(1);
 $('vBrightness').textContent=`${Math.round(mean)} / 255`;$('vContrast').textContent=String(Math.round(sd));$('vEdges').textContent=`${pct}%`;$('vColour').textContent=`${bins.size} of 512`;
 $('visionExplanation').innerHTML=`<h3>Measurement, not identification</h3><p>At sensitivity ${th}, <b>${pct}%</b> of pixels changed sharply from their neighbours (marked in pink). The image uses ${bins.size} of 512 colour bins. Try another sensitivity and explain the trade-off: a low setting finds faint edges, but also texture and noise.</p>`;
 const wrap=$('visionWrap');wrap.style.setProperty('--h',canvas.clientHeight+'px');wrap.classList.remove('scanning');if(!REDUCED){void wrap.offsetWidth;wrap.classList.add('scanning')}
}
document.querySelectorAll('[data-sample]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-sample]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));drawSample(b.dataset.sample)}));
$('threshold').addEventListener('input',e=>{$('thresholdOut').textContent=e.target.value});
$('threshold').addEventListener('change',()=>{if(edgeMask)analyse()});
$('showEdges').addEventListener('change',paint);
$('analyseVision').addEventListener('click',analyse);
$('imageUpload').addEventListener('change',e=>{
 const file=e.target.files?.[0];if(!file)return;
 if(!['image/png','image/jpeg','image/webp'].includes(file.type)){$('visionExplanation').innerHTML='<h3>Choose a PNG, JPEG or WebP image</h3><p>That file type can’t be measured here.</p>';e.target.value='';return}
 if(file.size>8*1024*1024){$('visionExplanation').innerHTML='<h3>That image is too large</h3><p>Choose one under 8 MB. Smaller images are quicker on a school device.</p>';e.target.value='';return}
 const url=URL.createObjectURL(file),img=new Image();
 img.onload=()=>{ctx.fillStyle='#F7F3EC';ctx.fillRect(0,0,W,H);const s=Math.min(W/img.width,H/img.height),w=img.width*s,h=img.height*s;ctx.drawImage(img,(W-w)/2,(H-h)/2,w,h);URL.revokeObjectURL(url);
  source=ctx.getImageData(0,0,W,H);edgeMask=null;document.querySelectorAll('[data-sample]').forEach(x=>x.setAttribute('aria-pressed','false'));resetVision();e.target.value=''};
 img.onerror=()=>{URL.revokeObjectURL(url);$('visionExplanation').innerHTML='<h3>That image couldn’t be read</h3><p>Try a PNG, JPEG or WebP.</p>';e.target.value=''};
 img.src=url;
});
drawSample('leaf');

// ---------------------------------------------------------------- 4 · AI judgement
const AI_ITEMS=[
 {title:'Answer A',text:'After one year, the count of native plants in the surveyed area rose from 18 to 43. This count doesn’t show whether water quality improved.',correct:'supported',why:'It uses only what was measured, and it says what wasn’t.'},
 {title:'Answer B',text:'The restoration worked perfectly. More fish now live in the stream and the water is definitely cleaner.',correct:'overreach',why:'The plant count went up, but fish and water quality weren’t measured.'},
 {title:'Answer C',text:'The students counted native birds at 60 sites across New Zealand and proved every stream needs the same planting plan.',correct:'unsupported',why:'Birds, 60 sites and a rule for every stream: none of that is in the source.'}];
const AI_OPTS=[['supported','Supported by the source'],['overreach','Starts supported, then goes too far'],['unsupported','Makes up different facts']];
function renderAI(){
 $('aiAnswers').innerHTML=AI_ITEMS.map((a,i)=>`<fieldset class="card y9-answer" id="ai-card-${i}"><legend>${a.title}</legend><p>${esc(a.text)}</p><div class="y9-opts y9-stack">${AI_OPTS.map(([v,l])=>`<label><input type="radio" name="ai${i}" value="${v}"><span>${l}</span></label>`).join('')}</div><p class="y9-why" id="ai-why-${i}" hidden></p></fieldset>`).join('');
 $('aiFeedback').textContent='';$('aiFeedback').className='y9-fb';
}
$('aiReset').addEventListener('click',renderAI);
$('aiCheck').addEventListener('click',()=>{
 let right=0,missing=0;
 AI_ITEMS.forEach((a,i)=>{const v=document.querySelector(`input[name="ai${i}"]:checked`)?.value,card=$('ai-card-'+i),why=$('ai-why-'+i);card.classList.remove('right','wrong');
  if(!v){missing++;why.hidden=true;return}const ok=v===a.correct;if(ok)right++;card.classList.add(ok?'right':'wrong');why.hidden=false;why.textContent=(ok?'✓ ':'Not quite. ')+a.why});
 const f=$('aiFeedback');
 if(missing){f.className='y9-fb hint';f.textContent=`Judge every answer before checking. ${3-missing} of 3 done.`;return}
 f.className='y9-fb '+(right===3?'good':'try');
 f.textContent=right===3?'All three. A sticks to the measured result and its limit; B adds outcomes nobody measured; C invents a different study and a rule for everywhere.':`${right} of 3 sound judgements. Go back to the source: what was counted, where, and what wasn’t measured?`;
});
renderAI();
