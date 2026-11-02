async (page) => {
 const checks=[];const check=(ok,label)=>{if(!ok)throw new Error(label);checks.push(label)};
 await page.setViewportSize({width:1440,height:1000});await page.goto('http://127.0.0.1:8341/study/');
 await page.locator('#showAll').click();
 const want=await page.evaluate(()=>Object.keys(window.STUDY.machines).length);
 check(await page.locator('.app-art img').count()===want,`${want} machine captures replace icons (one per machine in data.js)`);
 for(const img of await page.locator('.app-art img').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(e=>e.decode())}
 check(await page.locator('.app-art img').evaluateAll(xs=>xs.every(x=>x.naturalWidth>0)),'all machine JPEGs decode');
 check(await page.locator('#years [data-year]').count()===5,'five year chips lead the page');
 await page.locator('#tab-l2').click();check(await page.locator('.exr .mch').count()>0,'Year 12 exam rows link to machines');
 check(await page.locator('.app .pc.yr').count()>0&&await page.locator('.app .pc.std').count()>0,'machine cards carry year and standard chips');
 check(await page.locator('#heroAllen svg').count()>0,'Allen identity retained');
 await page.locator('#h-mach').scrollIntoViewIfNeeded();await page.screenshot({path:'output/playwright/study-desktop.png'});
 await page.locator('.study-discover').scrollIntoViewIfNeeded();await page.screenshot({path:'output/playwright/study-habitat-entry.png'});
 await page.setViewportSize({width:390,height:844});await page.locator('#h-mach').scrollIntoViewIfNeeded();
 check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Study cards fit 390px viewport');
 await page.screenshot({path:'output/playwright/study-mobile.png'});
 const first=page.locator('.app').first();const href=await first.getAttribute('href');await first.focus();await page.keyboard.press('Enter');await page.waitForURL('**/'+href+'**');
 check(page.url().includes(href),'keyboard Enter opens linked machine');
 await page.goto('https://assembl-lab.vercel.app/study/year9/');
 check(await page.getByRole('tab').count()===4,'live Year 9 contains four tools');
 check(await page.getByRole('tab',{name:/Habitat/}).count()===0,'Habitat is not a Year 9 tab');
 await page.screenshot({path:'output/playwright/live-year9.png'});
 return checks;
}
