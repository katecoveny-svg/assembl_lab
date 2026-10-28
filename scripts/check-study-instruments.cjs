async (page) => {
 const checks=[];const check=(ok,label)=>{if(!ok)throw Error(label);checks.push(label)};
 const expected=['reality-remix','soft-matter','impossible-objects'];
 await page.setViewportSize({width:1440,height:1000});await page.goto('http://127.0.0.1:8341/study/');
 check(await page.locator('#machines .app').count()===35,'35 curriculum cards unchanged');
 check(await page.evaluate(()=>Object.keys(STUDY.machines).length)===35,'curriculum data count remains 35');
 check(await page.locator('.creative-card').count()===3,'three separately grouped creative links');
 check(await page.locator('#machines .creative-card').count()===0,'creative cards are outside curriculum groups');
 check(await page.locator('.hero a[href="patterns/"]').count()===1,'original Pattern Studio link retained');
 check(await page.locator('#heroAllen svg').count()>0,'Allen identity retained');
 for(const [i,route] of expected.entries()){
   const card=page.locator('.creative-card').nth(i);
   check(await card.getAttribute('href')==='/instruments/'+route+'/',route+' exact route');
   await card.scrollIntoViewIfNeeded();await card.locator('img').evaluate(e=>e.decode());
   check(await card.locator('img').evaluate(e=>e.naturalWidth>0),route+' captured thumbnail decodes');
   await card.focus();await page.keyboard.press('Enter');await page.waitForURL('**/instruments/'+route+'/');
   await page.waitForFunction(()=>document.body.dataset.ready==='true');
   check(await page.locator('#canvas').isVisible(),route+' keyboard link reaches loaded canvas');
   await page.goBack();await page.locator('.creative-card').first().waitFor();
   check(await page.locator('#machines .app').count()===35,route+' Back restores catalogue');
 }
 await page.locator('.creative-instruments').screenshot({path:'output/playwright/study-creative-desktop.png'});
 await page.emulateMedia({reducedMotion:'reduce'});
 check(await page.locator('.creative-card').first().evaluate(e=>getComputedStyle(e).transitionDuration)==='0s','creative cards respect reduced motion');
 for(const width of [375,320]){
   await page.setViewportSize({width,height:844});
   await page.locator('.creative-instruments').scrollIntoViewIfNeeded();
   check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),width+'px has no page overflow');
   check(await page.locator('.creative-grid').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length===1),width+'px cards stack');
   await page.locator('.creative-instruments').screenshot({path:'output/playwright/study-creative-mobile-'+width+'.png'});
 }
 return checks;
}
