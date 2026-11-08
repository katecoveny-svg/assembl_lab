async (page) => {
 // Particle Studio (instruments/particle-studio). Same harness as scripts/check-lab-home.cjs: a page function run against the repo
 // served at http://127.0.0.1:8341/ (LAB_URL overrides). Chromium under SwiftShader is slow, so every page loads with a small
 // particle budget (?budget=) and reduced motion where a still is enough; the budget flag changes only the count, never the code paths.
 const BASE=(typeof process!=='undefined'&&process.env.LAB_URL)||'http://127.0.0.1:8341';
 const checks=[];const check=(ok,label)=>{if(!ok)throw new Error(label);checks.push(label)};
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!/404|Failed to load resource/.test(m.text()))errors.push(m.text())});
 const ready=async(url,opts={})=>{await page.goto(BASE+'/instruments/particle-studio/'+url);await page.waitForFunction(()=>window.__ps&&(window.__ps.ready||window.__ps.nogl),null,{timeout:90000});await page.waitForTimeout(opts.wait??1500)};
 const probe=()=>page.evaluate(()=>window.__ps.pixels());
 await page.setViewportSize({width:1440,height:900});
 // 1. boots, labelled, honest
 await ready('?budget=16384',{wait:3000});
 check(await page.locator('.ps-top .truth[data-k="ill"]').count()===1&&/Illustrative/.test(await page.locator('.ps-top .truth').innerText()),'labelled Illustrative');
 check(/stays on your device/.test(await page.locator('.ps-note').first().innerText())&&/never leave the browser/.test(await page.locator('.ps-note').first().innerText()),'the on-device note is present');
 check(await page.locator('#ps-pause').getAttribute('aria-label')==='Pause motion','the pause button is "Pause motion"');
 check(await page.locator('h1').count()===0||await page.locator('h1:visible').count()<=1,'at most one visible h1');
 check(await page.evaluate(()=>!/\bAssembl\b|\bASSEMBL\b/.test(document.body.innerText)),'brand word is lowercase assembl');
 let px=await probe();check(px.bright>12&&px.ground<px.w*px.h*0.97,`the default preset renders non-empty pixels (${px.bright} bright of ${px.w*px.h})`);
 check((await page.evaluate(()=>window.__ps.spec.name))==='The mark, assembling','the default design is the mark assembling');
 // 2. every preset loads with no page error and draws something
 const ids=await page.evaluate(()=>[...document.querySelectorAll('#ps-preset-list [data-preset]')].map(b=>b.dataset.preset));
 check(ids.length>=8,`at least eight presets (${ids.length})`);
 for(const id of ids){await page.evaluate(id=>window.__ps.loadPreset(id),id);await page.waitForFunction(id=>window.__ps.spec&&window.__ps.spec.name&&location.search.includes(id),id,{timeout:30000});await page.waitForTimeout(2200);
  px=await probe();const errs=await page.evaluate(()=>window.__ps.errors);check(px.bright>4&&errs.length===0,`preset ${id} loads and renders (${px.bright} bright${errs.length?'; '+errs[0]:''})`)}
 // 3. the code is the design: editing it changes the scene
 await page.evaluate(()=>window.__ps.loadPreset('galaxy'));await page.waitForTimeout(1500);
 const before=await page.evaluate(()=>JSON.stringify([window.__ps.spec.look.bloom,window.__ps.spec.emitters[0].shape.type]));
 const code=await page.evaluate(()=>window.__ps.code);
 const edited=code.replace(/bloom:\s*[\d.]+/,'bloom: 1.2').replace(/type:\s*"spiral"/,'type: "torus"');
 await page.locator('#ps-code .ps-ed-text').fill(edited);await page.waitForTimeout(1200);
 const after=await page.evaluate(()=>JSON.stringify([window.__ps.spec.look.bloom,window.__ps.spec.emitters[0].shape.type]));
 check(before!==after&&after==='[1.2,"torus"]','editing the code changes the design (bloom and shape)');
 check(await page.locator('#ps-look input[type=range]').first().inputValue()==='1.2','the blocks follow the code');
 await page.locator('#ps-code .ps-ed-text').fill(edited.replace('type: "orbit"','type: "nope"'));await page.waitForTimeout(1200);
 check(await page.locator('.ps-ed-error').isVisible()&&/unknown field "nope"/.test(await page.locator('.ps-ed-error').innerText())&&(await page.evaluate(()=>window.__ps.spec.fields.length))===2,'a bad field is reported inline, not thrown, and the rest of the design runs');
 await page.locator('#ps-code .ps-ed-text').fill('export default {\n  name: "broken",\n  fields: [\n');await page.waitForTimeout(1200);
 const errText=await page.locator('.ps-ed-error').innerText();check(/Line \d+:|Syntax/.test(errText),'a syntax error shows with a line, and the last design keeps running');
 check(errors.length===0,'no page errors so far: '+errors.join(' | '));
 // 4. a slider writes into the code
 await page.evaluate(()=>window.__ps.loadPreset('fabric'));await page.waitForTimeout(1500);
 await page.evaluate(()=>document.querySelectorAll('.ps-sec').forEach(d=>d.open=true));
 const bloom=page.locator('#ps-look input[type=range]').first();await bloom.fill('0.9');await bloom.dispatchEvent('input');await page.waitForTimeout(300);
 check(/bloom:\s*0\.9\b/.test(await page.evaluate(()=>window.__ps.code)),'a slider writes its value into the code');
 // 5. the surprise seed round-trips through the URL
 await page.evaluate(()=>window.__ps.loadSurprise(424242));await page.waitForTimeout(1500);
 const sName=await page.evaluate(()=>window.__ps.spec.name);
 check(/#seed=424242$/.test(await page.url()),'the surprise seed is in the URL hash');
 await ready('?budget=16384#seed=424242',{wait:2500});
 check((await page.evaluate(()=>window.__ps.spec.name))===sName&&(await page.evaluate(()=>window.__ps.spec.seed))===424242,'the same seed gives the same design from the link');
 // 6. a share link carries the whole design
 await page.evaluate(()=>window.__ps.setCode(window.__ps.code.replace(/name:\s*"[^"]*"/,'name: "Shared test"')));await page.waitForTimeout(800);
 await page.locator('#ps-share').click();await page.waitForTimeout(600);const shareUrl=await page.url();check(/#z=|#j=/.test(shareUrl),'a share link is written to the hash');
 await ready(shareUrl.slice(shareUrl.indexOf('?')),{wait:2000});check((await page.evaluate(()=>window.__ps.spec.name))==='Shared test','the share link restores the design');
 // 7. export to the engine: a valid points file, and the "In the engine" preview renders with the real engine
 await page.evaluate(()=>window.__ps.loadPreset('mark'));await page.waitForTimeout(2500);
 await page.locator('#ps-export').click();await page.waitForTimeout(400);check(await page.locator('#ps-export-dlg').evaluate(d=>d.open),'the export dialog opens');
 check(/Only the frame.s points are exported, not the live simulation/.test(await page.locator('.ps-xs-engine').innerText()),'the export says only the frame is exported');
 await page.locator('#x-count').selectOption('60000');await page.locator('#x-bake-a').click();await page.waitForFunction(()=>window.__ps.baked&&window.__ps.baked.a,null,{timeout:60000});
 const baked=await page.evaluate(()=>window.__ps.baked.a);
 check(baked.header.format==='assembl-points/1'&&baked.bytes===baked.count*baked.stride&&baked.count>1000,`the points file is valid: ${baked.count} points × stride ${baked.stride} = ${baked.bytes} bytes`);
 check(baked.header.bounds&&baked.header.anchors&&Object.keys(baked.header.anchors).length>=1&&baked.header.fields.join()==='x,y,z,light,kind,part,phase','the header has bounds, anchors and the field layout');
 check(Math.abs(Math.max(baked.header.bounds.x[1]-baked.header.bounds.x[0],baked.header.bounds.z[1]-baked.header.bounds.z[0])-2.1)<0.02,'the form is normalised to the engine units (2.1 across)');
 // read the file back the way lab/pc/auckland.js reads it: the header's count of points, three Float32 a point, all finite
 const decoded=await page.evaluate(async()=>{const m=await import('/instruments/particle-studio/exporter.js');const {bin,header}=window.__ps.rawBaked.a;const f=m.decodePoints(bin,header);let fin=true;for(let i=0;i<f.pos.length;i++)if(!isFinite(f.pos[i]))fin=false;return {n:f.n,count:header.count,floats:f.pos.length,fin,light:f.light.length,kind:f.kind.length}});
 check(decoded.n===decoded.count&&decoded.floats===decoded.count*3&&decoded.fin&&decoded.light===decoded.count&&decoded.kind===decoded.count,`the file reads back: ${decoded.count} points, ${decoded.floats} Float32 positions`);
 await page.waitForTimeout(3500);
 const eng=await page.evaluate(()=>{const c=document.getElementById('x-engine');const cv=document.createElement('canvas');cv.width=48;cv.height=30;const g=cv.getContext('2d');try{g.drawImage(c,0,0,48,30)}catch(e){return {err:e.message}}const d=g.getImageData(0,0,48,30).data;let bright=0;for(let i=0;i<d.length;i+=4)if(d[i]+d[i+1]+d[i+2]>300)bright++;return {bright,w:c.width,h:c.height}});
 const engineShot=await page.locator('#x-engine').screenshot();
 check(engineShot.length>4000&&eng.w>0,`the "In the engine" preview renders with the shared engine (${eng.w}×${eng.h})`);
 check(await page.locator('#x-studio-still').evaluate(i=>i.naturalWidth>0),'the studio still sits beside it');
 await page.locator('#x-bake-b').click();await page.waitForFunction(()=>window.__ps.baked&&window.__ps.baked.b,null,{timeout:60000});check(/pair A \+ B/.test(await page.locator('#x-baked').innerText()),'a morph pair exports as two forms');
 await page.keyboard.press('Escape');
 // 8. reduced motion holds a still, with the controls working
 await page.emulateMedia({reducedMotion:'reduce'});await ready('?budget=16384&preset=galaxy',{wait:2500});
 const a=await probe();await page.waitForTimeout(1500);const b=await probe();
 check(a.bright>4&&Math.abs(a.mean-b.mean)<0.5,'reduced motion holds a still, fully formed frame');
 await page.evaluate(()=>document.querySelectorAll('.ps-sec').forEach(d=>d.open=true));
 const size=page.locator('#ps-look input[type=range]').nth(2);await size.fill('2.5');await size.dispatchEvent('input');await page.waitForTimeout(1500);const c=await probe();
 check(c.bright!==b.bright||Math.abs(c.mean-b.mean)>0.2,'controls still work under reduced motion');
 await page.emulateMedia({reducedMotion:'no-preference'});
 // 9. keyboard: the skip link first, visible focus rings, panels reachable
 await ready('?budget=16384',{wait:1500});await page.evaluate(()=>scrollTo(0,0));await page.keyboard.press('Tab');check(await page.evaluate(()=>document.activeElement.className)==='skip','skip link is the first tab stop');
 await page.keyboard.press('Tab');const ring=await page.evaluate(()=>getComputedStyle(document.activeElement).outlineStyle);check(ring!=='none','focus ring visible');
 // 10. phone: no horizontal scroll, panels as sheets
 await page.setViewportSize({width:390,height:844});await ready('?budget=16384',{wait:2500});
 check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal scroll at 390px');
 check(await page.locator('.ps-tabs').isVisible(),'phone tabs are shown');
 await page.locator('.ps-tab[data-tab="ps-blocks"]').click();await page.waitForTimeout(300);
 const sheet=await page.locator('#ps-blocks').boundingBox();check(sheet&&sheet.y+sheet.height>=844-80&&sheet.width>=380,'the blocks panel is a bottom sheet on a phone');
 // 11. no WebGL2: a clear message and a still (last: the stub stays installed for the rest of the page's life)
 await page.addInitScript(()=>{const g=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...a){return t==='webgl2'?null:g.call(this,t,...a)}});
 await ready('?budget=16384');
 check(await page.locator('#ps-nogl').isVisible()&&/needs WebGL2/.test(await page.locator('#ps-nogl').innerText()),'no WebGL2 shows a clear message');
 check(await page.locator('#ps-nogl img').evaluate(i=>i.complete&&i.naturalWidth>0),'no WebGL2 shows a still');
 check(await page.locator('#ps-nogl .truth[data-k="ill"]').count()===1,'the still is labelled Illustrative too');
 check(errors.length===0,'no page errors: '+errors.join(' | '));
 return checks;
}
