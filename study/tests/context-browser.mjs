async originalPage=>{
 const page=await originalPage.context().newPage();
 const requests=[],errors=[];page.on('request',r=>{if(/weather\.googleapis|places\.googleapis|maps\.googleapis|\/api\/context\/weather/.test(r.url()))requests.push(r.url())});page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.gpsCalls=0;Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition(){window.gpsCalls++},watchPosition(){window.gpsCalls++}}})});
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:8882/study/m/energy.html#flask');
 const panel=page.locator('.study-context'),output=panel.locator('[data-output]');await panel.waitFor();
 if(!await panel.locator('[data-live]').isDisabled())throw Error('Live enabled');
 const before=await page.evaluate(()=>JSON.stringify(StudyKit.current.api.state));
 await panel.getByText('Use a synthetic example',{exact:true}).click();await panel.locator('[data-example]').click();
 if(!(await output.innerText()).includes('SYNTHETIC EXAMPLE — not live'))throw Error('Fixture label');
 await panel.locator('[data-scenario]').selectOption('forecast');await panel.locator('[data-example]').click();if(!(await output.innerText()).includes('Forecast — not an observation'))throw Error('Forecast');
 await panel.locator('[data-scenario]').selectOption('stale');await panel.locator('[data-example]').click();if(!(await output.innerText()).includes('Stale'))throw Error('Stale');
 await panel.locator('[data-scenario]').selectOption('unavailable');await panel.locator('[data-example]').click();if((await output.innerText()).includes('°C'))throw Error('Stale value survived failure');
 await panel.locator('[data-city]').selectOption('dunedin');if(!(await output.innerText()).includes('City changed'))throw Error('City');
 await panel.getByText('Enter a value manually',{exact:true}).click();await panel.locator('[name=temperature]').fill('8.5');
 const date=await page.evaluate(()=>{const d=new Date(Date.now()-600000);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,16)});await panel.locator('[name=time]').fill(date);await panel.getByRole('button',{name:'Use manual value'}).click();
 const text=await output.innerText();if(!text.includes('MANUAL ENTRY — unverified')||!text.includes('Dunedin · 8.5°C')||!text.includes('Pacific/Auckland'))throw Error('Manual metadata');
 await panel.getByText('Try a cooling comparison',{exact:true}).click();await panel.locator('input[type=radio][value=gap]').focus();await page.keyboard.press('Space');await panel.locator('[data-check]').focus();await page.keyboard.press('Enter');if(!(await panel.locator('[data-feedback]').innerText()).startsWith('Yes,'))throw Error('Keyboard explanation');
 await panel.getByText('Use a synthetic example',{exact:true}).click();await panel.getByText('Enter a value manually',{exact:true}).click();
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('Phone overflow');
 await panel.screenshot({path:'output/playwright/context/phone-manual.png'});
 const after=await page.evaluate(()=>JSON.stringify(StudyKit.current.api.state));if(before!==after)throw Error('Panel mutated lesson model '+before+' → '+after);
 await page.getByRole('button',{name:/Heat it/}).click();if(await panel.isVisible())throw Error('Visible outside cooling');await page.getByRole('button',{name:/Keep it warm/}).click();if(!await panel.isVisible())throw Error('Missing on topic return');
 await page.setViewportSize({width:1280,height:900});await panel.screenshot({path:'output/playwright/context/desktop.png'});
 await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));if(!(await output.innerText()).includes('Context cleared'))throw Error('Pagehide retention');
 if(requests.length||await page.evaluate(()=>window.gpsCalls)||errors.length)throw Error(JSON.stringify({requests,errors}));
 return {manualAndFixtures:true,currentForecastStaleUnavailable:true,keyboard:true,reducedMotion:true,noOverflow:true,modelUnchanged:true,topicVisibility:true,noWeatherRequests:true,noGPS:true,pagehideCleared:true,errors};
}
