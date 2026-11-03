async (page) => {
 // The Lab home story (index.html, built by scripts/build-lab-home.cjs). Same harness as the other checks:
 // a page function run against the repo served at http://127.0.0.1:8341/.
 const checks=[];const check=(ok,label)=>{if(!ok)throw new Error(label);checks.push(label)};
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:1440,height:900});await page.goto('http://127.0.0.1:8341/');
 const worlds=await page.evaluate(async()=>{const r=await fetch('/lab/catalogue.js');const w={};new Function('window',await r.text())(w);return w.LAB_WORLDS.map(x=>({id:x.id,href:x.href||'/'+x.id+'/'}))});
 const tiles=await page.locator('.tw-step .go, .row, .mc a, .ix, .go-world').evaluateAll(as=>as.map(a=>a.getAttribute('href')));
 for(const w of worlds)check(tiles.filter(h=>h===w.href).length===1,`${w.id} shown exactly once (${w.href})`);
 check(new Set(tiles).size===tiles.length,`no world or instrument tile repeats (${tiles.length} tiles)`);
 for(const r of ['reality-remix','soft-matter','impossible-objects','squishy-lab','time-sculpture','sonic-loom','liquid-playground'])check(tiles.includes('/instruments/'+r+'/'),r+' kept in the playground');
 check(await page.getByText(/Experiment \d/i).count()===0,'no "Experiment NN" numbering');
 check(await page.locator('[data-save], .save-button').count()===0,'no Save pills');
 check(await page.locator('h1').count()===1,'one h1');
 for(const id of ['twins','study','playground','about','explore'])check(await page.locator('#'+id).count()===1,'#'+id+' route lands on the story');
 check(await page.locator('.tw-step .truth[data-k="sim"]').count()===await page.locator('.tw-step').count(),'every twin says Simulated');
 const imgs=await page.locator('main img').evaluateAll(xs=>xs.map(x=>x.getAttribute('src')));
 check(imgs.every(s=>!/instrument-previews|soft-matter|squishy/.test(s)),'no cartoon-face previews on the page');
 // sticky stage follows the reading position
 await page.locator('#twin-dairy').scrollIntoViewIfNeeded();await page.evaluate(()=>{const e=document.getElementById('twin-dairy');scrollTo(0,e.offsetTop+e.offsetHeight/2-innerHeight/2+document.querySelector('.tw').offsetTop)});await page.waitForTimeout(700);
 check(await page.locator('.tw-step[data-on]').getAttribute('id')==='twin-dairy','stage tracks the twin in view');
 check(await page.locator('.tw-frame[data-on]').count()===1,'one render on the stage at a time');
 // keyboard: skip link first, focus visible
 await page.evaluate(()=>scrollTo(0,0));await page.keyboard.press('Tab');
 check(await page.evaluate(()=>document.activeElement.className)==='skip','skip link is the first tab stop');
 await page.keyboard.press('Tab');const ring=await page.evaluate(()=>getComputedStyle(document.activeElement).outlineStyle);
 check(ring!=='none','focus ring visible');
 for(const w of [320,375,390]){await page.setViewportSize({width:w,height:800});await page.waitForTimeout(150);check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`no horizontal scroll at ${w}px`)}
 // the old Learn & create page keeps its address and lands in the story
 await page.goto('http://127.0.0.1:8341/discover/#learn');await page.waitForURL(/\/#study$/);
 check(page.url().endsWith('/#study'),'/discover/#learn lands on the study machines');
 check(errors.length===0,'no page errors: '+errors.join(' | '));
 return checks;
}
