// Manual browser QA for /study/m/particles.html (not part of `node --test`: it needs a static server and Playwright).
//   python3 -m http.server 8791 --bind 127.0.0.1   (from the repo root)
//   PW=/path/to/playwright/index.js node study/tests/particles-browser.mjs http://127.0.0.1:8791 /tmp/particles-qa
// Software WebGL (SwiftShader) in headless Chromium only. This is not real-device, GPU or AR verification.
import {createRequire} from 'node:module';
import {mkdirSync} from 'node:fs';
const {chromium}=createRequire(import.meta.url)(process.env.PW||'playwright');
const BASE=process.argv[2]||'http://127.0.0.1:8791',OUT=(process.argv[3]||'/tmp/particles-qa')+'/';mkdirSync(OUT,{recursive:true});
const URL0=BASE+'/study/m/particles.html';const results=[];let failures=0;
const check=(name,ok,detail='')=>{results.push(`${ok?'PASS':'FAIL'} ${name}${detail?' · '+detail:''}`);if(!ok)failures++;console.log(results.at(-1))};
async function page(b,opts={},hash='heat',query=''){
 const ctx=await b.newContext({viewport:opts.viewport||{width:1440,height:1000},reducedMotion:opts.reduced?'reduce':'no-preference'});
 const p=await ctx.newPage();p.setDefaultTimeout(240000);
 await p.route(u=>!u.href.startsWith(BASE),r=>r.abort());
 if(opts.route)await opts.route(p);
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(URL0+query+'#'+hash,{waitUntil:'domcontentloaded'});p.errors=errors;return p;
}
const ready=p=>p.waitForFunction(()=>['ready','fallback'].includes(document.documentElement.dataset.particlesAsset),null,{timeout:240000}).then(()=>p.evaluate(()=>document.documentElement.dataset.particlesAsset));
const shot=async(p,name,sel='.playmain .canvas')=>{await p.evaluate(s=>document.querySelector(s).scrollIntoView({block:'start'}),sel);const bb=await p.locator(sel).boundingBox();await p.screenshot({path:OUT+name+'.png',clip:bb})};
const S=p=>p.evaluate(()=>{const a=StudyKit.current.api,s=a.state;const sc=a.s3?.scene;const n=k=>sc?.getObjectByName(k);
 return {vol:s.vol,gasT:s.gasT,step:a.step.k,plunger:n('PLUNGER_SLIDE')?.position.x,needle:n('GAUGE_NEEDLE_PIVOT')?.rotation.z,press:document.querySelector('#k-chips')?.textContent||'',
  live:document.querySelector('.playmain .canvas').classList.contains('s3-on'),status:document.getElementById('particles-load-status')?.textContent,btn:document.getElementById('particles-graphics')?.textContent}});

