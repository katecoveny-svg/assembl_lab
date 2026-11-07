async (page) => {
 // The Matariki sky explorer (/matariki-sky/). Same harness as the other checks: a page function run against the
 // repo served at http://127.0.0.1:8341/ (override with globalThis.LAB_BASE). Needs WebGL (SwiftShader is fine).
 const base=globalThis.LAB_BASE||'http://127.0.0.1:8341';
 const checks=[];const check=(ok,label)=>{if(!ok)throw new Error(label);checks.push(label)};
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const open=async q=>{await page.goto(base+'/matariki-sky/'+(q||''));await page.waitForFunction(()=>window.__sky&&window.__sky.ready,null,{timeout:30000})};
 await page.setViewportSize({width:1440,height:900});await open();
 // labels and the cultural boundary
 check(await page.locator('h1').count()===1,'one h1');
 check(await page.getByText('Lab experiment, educational, not production').count()>=1,'labelled Lab experiment, educational, not production');
 check(await page.getByText('Kōrero to be provided by cultural advisers.').count()>=1,'kōrero slot is marked');
 check(await page.getByText(/draft, pending cultural review/i).count()>=2,'cultural layer marked draft, pending cultural review');
 const lede=await page.locator('.lede').innerText();check(lede.indexOf('Matariki')<lede.indexOf('Pleiades'),'Matariki named before the Pleiades');
 const names=await page.locator('.names li').allInnerTexts();
 const tepapa=['Matariki','Pōhutukawa','Tupuānuku','Tupuārangi','Waitī','Waitā','Ururangi','Waipunarangi','Hiwa-i-te-Rangi'];
 check(JSON.stringify(names.map(n=>n.normalize('NFC')))===JSON.stringify(tepapa.map(n=>n.normalize('NFC'))),'the nine names are exactly Te Papa’s spellings');
 check(await page.evaluate(()=>!/represents|is connected with|is associated with|signifies/i.test(document.body.innerText.replace('Nothing here describes what each star represents',''))),'no star meanings written');
 // sky from here: Auckland, 27 June 2027, pre-dawn
 const r=await page.locator('#readout').innerText();
 check(/rises at 05:0\d/.test(r)&&/towards the east-north-east/.test(r),'Matariki rises about 05:0x in the east-north-east from Auckland (27 June 2027)');
 check(/Dawn twilight begins 06:0\d/.test(r),'astronomical dawn about 06:0x');
 check(await page.locator('.quick button[data-date="2027-06-25"]').count()===1,'the 2027 public holiday is one tap away');
 // a star's details
 await page.evaluate(()=>window.__sky.select(0));
 const info=await page.locator('#info').innerText();
 check(/Gaia DR3/.test(info)&&/HIP 17702/.test(info)&&/B7III/.test(info)&&/light-years/.test(info),'Alcyone shows catalogue ids, spectral type and distance');
 check(/Pending cultural review/.test(info),'no Māori name assigned to a star in this draft');
 // keyboard
 await page.evaluate(()=>{window.__sky.select(null);scrollTo(0,0)});await page.keyboard.press('Tab');
 check(await page.evaluate(()=>document.activeElement.className)==='skip','skip link is the first tab stop');
 await page.focus('#view');await page.keyboard.press(']');
 check(await page.locator('#info').isVisible(),'] selects a bright star from the keyboard');
 await page.keyboard.press('Escape');check(!(await page.locator('#info').isVisible()),'Escape closes the star details');
 // the full flight out (with the turn that shows depth) and back, with no errors
 await page.click('#fly');await page.waitForFunction(()=>window.__sky.S.mode==='space',null,{timeout:40000});
 check(errors.length===0,'flies out to the cluster and turns it without errors');
 check(await page.evaluate(()=>window.__sky.S.th)>1,'the arrival turns the cluster side-on');
 await page.click('#fly');await page.waitForFunction(()=>window.__sky.S.mode==='sky',null,{timeout:40000});
 check(errors.length===0,'flies back to Aotearoa without errors');
 // reduced motion: the fly-to arrives at once
 await page.emulateMedia({reducedMotion:'reduce'});await open();
 await page.focus('#view');await page.keyboard.press('f');await page.waitForTimeout(200);
 check(await page.evaluate(()=>window.__sky.S.mode)==='space','reduced motion: F arrives at the cluster without the flight');
 check(/light-years from the Sun/.test(await page.locator('#hud').innerText()),'the view says how far from the Sun you are');
 await page.emulateMedia({reducedMotion:'no-preference'});
 // widths
 for(const w of [320,375,390]){await page.setViewportSize({width:w,height:800});await open();check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`no horizontal scroll at ${w}px`)}
 check(errors.length===0,'no page errors: '+errors.join(' | '));
 return checks;
}
