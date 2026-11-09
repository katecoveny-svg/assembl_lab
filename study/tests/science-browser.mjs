async page=>{
 const results=[];const base='http://127.0.0.1:8882';
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:390,height:844});
 for(const [id,step,answer] of [['energy','heat',0],['genes','cross',1],['reactions','conc',2]]){
  const errors=[];const onError=e=>errors.push(e.message);page.on('pageerror',onError);
  await page.goto(base+'/study/m/'+id+'.html#'+step);await page.locator('#k-lesson').waitFor();
  if(await page.locator('[data-stage]').count()!==5)throw Error(id+' stages');
  if(await page.evaluate(()=>StudyKit.current.api.state.playing))throw Error(id+' autoplay');
  await page.locator('[data-stage="0"]').focus();await page.keyboard.press('End');
  if(await page.evaluate(()=>document.activeElement.dataset.stage)!=='4')throw Error(id+' keyboard End');
  await page.locator('#k-check-reason').click();if(!(await page.locator('#k-check-feedback').innerText()).includes('Capture A and B'))throw Error('evidence gate');
  await page.locator('[data-stage="1"]').click();await page.locator('#k-prediction').fill('My prediction, before looking at the outcomes.');
  await page.locator('[data-stage="2"]').click();
  for(const slot of ['A','B']){
   await page.locator('[data-prepare="'+slot+'"]').click();
   if(id==='energy')await page.getByRole('button',{name:'Observe 60 s',exact:true}).click();
   if(id==='reactions'){await page.locator('#k-play').click();await page.waitForFunction(()=>StudyKit.current.api.state.run.t>=2);await page.locator('#k-play').click();}
   await page.locator('[data-capture="'+slot+'"]').click();
   if(!(await page.locator('#k-lesson-status').innerText()).startsWith('Observation '+slot+' captured'))throw Error(id+' '+slot+' capture failed');
  }
  const evidence=await page.locator('#k-evidence').innerText();
  await page.locator('[data-stage="3"]').click();await page.locator('#k-explanation').fill('I used the captured A and B evidence to explain the difference.');
  await page.locator('[data-stage="4"]').click();
  await page.locator('input[name="lesson-check"][value="'+((answer+1)%3)+'"]').check();await page.locator('#k-check-reason').click();
  if(!(await page.locator('#k-check-feedback').innerText()).startsWith('Reconsider'))throw Error(id+' wrong feedback');
  await page.locator('input[name="lesson-check"][value="'+answer+'"]').focus();await page.keyboard.press('Space');await page.locator('#k-check-reason').focus();await page.keyboard.press('Enter');
  const feedback=await page.locator('#k-check-feedback').innerText();if(!feedback.startsWith('That claim fits'))throw Error(id+' correct feedback');
  if(await page.locator('#k-prediction').inputValue()!=='My prediction, before looking at the outcomes.')throw Error('lost prediction');
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error(id+' overflow');
  await page.locator('#k-lesson-work').screenshot({path:'output/playwright/science/'+id+'-phone-check.png'});
  await page.locator('#k-lesson').screenshot({path:'output/playwright/science/'+id+'-phone-stages.png'});
  await page.locator('[data-stage="2"]').click();await page.locator('[data-prepare="A"]').click();
  if(id==='energy')await page.getByRole('button',{name:'Observe 60 s',exact:true}).click();
  if(id==='reactions'){await page.locator('#k-play').click();await page.waitForFunction(()=>StudyKit.current.api.state.run.t>=2);await page.locator('#k-play').click();}
  await page.locator('[data-capture="A"]').click();if(await page.locator('#k-check-feedback').innerText())throw Error('stale feedback');
  await page.locator('#k-lesson-reset').click();if(await page.locator('#k-prediction').inputValue())throw Error('reset');
  page.off('pageerror',onError);if(errors.length)throw Error(id+' '+errors.join('; '));results.push({id,evidence,feedback,keyboard:true,reducedMotion:true,noOverflow:true,errors});
 }
 await page.goto(base+'/study/ar/?id=essay');await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('works in your browser'));
 if(await page.locator('.study-ar-launch').count()||await page.locator('canvas').isVisible())throw Error('web-first');
 const entries=await page.evaluate(async()=>{const m=await fetch('/study/ar/manifest.json').then(r=>r.json());return m.experiences.filter(e=>e.status==='web-first')});
 for(const e of entries){await page.locator('select').selectOption(e.id);await page.waitForFunction(note=>document.querySelector('#delivery>p')?.textContent===note,e.note);if(await page.locator('.study-ar-launch').count()||await page.locator('canvas').isVisible())throw Error(e.id+' web-first');}
 const no3d=await page.context().newPage();await no3d.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(type.includes('webgl'))return null;return original.call(this,type,...args)}});await no3d.goto(base+'/study/ar/?id=essay');await no3d.waitForFunction(()=>document.querySelector('#status').textContent.includes('works in your browser'));if(await no3d.locator('canvas').isVisible())throw Error('no WebGL canvas');await no3d.close();
 return {results,webFirstCount:entries.length,withoutWebGL:true,physicalPhoneTested:false};
}
