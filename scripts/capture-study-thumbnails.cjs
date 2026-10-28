// Pass this function to playwright-cli run-code. Captures the actual local experiences.
async (page) => {
  await page.setViewportSize({width:1200,height:900});
  await page.goto('http://127.0.0.1:8341/study/');
  const machines=await page.evaluate(()=>Object.entries(window.STUDY.machines).map(([id,m])=>({id,href:m.href})));
  const results=[];
  for(const m of machines){
    try{
      await page.goto('http://127.0.0.1:8341/study/'+m.href);
      await page.waitForTimeout(1800);
      await page.addStyleTag({content:'.s3-ov,.s3-hint,.ar-btn{visibility:hidden!important}'});
      let target=page.locator('.playmain > .canvas').first();
      if(!await target.count()) target=page.locator('.canvas, .bench, main, #app').first();
      if(!await target.count()) target=page.locator('body');
      await target.scrollIntoViewIfNeeded();
      await page.waitForTimeout(250);
      const three=await target.locator('.s3-host canvas').count()>0;
      await target.screenshot({path:'study/thumbnails/'+m.id+'.png'});
      results.push({id:m.id,three,source:m.href});
      console.log('Captured '+m.id+' '+(three?'3D':'interactive'));
    }catch(e){results.push({id:m.id,error:String(e)})}
  }
  return results;
}