const ONLY=(process.env.ONLY||'1,2,3,4,5,6,7').split(',');const run=n=>ONLY.includes(String(n));
const b=await chromium.launch();
// 1 · widths, layout, framing
if(run(1))for(const [w,h] of [[320,720],[375,812],[1440,1000]]){
 const p=await page(b,{viewport:{width:w,height:h},reduced:true},'pressure');const st=await ready(p);
 await p.waitForTimeout(2500);
 const over=await p.evaluate(()=>document.scrollingElement.scrollWidth-innerWidth);
 check(`${w}px loads live 3D`,st==='ready',st);check(`${w}px has no horizontal page scroll`,over<=0,'overflow '+over+'px');
 await shot(p,`w${w}-pressure`);await p.evaluate(()=>location.hash='heat');await p.waitForTimeout(2500);await shot(p,`w${w}-heat`);
 await p.screenshot({path:OUT+`w${w}-page.png`});
 check(`${w}px no page errors`,p.errors.length===0,p.errors.join(' | '));await p.context().close();
}
// 2 · model drives the GLB: volume, gauge, readouts; plunger drag; keyboard orbit and focus
if(run(2)){const p=await page(b,{reduced:true},'pressure');await ready(p);await p.waitForTimeout(1500);
 const c=await p.evaluate(()=>fetch('/assets/models/particles/particles-rig-contract.json').then(r=>r.json()));const per=c.rig.plunger.metres_per_mL,x60=c.nodes.PLUNGER_SLIDE.rest_translation_gltf_m[0];
 await p.evaluate(()=>{const a=StudyKit.current.api;a.state.vol=30;a.redraw()});await p.waitForTimeout(800);let r=await S(p);
 check('30 mL moves the GLB plunger to the contracted face position',Math.abs(r.plunger-(x60-30*per))<1e-6,`${r.plunger}`);
 check('gauge needle shows the model pressure (202.6 kPa)',Math.abs(r.needle+202.6/400*1.5*Math.PI)<1e-9,`${r.needle}`);check('chip reads 203 kPa',/203 kPa/.test(r.press));
 await shot(p,'model-30mL');
 // drag the thumb plate 40 px to the right (pulling the plunger out → more volume)
 const pt=await p.evaluate(()=>{const a=StudyKit.current.api,s3=a.s3,o=s3.scene.getObjectByName('THUMB_PLATE');const v=new s3.THREE.Box3().setFromObject(o).getCenter(new s3.THREE.Vector3()).project(s3.camera);const r=s3.canvas.getBoundingClientRect();return {x:r.left+(v.x*.5+.5)*r.width,y:r.top+(-v.y*.5+.5)*r.height}});
 await p.mouse.move(pt.x,pt.y);await p.mouse.down();for(let i=1;i<=8;i++)await p.mouse.move(pt.x+i*8,pt.y);await p.mouse.up();await p.waitForTimeout(800);r=await S(p);
 check('dragging the GLB thumb plate changes the lesson volume',r.vol>30,'vol '+r.vol);check('GLB plunger follows the dragged volume',Math.abs(r.plunger-(x60+(r.vol-60)*per))<1e-6);
 await shot(p,'drag-plunger');
 // keyboard: focus the 3D canvas with Tab-reachable focus and orbit with arrow keys
 await p.keyboard.press('Shift');await p.focus('.s3-host canvas');const cam0=await p.evaluate(()=>StudyKit.current.api.s3.camera.position.toArray());await p.keyboard.press('ArrowLeft');await p.keyboard.press('ArrowLeft');
 const cam1=await p.evaluate(()=>StudyKit.current.api.s3.camera.position.toArray());check('arrow keys orbit the 3D view',cam0.some((v,i)=>Math.abs(v-cam1[i])>1e-3));
 const fv=await p.evaluate(()=>getComputedStyle(document.querySelector('.s3-host canvas')).boxShadow);check('focused 3D canvas shows a visible focus ring',/inset/.test(fv),fv);await shot(p,'focus-canvas');
 await p.focus('#particles-graphics');await p.keyboard.press('Shift+Tab');await p.keyboard.press('Tab');
 const fb=await p.evaluate(()=>{const e=document.activeElement;const cs=getComputedStyle(e);return e.id+' '+cs.outlineStyle+' '+cs.outlineWidth});check('graphics toggle is keyboard reachable with a visible outline',/particles-graphics solid 3px/.test(fb),fb);
 await p.screenshot({path:OUT+'focus-toggle.png',clip:await p.locator('.particles-view-note').boundingBox()});
 check('no page errors (interaction)',p.errors.length===0,p.errors.join(' | '));await p.context().close();}
// 3 · state, investigation evidence and notes survive the 3D ↔ drawing switch; explicit reset
if(run(3)){const p=await page(b,{reduced:true},'pressure');await ready(p);
 await p.click('[data-stage="2"]');await p.click('[data-prepare="A"]');await p.click('[data-capture="A"]');await p.click('[data-prepare="B"]');await p.click('[data-capture="B"]');
 await p.click('[data-stage="3"]');await p.fill('#k-explanation','Half the space, twice the hits.');
 await p.evaluate(()=>{const a=StudyKit.current.api;a.state.vol=45;a.state.gasT=35;a.redraw()});
 const ev0=await p.textContent('#k-evidence');let r0=await S(p);
 await p.click('#particles-graphics');await p.waitForTimeout(800);let r1=await S(p);
 check('switch to drawing is in-page (no reload) and hides 3D',!r1.live&&/simplified/i.test(r1.status)&&r1.btn==='Use live 3D');
 check('drawing keeps volume, temperature and topic',r1.vol===45&&r1.gasT===35&&r1.step==='pressure');
 check('drawing keeps A/B evidence and the note',(await p.textContent('#k-evidence'))===ev0&&(await p.inputValue('#k-explanation'))==='Half the space, twice the hits.'&&/202\.6/.test(ev0));
 check('?lite is recorded in the address for reloads',/[?&]lite/.test(p.url()));await shot(p,'toggle-drawing');
 await p.click('#particles-graphics');await p.waitForTimeout(1500);const r2=await S(p);
 const c=await p.evaluate(()=>fetch('/assets/models/particles/particles-rig-contract.json').then(r=>r.json()));const want=c.nodes.PLUNGER_SLIDE.rest_translation_gltf_m[0]+(45-60)*c.rig.plunger.metres_per_mL;
 check('switch back to live 3D keeps state and poses the GLB from it',r2.live&&r2.vol===45&&Math.abs(r2.plunger-want)<1e-6&&!/[?&]lite/.test(p.url()),`${r2.live} ${r2.vol} ${r2.plunger} vs ${want}`);
 check('A/B evidence still present after the round trip',(await p.textContent('#k-evidence'))===ev0);await shot(p,'toggle-back-live');
 await p.click('#k-lesson-reset');await p.waitForTimeout(800);const r3=await S(p);
 check('Restart investigation resets to 60 mL and the GLB plunger to rest',r3.vol===60&&/Not captured yet/.test(await p.textContent('#k-evidence')));
 check('no page errors (state)',p.errors.length===0,p.errors.join(' | '));await p.context().close();}
