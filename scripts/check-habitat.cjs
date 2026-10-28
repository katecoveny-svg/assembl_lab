async (page) => {
 const checks=[]; const check=(ok,label)=>{if(!ok)throw new Error(label);checks.push(label)};
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:1440,height:1000});
 await page.goto('http://127.0.0.1:8341/next/#zoo');
 const canvas=page.locator('#habitatViewport canvas');await canvas.waitFor();
 await page.locator('#panel-zoo').scrollIntoViewIfNeeded();
 await page.waitForTimeout(300);
 check(await page.locator('.zoo-case').evaluate(e=>e.classList.contains('is-3d')),'WebGL scene active');
 for(const key of ['space','shade','water','enrichment','quiet']){
   const before=await canvas.screenshot();
   await page.locator('#zoo-'+key).fill('10');
   await page.waitForTimeout(120);
   const after=await canvas.screenshot();
   check(!before.equals(after),key+' changes rendered geometry');
 }
 await page.getByRole('button',{name:'Test this habitat',exact:true}).click();
 check((await page.locator('#zooScore').textContent()).includes('/100'),'model assessment works');
 await page.locator('#zoo-space').fill('70');
 check(await page.locator('#zooScore').textContent()==='—','changing design invalidates old score');
 for(const [key,value] of Object.entries({space:70,shade:75,water:45,enrichment:80,quiet:85}))await page.locator('#zoo-'+key).fill(String(value));
 const firstCamera=await page.locator('#habitatViewport').getAttribute('data-camera');
 await canvas.focus();await page.keyboard.press('ArrowLeft');await page.waitForTimeout(100);
 check(firstCamera!==await page.locator('#habitatViewport').getAttribute('data-camera'),'keyboard rotates camera');
 await page.getByRole('button',{name:'Reset view',exact:true}).click();
 const box=await canvas.boundingBox();await page.mouse.move(box.x+box.width*.6,box.y+box.height*.6);await page.mouse.down();await page.mouse.move(box.x+box.width*.8,box.y+box.height*.6,{steps:8});await page.mouse.up();await page.waitForTimeout(100);
 check(firstCamera!==await page.locator('#habitatViewport').getAttribute('data-camera'),'pointer drag orbits camera');
 await page.getByRole('button',{name:'Reset view',exact:true}).click();
 await page.locator('#habitatViewport').screenshot({path:'study/thumbnails/habitat.png'});
 await page.locator('#panel-zoo').screenshot({path:'output/playwright/habitat-desktop.png'});
 for(const sp of ['tuatara','giraffe','kakapo']){await page.locator('#zooSpecies').selectOption(sp);check(await page.locator('#habitatViewport').getAttribute('data-species')===sp,sp+' spatial model displayed')}
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(150);
 check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'390px layout has no horizontal overflow');
 await page.locator('#habitatViewport').scrollIntoViewIfNeeded();await page.screenshot({path:'output/playwright/habitat-mobile.png'});
 await page.getByRole('button',{name:'Top view',exact:true}).click();await page.waitForTimeout(100);
 check((await page.locator('#habitatViewport').getAttribute('data-camera')).includes('13.00'),'top camera button works with reduced motion');
 await page.getByRole('button',{name:'Zoom in',exact:true}).click();
 await page.goto('http://127.0.0.1:8341/next/?lite#zoo');
 await page.waitForTimeout(200);
 check(await page.locator('#zooScene').isVisible(),'explicit drawing fallback visible');
 check(!await page.locator('#habitatViewport canvas').count(),'drawing fallback avoids WebGL canvas');
 await page.locator('#zoo-water').fill('95');await page.getByRole('button',{name:'Test this habitat',exact:true}).click();
 check((await page.locator('#zooScore').textContent()).includes('/100'),'fallback controls and assessment work');
 await page.locator('#panel-zoo').screenshot({path:'output/playwright/habitat-fallback.png'});
 check(errors.length===0,'no JavaScript errors');
 return {checks,errors};
}
