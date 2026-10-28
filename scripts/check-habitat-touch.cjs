async (page) => {
 const checks=[];const check=(ok,label)=>{if(!ok)throw new Error(label);checks.push(label)};
 const browser=page.context().browser();
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2,reducedMotion:'reduce'});
 const mobile=await context.newPage();
 await mobile.goto('http://127.0.0.1:8341/next/#zoo');await mobile.locator('#habitatViewport canvas').waitFor();
 await mobile.locator('#habitatViewport').scrollIntoViewIfNeeded();await mobile.waitForTimeout(150);
 check((await mobile.locator('#habitatStatus').textContent()).includes('Swipe vertically'),'touch-specific instructions appear');
 check(await mobile.locator('#habitatViewport canvas').evaluate(e=>getComputedStyle(e).touchAction)==='pan-y','scene preserves vertical touch scrolling');
 const before=await mobile.locator('#habitatViewport').getAttribute('data-camera');
 await mobile.getByRole('button',{name:'Rotate habitat right'}).tap();await mobile.waitForTimeout(100);
 check(before!==await mobile.locator('#habitatViewport').getAttribute('data-camera'),'touch tap rotates scene');
 await mobile.getByRole('button',{name:'Reset view',exact:true}).tap();
 await mobile.locator('#habitatViewport').scrollIntoViewIfNeeded();
 await mobile.screenshot({path:'output/playwright/habitat-touch.png'});
 await mobile.goto('http://127.0.0.1:8341/study/#h-mach');
 await mobile.locator('.app-art img').first().waitFor();
 check(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Study has no mobile horizontal overflow');
 await mobile.screenshot({path:'output/playwright/study-mobile.png'});
 await context.close();
 const noGL=await browser.newContext();await noGL.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...args){return /webgl/.test(t)?null:get.call(this,t,...args)}});
 const fallback=await noGL.newPage();await fallback.goto('http://127.0.0.1:8341/next/#zoo');await fallback.waitForTimeout(500);
 check(await fallback.locator('#zooScene').isVisible(),'device without WebGL receives drawing');
 await fallback.locator('#zoo-space').fill('30');await fallback.getByRole('button',{name:'Test this habitat',exact:true}).click();
 check((await fallback.locator('#zooScore').textContent()).includes('/100'),'no-WebGL fallback remains interactive');await noGL.close();
 return checks;
}
