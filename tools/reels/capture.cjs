// Capture a study machine for the Remotion study Reels (assemblnz remotion/src/study): one screenshot per step plus
// the Blender hero, and a script.json with the machine's own title, blurb and step lines (nothing invented).
// Usage: node tools/reels/capture.cjs <baseUrl> <machineId> <outDir>      (needs Playwright; Pillow-free: JPEG via Chromium)
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const [,,BASE='http://localhost:8123',ID,OUT]=process.argv;
if(!ID||!OUT){console.error('usage: node tools/reels/capture.cjs <baseUrl> <machineId> <outDir>');process.exit(1)}
const root=path.join(__dirname,'../..');const data=fs.readFileSync(path.join(root,'study/data.js'),'utf8');
const D=JSON.parse(data.slice(data.indexOf('{'),data.lastIndexOf('}')+1));const M=D.machines[ID];if(!M){console.error('no machine '+ID);process.exit(1)}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));fs.mkdirSync(OUT,{recursive:true});
(async()=>{const b=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try{const ctx=await b.newContext({viewport:{width:1280,height:900},deviceScaleFactor:1.4});const p=await ctx.newPage();
    await p.addInitScript(()=>{try{localStorage.setItem('study-tour-v1','done')}catch(e){}});
    await p.goto(`${BASE}/study/${M.href}?lq`,{waitUntil:'load'});await p.waitForFunction(()=>window.StudyKit&&window.StudyKit.current,null,{timeout:60000});await sleep(9000);
    const steps=(await p.evaluate(()=>window.StudyKit.current.cfg.steps.map(s=>({k:s.k,lab:s.lab,cap:String(s.cap||'').replace(/<[^>]+>/g,'')})))).filter(s=>s.k!=='test').slice(0,5);
    for(let i=0;i<steps.length;i++){await p.evaluate(k=>{const K=window.StudyKit.current;K.api.setStep(K.cfg.steps.findIndex(s=>s.k===k))},steps[i].k);await sleep(7000);
      const el=await p.$('.playmain .canvas')||await p.$('.playmain');await el.evaluate(e=>e.scrollIntoView({block:'center'}));await sleep(400);
      const bb=await el.boundingBox();await p.screenshot({path:path.join(OUT,`step${i}.jpg`),clip:bb,type:'jpeg',quality:84,timeout:180000});steps[i].img=`step${i}.jpg`}
    const heroes=[`assets/models/${ID}/${ID}-hero.jpg`,`assets/models/${ID}/${ID}-hero.webp`,`study/thumbnails/${ID}.jpg`].map(x=>path.join(root,x)).filter(fs.existsSync);
    let hero=null;if(heroes.length){if(heroes[0].endsWith('.jpg'))fs.copyFileSync(heroes[0],path.join(OUT,'hero.jpg'));else{const q=await ctx.newPage();
      await q.setContent(`<style>html,body{margin:0;background:#000}img{width:100vw;height:100vh;object-fit:cover;display:block}</style><img src="file://${heroes[0]}">`);await q.setViewportSize({width:1600,height:1000});await sleep(500);
      await q.screenshot({path:path.join(OUT,'hero.jpg'),type:'jpeg',quality:86})}hero='hero.jpg'}
    fs.writeFileSync(path.join(OUT,'script.json'),JSON.stringify({id:ID,title:M.title,blurb:M.blurb||M.desc,url:`assembl.co.nz/study/${ID}`,hero,steps},null,1));
    console.log('captured',ID,steps.length,'steps →',OUT)}finally{await b.close()}})();
