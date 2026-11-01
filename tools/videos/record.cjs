// Records the "how to use this machine" walkthrough videos in study/videos/.
// Usage: node tools/videos/record.cjs <baseUrl> <outDir> [ids...]   (needs Playwright and ffmpeg)
// Each video: a title card with the machine's own Blender/3D picture, then the real page in its 2D drawing view
// (smooth to record) with a cursor and one plain caption per step. Captions are burnt in and also written as WebVTT.
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');const {execFileSync}=require('child_process');
const [,,BASE='http://localhost:8123',OUT='study/videos',...ONLY]=process.argv;
const data=fs.readFileSync(path.join(__dirname,'../../study/data.js'),'utf8');const D=JSON.parse(data.slice(data.indexOf('{'),data.lastIndexOf('}')+1));
// only machines on the shared shell (kit.js + mount): the captions describe that shell's tabs, controls and notes
const kit=id=>{try{const h=path.join(__dirname,'../../study',D.machines[id].href);return /kit\.js/.test(fs.readFileSync(h,'utf8'))&&/mount\(\{/.test(fs.readFileSync(h.replace(/\.html$/,'.js'),'utf8'))}catch(e){return false}};
const IDS=(ONLY.length?ONLY:Object.keys(D.machines)).filter(id=>id==='study'||kit(id));
const W=1280,H=720,sleep=ms=>new Promise(r=>setTimeout(r,ms));
const OVERLAY=`(()=>{const st=document.createElement('style');st.textContent=\`
#vcap{position:fixed;left:50%;bottom:36px;transform:translateX(-50%);z-index:9999;max-width:1000px;padding:14px 26px;border-radius:18px;background:rgba(36,11,33,.94);color:#FFFDFB;font:600 26px/1.3 "Instrument Sans",system-ui,sans-serif;text-align:center;box-shadow:0 20px 40px -20px #000;transition:opacity .25s}
#vcap b{color:#F2DC8A}#vcur{position:fixed;z-index:10000;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;background:rgba(242,220,138,.55);border:3px solid #240B21;pointer-events:none;transition:transform .15s;left:640px;top:360px}
#vcur.tap{transform:scale(.7)}#vtitle{position:fixed;inset:0;z-index:10001;display:grid;grid-template-columns:1.1fr 1fr;align-items:center;gap:40px;padding:60px 80px;background:#FBF7F1;font-family:"Instrument Sans",system-ui,sans-serif;color:#240B21;transition:opacity .5s}
#vtitle img{width:100%;border-radius:24px;box-shadow:0 30px 60px -30px rgba(36,11,33,.5)}#vtitle small{display:block;font:600 15px "IBM Plex Mono",monospace;letter-spacing:.1em;color:#916A70;text-transform:uppercase;margin-bottom:14px}
#vtitle h1{margin:0 0 16px;font-size:54px;line-height:1.02;letter-spacing:-.03em}#vtitle p{margin:0;font-size:22px;line-height:1.45;color:#654A4E}#vtitle .how{margin-top:26px;display:inline-block;padding:10px 18px;border-radius:999px;background:#240B21;color:#fff;font-size:18px;font-weight:600}\`;
document.head.appendChild(st);const c=document.createElement('div');c.id='vcap';c.style.opacity=0;const k=document.createElement('div');k.id='vcur';document.body.append(c,k);
window.__v={cap(t){c.innerHTML=t;c.style.opacity=t?1:0},
 async move(x,y,ms=700){const s0=[parseFloat(k.style.left),parseFloat(k.style.top)],t0=performance.now();await new Promise(r=>{const f=t=>{const p=Math.min(1,(t-t0)/ms),e=p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2;k.style.left=s0[0]+(x-s0[0])*e+'px';k.style.top=s0[1]+(y-s0[1])*e+'px';p<1?requestAnimationFrame(f):r()};requestAnimationFrame(f)})},
 tap(){k.classList.add('tap');setTimeout(()=>k.classList.remove('tap'),180)},
 title(img,eyebrow,h,p){const d=document.createElement('div');d.id='vtitle';d.innerHTML=\`<div><small>\${eyebrow}</small><h1>\${h}</h1><p>\${p}</p><span class="how">▶ How to use it</span></div><img src="\${img}" alt="">\`;document.body.appendChild(d)},
 untitle(){const d=document.getElementById('vtitle');if(d){d.style.opacity=0;setTimeout(()=>d.remove(),500)}}}})()`;
async function centre(p,sel){const el=await p.$(sel);if(!el)return null;await el.evaluate(e=>e.scrollIntoView({block:'center'}));await sleep(250);const b=await el.boundingBox();return b&&{x:b.x+b.width/2,y:b.y+b.height/2,b}}
async function record(browser,id){
  const dir=fs.mkdtempSync('/tmp/vrec-');const ctx=await browser.newContext({viewport:{width:W,height:H},recordVideo:{dir,size:{width:W,height:H}}});
  const p=await ctx.newPage();let t0=Date.now(),cut=0;const cues=[];let open=null;
  const cap=async t=>{const now=(Date.now()-t0)/1000;if(open)open.end=now;open=t?{start:now,text:t.replace(/<[^>]+>/g,'')}:null;if(open)cues.push(open);await p.evaluate(t=>__v.cap(t),t||'')};
  const go=async(sel,ms=700)=>{const c=await centre(p,sel);if(c)await p.evaluate(([x,y,ms])=>__v.move(x,y,ms),[c.x,c.y,ms]);return c};
  const click=async sel=>{const c=await go(sel);if(!c)return false;await p.evaluate(()=>__v.tap());await p.click(sel,{force:true}).catch(()=>{});return true};
  const m=D.machines[id];
  if(id==='study'){await p.goto(BASE+'/study/?video=1');await sleep(2200);await p.evaluate(OVERLAY);cut=(Date.now()-t0)/1000;
    await cap('Every study machine is on the <b>Study</b> page.');await sleep(2600);
    await go('#find-q');await cap('Type what you are studying…');await p.click('#find-q');for(const ch of 'graphs'){await p.keyboard.type(ch);await sleep(140)}await sleep(1800);
    await cap('…or tap your subject.');await click('#find-subj [data-s="social"]');await sleep(2400);
    await cap('Then open a machine.');await go('#machines .subj:not([hidden]) .app:not([hidden])');await sleep(1500);
    await p.goto(BASE+'/study/m/socials.html?lite&video=1');await sleep(2200);await p.evaluate(OVERLAY);
    await cap('Every machine works the same way: the <b>How it works</b> bar shows the four steps.');await go('.howbar');await sleep(3200);
    await cap('<b>1</b> Pick a topic. <b>2</b> Change the controls. <b>3</b> Read the notes. <b>4</b> Test yourself.');await sleep(3600);
    await cap('Tap <b>Watch how</b> on any machine for its own short video.');await go('.howbar .acts');await sleep(2600);
    await cap('Stuck anywhere? <b>Ask Allen</b>. He can see the machine and help.');await click('.alt-fab');await sleep(3000);await cap('');await sleep(400);}
  else{
  await p.goto(`${BASE}/study/m/${id}.html?lite&video=1`);await sleep(2400);await p.evaluate(OVERLAY);cut=(Date.now()-t0)/1000;
  const eyebrow=await p.evaluate(()=>document.querySelector('.apptitle .eyebrow')?.textContent||'Study machine');
  await p.evaluate(([img,e,h,b])=>__v.title(img,e,h,b),[`${BASE}/study/thumbnails/${id}.jpg`,eyebrow,m.title,m.blurb||m.desc]);
  cues.push({start:cut,end:cut+3,text:`${m.title}. ${m.blurb||m.desc}`});await sleep(3000);await p.evaluate(()=>{scrollTo(0,0);__v.untitle()});await sleep(500);
  await cap('<b>1</b> · Pick a topic from the tabs along the top.');await go('nav.steps .step:nth-of-type(1)');await sleep(700);
  const second=(await p.$$('nav.steps .step')).length>2?'nav.steps .step:nth-of-type(2)':'nav.steps .step:nth-of-type(1)';await click(second);await sleep(1400);
  await cap('This line tells you what to do on each topic.');await go('#k-cap');await sleep(2400);
  await cap('<b>2</b> · Change a control. The picture changes as you go.');
  const range=await p.$('#k-ctl label.range:not([hidden]) input');
  if(range){const c=await centre(p,'#k-ctl label.range:not([hidden]) input');const b=c.b;await p.evaluate(([x,y])=>__v.move(x,y),[b.x+b.width*.3,c.y]);
    const [mn,mx]=await range.evaluate(i=>[+i.min,+i.max]);for(let i=0;i<=14;i++){const f=.3+.5*Math.sin(i/14*Math.PI);await range.evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}))},mn+(mx-mn)*f);await p.evaluate(([x,y])=>__v.move(x,y,90),[b.x+b.width*f,c.y]);await sleep(110)}}
  else{const sel=await p.$('#k-ctl select:not([hidden])');if(sel){await go('#k-ctl select');await sel.evaluate(s=>{s.selectedIndex=(s.selectedIndex+1)%s.options.length;s.dispatchEvent(new Event('change',{bubbles:true}))})}else await click('#k-ctl button:not([hidden])')}
  await sleep(1200);await p.evaluate(()=>{const c=document.querySelector('.canvas');c&&c.scrollIntoView({block:'center'})});await sleep(900);
  if(await p.$('#k-chips .chip')){await cap('Watch the numbers update too.');await go('#k-chips');await sleep(2000)}
  await cap('<b>3</b> · Read the notes. The <b>Exam line</b> is what to write in the exam.');await click('#k-deck button');await sleep(2800);
  await cap('<b>4</b> · When you are ready, open <b>Test yourself</b> and press <b>Check</b>.');await click('nav.steps .step:last-of-type');await sleep(1200);await go('#k-challenge .check');await sleep(2200);
  await cap('Stuck? <b>Ask Allen</b>. He can see this machine and show you.');await click('.alt-fab');await sleep(2800);await cap('');await sleep(300);}
  const dur=(Date.now()-t0)/1000;if(open)open.end=dur;
  await ctx.close();const webm=fs.readdirSync(dir).map(f=>path.join(dir,f)).find(f=>f.endsWith('.webm'));
  const mp4=path.join(OUT,id+'.mp4'),jpg=path.join(OUT,id+'.jpg');
  execFileSync('ffmpeg',['-y','-loglevel','error','-ss',String(cut),'-i',webm,'-an','-c:v','libx264','-preset','veryfast','-crf','30','-pix_fmt','yuv420p','-movflags','+faststart','-r','25',mp4]);
  execFileSync('ffmpeg',['-y','-loglevel','error','-ss',id==='study'?'4':'1.2','-i',mp4,'-frames:v','1','-q:v','5',jpg]);
  const ts=x=>{const s=Math.max(0,x-cut);return new Date(s*1000).toISOString().slice(11,23)};
  fs.writeFileSync(path.join(OUT,id+'.vtt'),'WEBVTT\n\n'+cues.map((c,i)=>`${i+1}\n${ts(c.start)} --> ${ts(c.end||dur)}\n${c.text}\n`).join('\n'));
  fs.rmSync(dir,{recursive:true,force:true});return Math.round(dur-cut)}
(async()=>{fs.mkdirSync(OUT,{recursive:true});const browser=await chromium.launch();const idx=path.join(OUT,'index.json');
  for(const id of IDS){try{const dur=await record(browser,id);if(!process.env.NOINDEX){const j=fs.existsSync(idx)?JSON.parse(fs.readFileSync(idx,'utf8')):{videos:{}};j.videos[id]={dur};fs.writeFileSync(idx,JSON.stringify(j,null,1))}console.log('ok',id,dur+'s')}catch(e){console.log('FAIL',id,e.message.split('\n')[0])}}
  await browser.close()})();
