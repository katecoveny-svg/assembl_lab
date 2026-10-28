async (page) => {
 const captures=[];
 await page.setViewportSize({width:1280,height:960});
 for(const route of ['reality-remix','soft-matter','impossible-objects']){
   await page.goto('http://127.0.0.1:8341/instruments/'+route+'/');
   await page.waitForFunction(()=>document.body.dataset.ready==='true');
   await page.locator('#canvas').scrollIntoViewIfNeeded();
   await page.waitForTimeout(600);
   const medium=await page.locator('#medium').textContent();
   if(medium.toLowerCase().includes('2d'))throw Error('Unexpected fallback: '+route);
   await page.locator('#canvas').screenshot({path:'study/instrument-previews/'+route+'.png',style:'.stage-label,.stage-bottom{visibility:hidden!important}'});
   captures.push({route:'/instruments/'+route+'/',medium,state:'Initial loaded composition; no scene changes',capture:'Visible canvas crop; overlay labels hidden only'});
 }
 return captures;
}
