async (page) => {
 const checks=[];const check=(ok,label)=>{if(!ok)throw new Error(label);checks.push(label)};
 await page.setViewportSize({width:1440,height:1000});
 await page.goto('http://127.0.0.1:8341/next/#zoo');
 const canvas=page.locator('#habitatViewport canvas');await canvas.waitFor();
 await canvas.scrollIntoViewIfNeeded();
 for(const space of [0,70,100]){
   await page.locator('#zoo-space').fill(String(space));
   let previous;
   for(const water of [10,50,100]){
     await page.locator('#zoo-water').fill(String(water));await page.waitForTimeout(100);
     const shot=await canvas.screenshot({path:`output/playwright/water-space${space}-water${water}.png`});
     if(previous)check(!previous.equals(shot),`space ${space}: water ${water===50?'10→50':'50→100'} changes rendered basin`);
     previous=shot;
   }
 }
 for(const [space,start] of [[0,45],[70,72]]){
   await page.locator('#zoo-space').fill(String(space));await page.locator('#zoo-water').fill(String(start));await page.waitForTimeout(100);
   const before=await canvas.screenshot();await page.locator('#zoo-water').fill('100');await page.waitForTimeout(100);
   check(!before.equals(await canvas.screenshot()),`former plateau fixed: space ${space}, water ${start}→100`);
 }
 // Block the renderer module itself, then Three.js separately. Neither can own score validity.
 for(const blocked of ['**/next/habitat/scene.js','**/assets/vendor/three/three.module.min.js']){
   const context=await page.context().browser().newContext();const fallback=await context.newPage();
   await fallback.route(blocked,route=>route.abort('failed'));
   await fallback.goto('http://127.0.0.1:8341/next/#zoo');
   await fallback.getByText('Drawing mode · 3D could not load. All habitat controls still work.',{exact:true}).waitFor();
   check(await fallback.locator('#zooScene').isVisible(),`${blocked}: drawing remains visible`);
   for(const key of ['space','shade','water','enrichment','quiet']){
     await fallback.getByRole('button',{name:'Test this habitat',exact:true}).click();
     check((await fallback.locator('#zooScore').textContent()).includes('/100'),`${blocked}: ${key} precondition scored`);
     await fallback.locator('#zoo-'+key).fill('12');
     check(await fallback.locator('#zooScore').textContent()==='—',`${blocked}: ${key} invalidates score`);
     check(await fallback.locator('#zooMeter').evaluate(e=>e.style.width)==='0px',`${blocked}: ${key} clears meter`);
   }
   await fallback.locator('#panel-zoo').screenshot({path:`output/playwright/habitat-import-failure-${blocked.includes('scene')?'scene':'three'}.png`});
   await context.close();
 }
 const liteContext=await page.context().browser().newContext();const lite=await liteContext.newPage();const resources=[];
 lite.on('request',r=>resources.push(r.url()));
 await lite.goto('http://127.0.0.1:8341/next/?lite#zoo');
 await lite.getByText('Drawing mode selected · all habitat controls still work. No 3D resources loaded.',{exact:true}).waitFor();
 check(await lite.locator('#zooScene').isVisible(),'explicit lite drawing is visible');
 await lite.getByRole('button',{name:'Test this habitat',exact:true}).click();
 check((await lite.locator('#zooScore').textContent()).includes('/100'),'explicit lite assessment works');
 await lite.locator('#zoo-water').fill('92');
 check(await lite.locator('#zooScore').textContent()==='—','explicit lite design change invalidates score');
 check(!resources.some(url=>url.includes('/assets/vendor/three/')||url.includes('/next/habitat/scene.js')),'explicit lite makes zero renderer/Three/addon requests');
 await liteContext.close();
 return checks;
}
