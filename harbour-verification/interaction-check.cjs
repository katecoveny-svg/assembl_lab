const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const base=process.env.SITE_URL||'http://localhost:43918/',out=process.env.EVIDENCE_DIR||'output/interactions';fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{
 const p=await browser.newPage({viewport:{width:1360,height:1000}});const errors=[],tiles=[];p.on('response',r=>{if(r.url().includes('tile.openstreetmap.org')&&r.status()===200)tiles.push(r.url())});p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base);await p.waitForSelector('canvas');await p.locator('canvas').scrollIntoViewIfNeeded();await p.waitForTimeout(1000);
 const a=await p.locator('canvas').screenshot();await p.waitForTimeout(450);const b=await p.locator('canvas').screenshot();assert.notDeepEqual(a,b,'water animates');
 await p.locator('#motion').click();await p.waitForTimeout(300);const c=await p.locator('canvas').screenshot();await p.waitForTimeout(450);assert.deepEqual(c,await p.locator('canvas').screenshot(),'paused water stable');
 await p.locator('#zoomIn').click();assert.notDeepEqual(c,await p.locator('canvas').screenshot(),'zoom changes view');await p.locator('#resetView').click();
 await p.locator('#eventChoice').selectOption('1');assert.match(await p.locator('#sceneNote').innerText(),/3.2 m/);await p.getByText('What am I looking at?',{exact:true}).click();assert.match(await p.locator('#helperEvent').innerText(),/3.2 m/);
 await p.locator('iframe').scrollIntoViewIfNeeded();for(let i=0;i<20&&!tiles.length;i++)await p.waitForTimeout(500);assert.ok(tiles.length,'OSM tiles loaded');await p.locator('.context').screenshot({path:out+'/shore-context.png'});
 await p.evaluate(()=>scrollTo(0,0));await p.screenshot({path:out+'/desktop.png'});await p.setViewportSize({width:390,height:844});await p.waitForTimeout(300);assert.equal(await p.locator('header').count(),1);await p.screenshot({path:out+'/phone.png'});await p.locator('#events').screenshot({path:out+'/phone-table.png'});
 await p.goto(base+'?view=table');assert.equal(await p.locator('canvas').count(),0);assert.equal(await p.locator('#rows tr').count(),4);
 const gpu=await browser.newContext();await gpu.addInitScript(()=>{const orig=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/.test(type)?null:orig.call(this,type,...args)}});const q=await gpu.newPage();await q.goto(base);await q.waitForFunction(()=>document.querySelector('#sceneNote').textContent.includes('unavailable'));assert.equal(await q.locator('#rows tr').count(),4);await q.screenshot({path:out+'/no-gpu.png'});
 assert.deepEqual(errors,[]);console.log('PASS: animated pixels, paused pixels stable, zoom/reset, helper matches selected prediction, actual OSM tiles loaded, desktop/phone screenshots, direct no-GPU URL never creates canvas, WebGL unavailable retains tides.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
