// Study Reels: a 9:16 short (TikTok, Reels, YouTube Shorts) for any study machine, made from the machine itself.
// Usage: node tools/reels/reel.cjs <baseUrl> <machineId> [outDir]      (needs Playwright and ffmpeg)
// Pipeline (the topic → script → clips → subtitles → video shape that MoneyPrinterTurbo popularised, built on our own
// open tools): the script comes from the machine's own catalogue entry and steps (nothing invented), the clips are real
// captures of each step, captions are burnt in for sound-off viewing and also written as .srt, ffmpeg joins it all.
// No voiceover: we have no NZ-accented open voice yet, and most short video is watched muted.
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');const os=require('os');const {execFileSync}=require('child_process');
const [,,BASE='http://localhost:8123',ID,OUT='study/share/reels']=process.argv;
if(!ID){console.error('usage: node tools/reels/reel.cjs <baseUrl> <machineId> [outDir]');process.exit(1)}
const root=path.join(__dirname,'../..');
const data=fs.readFileSync(path.join(root,'study/data.js'),'utf8');const D=JSON.parse(data.slice(data.indexOf('{'),data.lastIndexOf('}')+1));
const M=D.machines[ID];if(!M){console.error('no machine '+ID);process.exit(1)}
const W=1080,H=1920,FPS=30,SEG=2.8,XF=.4,sleep=ms=>new Promise(r=>setTimeout(r,ms));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'reel-'));
const esc=t=>String(t??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
const short=(t,n)=>{t=String(t).replace(/<[^>]+>/g,'').trim();if(t.length<=n)return t;const cut=t.slice(0,n+1);const k=Math.max(cut.lastIndexOf('. '),cut.lastIndexOf('; '),cut.lastIndexOf('.'),cut.lastIndexOf(';'));if(k>n*.35)return cut.slice(0,k).trim()+'.';return cut.slice(0,cut.lastIndexOf(' ')).replace(/[,;:]$/,'')+'…'};
const card=(inner,bg)=>`<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500&display=swap"><style>
*{box-sizing:border-box}html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden}body{background:${bg||'#240B21'};color:#F5F1F2;font-family:"Instrument Sans",system-ui,sans-serif;position:relative}
.k{font:500 30px "IBM Plex Mono",monospace;letter-spacing:.12em;text-transform:uppercase;color:#D9B8C0}
h1{font-weight:600;font-size:104px;line-height:1;letter-spacing:-.035em;margin:24px 0}h1 em{font-style:normal;color:#D9B8C0}
.cap{position:absolute;left:60px;right:60px;bottom:120px;padding:34px 40px;border-radius:34px;background:rgba(255,253,251,.96);color:#240B21;font:600 50px/1.18 "Instrument Sans",sans-serif}
.cap small{display:block;font:500 26px "IBM Plex Mono",monospace;letter-spacing:.1em;text-transform:uppercase;color:#916A70;margin-bottom:12px}
.shot{position:absolute;left:40px;right:40px;top:230px;height:1220px;border-radius:40px;overflow:hidden;box-shadow:0 40px 90px -30px rgba(0,0,0,.6)}.shot img{width:100%;height:100%;object-fit:cover;object-position:center}
.top{position:absolute;left:60px;right:60px;top:110px}.word{font:700 44px "Instrument Sans",sans-serif;letter-spacing:-.02em}.word span{color:#D9B8C0;font-weight:500}
.url{display:inline-block;margin-top:40px;padding:26px 44px;border-radius:999px;background:#FFFDFB;color:#240B21;font:600 54px "Instrument Sans",sans-serif}
.bleed{position:absolute;inset:0;background-size:cover;background-position:center}.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(36,11,33,.15) 30%,rgba(36,11,33,.92) 78%)}
</style></head><body>${inner}</body></html>`;
async function frames(browser){
  // 1. capture each step of the machine (the real page, as a student sees it)
  const ctx=await browser.newContext({viewport:{width:1280,height:900},deviceScaleFactor:1.4});const p=await ctx.newPage();
  await p.addInitScript(()=>{try{localStorage.setItem('study-tour-v1','done')}catch(e){}});
  await p.goto(`${BASE}/study/${M.href}?lq`,{waitUntil:'load'});  // ?lq: the kit's lighter 3D (no bloom), quick to captureawait p.waitForFunction(()=>window.StudyKit&&window.StudyKit.current,null,{timeout:60000});
  await sleep(9000);  // let the 3D model load and settle
  const steps=await p.evaluate(()=>window.StudyKit.current.cfg.steps.map(s=>({lab:s.lab,cap:s.cap,k:s.k})));
  const shots=[];const use=steps.filter(s=>s.k!=='test').slice(0,5);
  for(let i=0;i<use.length;i++){await p.evaluate(k=>{const K=window.StudyKit.current;K.api.setStep(K.cfg.steps.findIndex(s=>s.k===k))},use[i].k);await sleep(7000);
    const f=path.join(tmp,`shot${i}.png`);const el=await p.$('.playmain .canvas')||await p.$('.playmain');await el.evaluate(e=>e.scrollIntoView({block:'center'}));await sleep(400);
    const bb=await el.boundingBox();await p.screenshot({path:f,clip:bb,timeout:180000});shots.push({...use[i],f})}  // clip, not element screenshot: live 3D never 'settles'
  await ctx.close();
  // 2. the script: hook, one line per step, call to action (all from the catalogue and the machine's own steps)
  const hero=[`study/thumbnails/${ID}.jpg`].map(x=>path.join(root,x)).find(fs.existsSync);
  const segs=[{text:short(M.blurb||M.desc,90),html:card(`${hero?`<div class="bleed" style="background-image:url('file://${hero}')"></div><div class="shade"></div>`:''}<div class="top"><div class="word">assembl <span>study</span></div></div><div style="position:absolute;left:60px;right:60px;bottom:230px"><div class="k">Free study machine · Aotearoa</div><h1>${esc(M.title.replace(/^The /,'').replace(/^./,c=>c.toUpperCase()))}</h1><div style="font:500 46px/1.25 'Instrument Sans';color:#F5F1F2">${esc(short(M.blurb||M.desc,90))}</div></div>`)}];
  shots.forEach((s,i)=>segs.push({text:`${s.lab}. ${short(s.cap,112)}`,html:card(`<div class="top"><div class="word">assembl <span>study</span></div></div><div class="shot"><img src="file://${s.f}"></div><div class="cap"><small>${i+1} · ${esc(s.lab)}</small>${esc(short(s.cap,112))}</div>`)}));
  segs.push({text:`Free, no sign-up: assembl.co.nz/study/${ID}`,html:card(`<div class="top"><div class="word">assembl <span>study</span></div></div><div style="position:absolute;left:60px;right:60px;top:620px"><div class="k">Exams soon?</div><h1>Try it free.<br><em>No sign-up.</em></h1><div class="url">assembl.co.nz/study/${ID}</div><div style="margin-top:46px;font:500 40px/1.35 'Instrument Sans';color:#D9B8C0">Stuck? Allen the study buddy works through exam questions with you.</div></div>`)});
  // 3. render each segment to a 1080×1920 still
  const c2=await browser.newContext({viewport:{width:W,height:H}});const q=await c2.newPage();
  for(let i=0;i<segs.length;i++){const f=path.join(tmp,`seg${i}.html`);fs.writeFileSync(f,segs[i].html);await q.goto('file://'+f);await q.evaluate(()=>document.fonts.ready);await sleep(300);segs[i].png=path.join(tmp,`seg${i}.png`);await q.screenshot({path:segs[i].png})}
  await c2.close();return segs}
(async()=>{const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try{const segs=await frames(browser);fs.mkdirSync(path.join(root,OUT),{recursive:true});
    // 4. compose: a slow push-in on each still, cross-faded, H.264 for every platform
    const args=['-y','-loglevel','error'];segs.forEach(s=>args.push('-loop','1','-t',String(SEG),'-i',s.png));
    let fc=segs.map((s,i)=>`[${i}:v]scale=${W*1.06}:-2,zoompan=z='min(zoom+0.0007,1.05)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${Math.round(SEG*FPS)}:s=${W}x${H}:fps=${FPS},format=yuv420p[v${i}]`).join(';');
    let last='v0',t=SEG;for(let i=1;i<segs.length;i++){fc+=`;[${last}][v${i}]xfade=transition=fade:duration=${XF}:offset=${(t-XF).toFixed(2)}[x${i}]`;last=`x${i}`;t+=SEG-XF}
    const mp4=path.join(root,OUT,`${ID}.mp4`);args.push('-filter_complex',fc,'-map',`[${last}]`,'-c:v','libx264','-preset','slow','-tune','stillimage','-crf','28','-maxrate','3M','-bufsize','6M','-movflags','+faststart','-r',String(FPS),mp4);
    execFileSync('ffmpeg',args,{stdio:'inherit'});
    // 5. subtitles (.srt) for platforms that take a caption file, and a poster frame
    const ts=x=>{const ms=Math.round(x*1000),h=Math.floor(ms/3.6e6),m=Math.floor(ms/6e4)%60,s=Math.floor(ms/1000)%60;return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')},${String(ms%1000).padStart(3,'0')}`};
    fs.writeFileSync(path.join(root,OUT,`${ID}.srt`),segs.map((s,i)=>`${i+1}\n${ts(i*(SEG-XF))} --> ${ts(i*(SEG-XF)+SEG-XF)}\n${s.text}\n`).join('\n'));
    fs.copyFileSync(segs[0].png,path.join(root,OUT,`${ID}.png`));
    console.log('ok',ID,(SEG+(segs.length-1)*(SEG-XF)).toFixed(1)+'s',mp4)}
  finally{await browser.close();fs.rmSync(tmp,{recursive:true,force:true})}})();
