// Record a study machine being played with, for the Remotion study Reels: a visible cursor moves the real sliders
// and turns the real 3D model, one clip per step, at a steady 30 fps.
// Usage: node tools/reels/play.cjs <baseUrl> <machineId> <outDir> [seconds per clip]   (needs Playwright and ffmpeg)
//
// How it stays smooth on a machine with no GPU: while a clip is recorded the page runs on a virtual clock.
// requestAnimationFrame and performance.now are replaced, and for every video frame we move the mouse, advance the
// clock by exactly 1/30 s, let the page draw, then take the screenshot, so however long a frame takes to render, the
// video plays at real speed (the idea behind the open-source timesnap/timecut recorders). Loading and moving between
// steps run on real time, exactly as for a student. The mouse is real Chromium input, so OrbitControls, range inputs
// and drag handles react as they do for a student; the cursor drawn on top is only a picture of where it is.
// The machine's own canvas, controls and readouts are laid out to fill the frame; nothing is cropped, a drawing keeps
// its shape, and readouts are left out (never cut) when they do not fit. Check a layout fast with PREVIEW=1.
// Writes <outDir>/clip<i>.mp4 (1000×1180) and adds a "clip" to each step in <outDir>/script.json.
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');const os=require('os');const {execFileSync}=require('child_process');
const [,,BASE='http://localhost:8123',ID,OUT,SECS='3.6']=process.argv;
if(!ID||!OUT){console.error('usage: node tools/reels/play.cjs <baseUrl> <machineId> <outDir> [seconds]');process.exit(1)}
const root=path.join(__dirname,'../..');const data=fs.readFileSync(path.join(root,'study/data.js'),'utf8');
const D=JSON.parse(data.slice(data.indexOf('{'),data.lastIndexOf('}')+1));const M=D.machines[ID];if(!M){console.error('no machine '+ID);process.exit(1)}
const W=440,H=519,DPR=1000/440,FPS=30,N=Math.round(+SECS*FPS);  // 1000×1180 video, the Reel's card size
const sleep=ms=>new Promise(r=>setTimeout(r,ms));fs.mkdirSync(OUT,{recursive:true});
const LITE=new Set(['claw']);  // too heavy to render frame by frame without a GPU: its static Blender render with the live results

// the clock: real time while the page loads and moves between steps (exactly what a student sees), virtual time only
// while a clip is recorded, so every recorded frame is exactly 1/30 s of page time
const CLOCK=()=>{const rRAF=window.requestAnimationFrame.bind(window),rCAF=window.cancelAnimationFrame.bind(window),rNow=performance.now.bind(performance);
  let virt=false,now=0,id=0;const q=new Map();
  window.requestAnimationFrame=cb=>{if(!virt)return rRAF(cb);q.set(-(++id),cb);return -id};
  window.cancelAnimationFrame=i=>{if(i<0)q.delete(i);else rCAF(i)};
  performance.now=()=>virt?now:rNow();
  window.__vt={start(){now=rNow();virt=true},stop(){virt=false;const cbs=[...q.values()];q.clear();cbs.forEach(cb=>rRAF(cb))},
    step(ms){if(!virt)return;now+=ms;const cbs=[...q.values()];q.clear();for(const cb of cbs){try{cb(now)}catch(e){console.error(e)}}}};
  try{localStorage.setItem('study-tour-v1','done')}catch(e){}};