// 4 · ?lite opens the drawing; "Use live 3D" attaches the GLB bench in page without losing state
if(run(4)){const p=await page(b,{},'pressure','?lite');await p.waitForTimeout(1500);
 await p.evaluate(()=>{const a=StudyKit.current.api;a.state.vol=25;a.redraw()});let r=await S(p);
 check('?lite starts in the drawing with no 3D host',!r.live&&!(await p.$('.s3-host')),r.status);await shot(p,'lite-drawing');
 await p.click('#particles-graphics');const st=await ready(p);await p.waitForTimeout(1500);r=await S(p);
 check('Use live 3D attaches the GLB in page and keeps 25 mL',st==='ready'&&r.live&&r.vol===25,st);await shot(p,'lite-to-live');
 check('no page errors (lite)',p.errors.length===0,p.errors.join(' | '));await p.context().close();}
// 5 · reduced motion: camera jumps, molecules still until Play
if(run(5)){const p=await page(b,{reduced:true},'particles');await ready(p);await p.waitForTimeout(1000);
 const m=()=>p.evaluate(()=>{let im=null;StudyKit.current.api.s3.scene.traverse(o=>{if(o.isInstancedMesh&&o.count===343&&!im)im=o});return Array.from(im.instanceMatrix.array.slice(0,48))});
 const a=await m();await p.waitForTimeout(1200);const c=await m();check('reduced motion: ice molecules hold still while paused',a.every((v,i)=>v===c[i]));
 await shot(p,'reduced-motion-particles');await p.context().close();}
// 6 · failure paths: GLB 404, wrong contract, no WebGL
if(run(6))for(const [name,route] of [['glb-404',p=>p.route('**/particles-apparatus.glb',r=>r.fulfill({status:404,body:''}))],
  ['wrong-contract',p=>p.route('**/particles-rig-contract.json',async r=>{const res=await r.fetch();const j=await res.json();j.contract='assembl.particles.v0';r.fulfill({response:res,json:j})})]]){
 const p=await page(b,{route},'heat');const st=await ready(p);await p.waitForTimeout(1200);const r=await S(p);
 check(`${name}: falls back to the live drawing`,st==='fallback'&&!r.live&&/3D unavailable/.test(r.status)&&r.btn==='Live 3D unavailable',st+' · '+r.status);
 const svgVisible=await p.evaluate(()=>getComputedStyle(document.getElementById('k-main')).opacity==='1'&&document.getElementById('k-main').innerHTML.length>1000);check(`${name}: drawing is visible and populated`,svgVisible);
 await shot(p,'fail-'+name);await p.context().close();}
await b.close();
if(run(7)){const b2=await chromium.launch({args:['--disable-webgl','--disable-3d-apis']});const p=await page(b2,{},'heat');await p.waitForTimeout(2500);const r=await S(p);
 check('no WebGL: drawing only, honest status, toggle disabled',!r.live&&!(await p.$('.s3-host'))&&r.btn==='Live 3D needs WebGL'&&/no WebGL/.test(r.status),r.status);
 await shot(p,'no-webgl');await b2.close();}
console.log(`\n${results.length-failures}/${results.length} checks passed`);process.exit(failures?1:0);
