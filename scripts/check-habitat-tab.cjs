async (page) => {
 const results=[];
 for(const lite of [false,true])for(const width of [375,320]){
   const probe=await page.context().newPage();
   await probe.setViewportSize({width,height:844});
   await probe.goto('http://127.0.0.1:8341/next/'+(lite?'?lite':'')+'#zoo');
   await probe.evaluate(()=>document.fonts.ready);await probe.waitForTimeout(150);
   const state=await probe.evaluate(()=>{const tab=document.getElementById('tab-zoo'),strip=tab.parentElement,t=tab.getBoundingClientRect(),s=strip.getBoundingClientRect();return{visible:t.left>=s.left&&t.right<=s.right,scrollY:window.scrollY,overflow:document.documentElement.scrollWidth>innerWidth,selected:tab.getAttribute('aria-selected')}});
   if(!state.visible||state.scrollY!==0||state.overflow||state.selected!=='true')throw new Error(JSON.stringify({width,lite,state}));
   results.push({width,lite,...state});
   if(width===375&&!lite){await probe.locator('.studio-nav').screenshot({path:'output/playwright/habitat-mobile-selected-tab.png'})}
   await probe.close();
 }
 return results;
}