// the reel layout: the machine's own canvas, controls and readouts, full frame; everything else hidden
const LAYOUT=()=>{const play=document.querySelector('.play');const wrap=document.createElement('div');wrap.id='reel-wrap';document.body.appendChild(wrap);wrap.appendChild(play);
  const st=document.createElement('style');st.textContent=`
  html,body{overflow:hidden!important}body>*:not(#reel-wrap):not(#reel-cur){visibility:hidden!important}
  #reel-wrap{position:fixed;inset:0;z-index:2147483000;background:var(--paper,#FFFDFB)}
  #reel-wrap .play{position:absolute!important;inset:0;display:block!important;margin:0!important;padding:0!important}
  #reel-wrap .playmain,#reel-wrap .rail{display:contents!important}
  #reel-wrap .play:has(.claw-graph) .playmain>.canvas{display:none!important}  /* the claw: its live results chart is the picture */
  #reel-wrap .playmain>.canvas,#reel-wrap .claw-graph,#reel-wrap #k-ctl,#reel-wrap #k-chips{position:absolute!important;left:12px;right:12px;width:auto!important;max-width:none!important;margin:0!important;box-sizing:border-box}
  #reel-wrap .playmain>.canvas{min-height:0!important;aspect-ratio:auto!important}
  #reel-wrap .claw-graph>svg,#reel-wrap .playmain>.canvas:not(.s3-on)>svg{width:100%!important;height:100%!important;min-height:0!important}  /* a drawing scales to fit, never cropped */
  #reel-wrap #k-ctl{z-index:2}#reel-wrap #k-chips.reel-off{display:none!important}#reel-wrap #k-chips{display:flex!important;flex-wrap:wrap;gap:6px;pointer-events:none}
  #reel-wrap .chip{flex:1 1 auto;min-width:0;overflow-wrap:normal;word-break:normal;hyphens:none}
  #reel-wrap .al-slot,#reel-wrap .s3-hint,#reel-wrap .playmain>*:not(.canvas):not(#k-ctl){display:none!important}#reel-wrap *{user-select:none!important}
  #reel-cur{position:fixed;left:0;top:0;width:26px;height:26px;z-index:2147483647;pointer-events:none;transform-origin:3px 2px;transition:none}
  #reel-cur .ring{position:absolute;left:-13px;top:-13px;width:32px;height:32px;border-radius:50%;background:rgba(145,106,112,.28);border:2px solid rgba(145,106,112,.65);opacity:0}
  #reel-cur.down .ring{opacity:1}#reel-cur.down svg{transform:scale(.88)}`;
  document.head.appendChild(st);
  const c=document.createElement('div');c.id='reel-cur';c.innerHTML='<div class="ring"></div><svg width="26" height="26" viewBox="0 0 26 26"><path d="M3 2 L3 21 L8.2 16.4 L11.6 24 L15 22.5 L11.7 15 L19 15 Z" fill="#240B21" stroke="#FFFDFB" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  document.body.appendChild(c);dispatchEvent(new Event('resize'))};

// what the cursor does in each step, worked out from what that step shows: drag a slider, press a button, turn the model.
// Targets are found on the page at the moment each move starts, so the cursor always lands on the real control.
async function plan(p){return p.evaluate(()=>{const vis=e=>e&&!e.closest('[hidden]')&&e.getBoundingClientRect().width>0;
  return{ranges:[...document.querySelectorAll('#k-ctl input[type=range]')].filter(vis).length,btns:[...document.querySelectorAll('#k-ctl button')].filter(vis).length,sels:[...document.querySelectorAll('#k-ctl select')].filter(vis).length,...(()=>{const bs=[...document.querySelectorAll('#k-ctl button')].filter(vis).map(b=>b.textContent.trim()).map(t=>/reset|again|next/i.test(t)?'':t);
    let i=bs.findIndex(t=>/play\s*[\d,]+/i.test(t));if(i<0)i=bs.findIndex(t=>/^[▶✦×]|^[ABC] ·|\bplay\b|\brun\b|send|drop|double|open/i.test(t));return{act:i,actPlays:i>=0&&/\bplay\b|\brun\b/i.test(bs[i])}})(),three:!!document.querySelector('.s3-host canvas')}})}
const RESOLVE=t=>{const vis=e=>e&&!e.closest('[hidden]')&&e.getBoundingClientRect().width>0;const R=e=>e.getBoundingClientRect();
  if(t.t==='thumb'||t.t==='track'){const i=[...document.querySelectorAll('#k-ctl input[type=range]')].filter(vis)[t.i];const b=R(i);
    const f=t.t==='thumb'?(+i.value-+i.min)/((+i.max-+i.min)||1):t.frac;return{x:b.x+8+f*(b.width-16),y:b.y+b.height/2}}
  if(t.t==='sel'){const e=[...document.querySelectorAll('#k-ctl select')].filter(vis)[t.i];const b=R(e);return{x:b.x+b.width*.6,y:b.y+b.height/2}}
  if(t.t==='btn'){const e=[...document.querySelectorAll('#k-ctl button')].filter(vis)[t.i];const b=R(e);return{x:b.x+b.width/2,y:b.y+b.height/2}}
  const b=R(document.querySelector('#reel-wrap .claw-graph')||document.querySelector('#reel-wrap .playmain>.canvas'));return{x:b.x+b.width*t.fx,y:b.y+b.height*t.fy}};
function timeline(pl){const segs=[];let f=0;const go=(to,frames,down=false,x={})=>{segs.push({f0:f,f1:f+frames,to,down,...x});f+=frames};const hold=(frames,down=false,x={})=>go(null,frames,down,x);
  const A=pl.act;
  if(A>=0&&pl.actPlays){go({t:'btn',i:A},14);hold(4,true);hold(30);hold(4,true);while(f<N)hold(1);return segs}  // a play button: press it twice and watch the results build (a slider would reset them)
  if(A>=0){go({t:'btn',i:A},14);hold(4,true);hold(pl.ranges?8:20)}  // press the machine's action button and watch what happens
  if(pl.ranges){go({t:'thumb',i:0},A>=0?12:16);hold(3,true);go({t:'track',i:0,frac:.88},A>=0?26:32,true);hold(3)}  // then drag its slider
  else if(A<0&&pl.btns){go({t:'btn',i:0},18);hold(4,true);hold(3)}
  else if(A<0&&pl.sels){go({t:'sel',i:0},Math.round(N*.16));hold(5,false,{press:true,pick:0});hold(Math.round(N*.22));hold(5,false,{press:true,pick:0});hold(4)}
  if(pl.three&&N-f>=24){go({t:'canvas',fx:.6,fy:.55},10);hold(3,true);go({t:'canvas',fx:.26,fy:.5},Math.max(8,N-f-5),true)}  // and turn the model
  else if(pl.ranges>1&&N-f>=24){go({t:'thumb',i:1},10);hold(3,true);go({t:'track',i:1,frac:.8},Math.max(8,N-f-5),true)}
  while(f<N)hold(1);return segs}
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;

(async()=>{const b=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'play-'));
  try{const ctx=await b.newContext({viewport:{width:W,height:H},deviceScaleFactor:DPR});const p=await ctx.newPage();await p.addInitScript(CLOCK);
    await p.goto(`${BASE}/study/${M.href}?lq${LITE.has(ID)?'&lite':''}`,{waitUntil:'load'});
    await p.waitForFunction(()=>window.StudyKit&&window.StudyKit.current,null,{timeout:90000});
    await p.evaluate(LAYOUT);await sleep(10000);  // let the model load, resize and settle
    const meta=JSON.parse(fs.readFileSync(path.join(OUT,'script.json'),'utf8'));
    for(let si=0;si<meta.steps.length;si++){const k=meta.steps[si].k;
      await p.evaluate(k=>{const K=window.StudyKit.current;K.api.setStep(K.cfg.steps.findIndex(s=>s.k===k))},k);await sleep(4000);  // the camera move into the step
      await p.evaluate(()=>{const i=[...document.querySelectorAll('#k-ctl input[type=range]')].find(e=>!e.closest('[hidden]'));
        if(i){const lo=+i.min+(+i.max-+i.min)*.22,st=+i.step||1;i.value=String(Math.round(lo/st)*st);i.dispatchEvent(new Event('input',{bubbles:true}))}});  // start low, so the drag shows the change growing
      await sleep(1500);  // the readouts redraw with the new value before they are measured
      await p.evaluate(()=>{const cv=document.querySelector('#reel-wrap .claw-graph')||document.querySelector('#reel-wrap .playmain>.canvas'),ctl=document.getElementById('k-ctl'),ch=document.getElementById('k-chips');
        const H=innerHeight,P=12,G=8,R=24;ch.classList.remove('reel-off');
        const svg=cv.querySelector('svg'),flat=!document.querySelector('.s3-host canvas')&&svg&&svg.viewBox.baseVal.width;  // a drawing, not a 3D model: keep its shape
        const cap=h=>flat?Math.min(h,Math.round((cv.clientWidth||innerWidth-2*P)*svg.viewBox.baseVal.height/svg.viewBox.baseVal.width)+6):h;
        const place=(h,top)=>{cv.style.top=top+'px';cv.style.height=h+'px';ctl.style.top=(top+h+G)+'px';ch.style.top=(top+h+G+ctl.offsetHeight+G)+'px'};
        let off=false;for(let pass=0;pass<2;pass++){const rest=ctl.offsetHeight+(off?0:G+ch.offsetHeight);let h=H-2*P-G-rest-R;
          if(!off&&cap(h)<Math.min(250,cap(9999))){off=true;ch.classList.add('reel-off');h=H-2*P-G-ctl.offsetHeight-R}  // no room for the readouts: the picture matters more
          const hh=cap(h),used=hh+G+ctl.offsetHeight+(off?0:G+ch.offsetHeight);place(hh,Math.max(P,Math.round((H-used)/2)))}  // a drawing shorter than the space sits in the middle
        dispatchEvent(new Event('resize'))});
      await sleep(1500);
      if(process.env.PREVIEW){await p.screenshot({path:path.join(OUT,`preview${si}.jpg`),type:'jpeg',quality:80,timeout:180000});console.log('preview',ID,si,JSON.stringify(await plan(p)));continue}
      await p.evaluate(()=>window.__vt.start());
      const pl=await plan(p);const segs=timeline(pl);let down=false,cur={x:W*.84,y:H*1.04},from=cur,to=cur;const dir=path.join(tmp,`c${si}`);fs.mkdirSync(dir);
      for(let i=0;i<N;i++){const sg=segs.find(s=>i>=s.f0&&i<s.f1);
        if(i===sg.f0){from=cur;to=sg.to?await p.evaluate(RESOLVE,sg.to):cur;
          if(sg.pick!=null)await p.evaluate(j=>{const e=[...document.querySelectorAll('#k-ctl select')].filter(e=>!e.closest('[hidden]'))[j];e.selectedIndex=(e.selectedIndex+1)%e.options.length;e.dispatchEvent(new Event('change',{bubbles:true}))},sg.pick)}
        const k=ease(Math.min(1,(i+1-sg.f0)/Math.max(1,sg.f1-sg.f0)));cur={x:from.x+(to.x-from.x)*k,y:from.y+(to.y-from.y)*k};
        if(sg.down&&!down){await p.mouse.move(cur.x,cur.y);await p.mouse.down();down=true;if(process.env.DBG)console.log('down',cur,await p.evaluate(([x,y])=>{const e=document.elementFromPoint(x,y);return [e.tagName,e.id,e.className,document.activeElement.id,String(getSelection())]},[cur.x,cur.y]))}else if(!sg.down&&down){await p.mouse.up();down=false}
        await p.mouse.move(cur.x,cur.y);
        await p.evaluate(([x,y,d])=>{const e=document.getElementById('reel-cur');e.style.transform=`translate(${x-3}px,${y-2}px)`;e.classList.toggle('down',d);window.__vt.step(1000/30);document.querySelectorAll('#reel-wrap .chip').forEach(c=>{c.style.visibility=c.getBoundingClientRect().bottom>innerHeight-4?'hidden':''})},[cur.x,cur.y,sg.down||!!sg.press]);
        await p.screenshot({path:path.join(dir,`f${String(i).padStart(4,'0')}.jpg`),type:'jpeg',quality:90,timeout:180000})}
      if(down)await p.mouse.up();
      await p.evaluate(()=>window.__vt.stop());
      const mp4=path.join(OUT,`clip${si}.mp4`);
      execFileSync('ffmpeg',['-y','-loglevel','error','-framerate',String(FPS),'-i',path.join(dir,'f%04d.jpg'),'-vf','scale=1000:1180:flags=lanczos,format=yuv420p','-c:v','libx264','-preset','slow','-crf','20','-movflags','+faststart',mp4]);
      meta.steps[si].clip=`clip${si}.mp4`;meta.steps[si].does=[pl.act>=0&&'button',pl.ranges&&'slider',!pl.ranges&&pl.sels&&'select',pl.three&&'turn'].filter(Boolean).join('+')||'view';console.log(ID,'step',si,k,'→',mp4)}
    if(!process.env.PREVIEW)fs.writeFileSync(path.join(OUT,'script.json'),JSON.stringify(meta,null,1));console.log('played',ID,meta.steps.length,'clips')}
  finally{await b.close();fs.rmSync(tmp,{recursive:true,force:true})}})();
