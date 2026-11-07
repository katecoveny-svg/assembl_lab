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
 // the twins are a grid of cards: every twin shows its render, and no sticky stage is left behind
 check(await page.locator('.tw-stage, .tw-frame').count()===0,'no sticky twin stage');
 check(await page.locator('.tw-step .tw-pic img').count()===await page.locator('.tw-step').count(),'every twin card shows its render');
 // the newest study machines are on the home (the wind tunnel's race car leads), and the Next Lab has gone
 for(const m of ['windtunnel','earthspace','house','world','socials'])check(tiles.includes('/study/m/'+m+'.html'),m+' machine on the home');
 check(tiles.every(h=>!/^\/next\//.test(h||'')),'no Next Lab links');
 // keyboard: skip link first, focus visible
 await page.evaluate(()=>scrollTo(0,0));await page.keyboard.press('Tab');
 check(await page.evaluate(()=>document.activeElement.className)==='skip','skip link is the first tab stop');
 await page.keyboard.press('Tab');const ring=await page.evaluate(()=>getComputedStyle(document.activeElement).outlineStyle);
 check(ring!=='none','focus ring visible');
 for(const w of [320,375,390]){await page.setViewportSize({width:w,height:800});await page.waitForTimeout(150);check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`no horizontal scroll at ${w}px`)}
 // site-v2 (8 Nov 2026): the hero holds the flat mark A assembling from its parts (the logo), decorative, never on the words or
 // buttons; no DO orb, no pastel cubes, no violet or lavender anywhere on the home or its stylesheets
 check(await page.locator('.hero .v2-mark-assemble').count()===1,'one flat mark A in the hero');
 check(await page.locator('#mark-a').getAttribute('aria-hidden')==='true','the flat mark is decorative (aria-hidden)');
 check(await page.locator('img[src*="glass-a"], link[href*="glass-a"]').count()===0,'no glass "a" image or icon left on the home');
 check(await page.locator('.orb-still, #orb').count()===0,'no DO orb left on the home');
 check(await page.evaluate(()=>[...document.images].every(i=>!/assembl-assembled|logo-tile/.test(i.src))),'no logo with a tile behind it');
 check(await page.evaluate(()=>!/#F2DC7C|cubes\.js|class="still"/i.test(document.documentElement.outerHTML)),'no pastel cube stack and no yellow on the home');
 const css=await page.evaluate(async()=>(await Promise.all(['/lab/story.css','/site-v2/lab.css','/site-v2/site-v2.css'].map(u=>fetch(u).then(r=>r.text())))).join('\n')+document.documentElement.outerHTML);
 check(!/#(8b5cf6|a78bfa|c4b5fd|7c3aed|ddd6fe|c7b4f0|d7b3f0|6a50be|c99bda)\b|violet-|purple-/i.test(css.replace(/\/\*[\s\S]*?\*\//g,'')),'no violet or lavender colours');
 check(await page.evaluate(()=>!/\bAssembl\b|\bAssemble\b|\bASSEMBL\b/.test(document.body.innerText.replace(/assembly/gi,''))),'brand word is lowercase assembl in the copy');
 for(const w of [1440,1024,768,390,320]){await page.setViewportSize({width:w,height:900});await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(150);
  const hit=await page.evaluate(()=>{const a=document.querySelector('.hero .v2-mark-assemble').getBoundingClientRect();const pad=8;
   return [...document.querySelectorAll('.hero h1, .hero .lede, .hero .actions .v2-btn, .hero .truth-note, .v2-nav')].filter(e=>{const b=e.getBoundingClientRect();return !(b.right<a.left+pad||b.left>a.right-pad||b.bottom<a.top+pad||b.top>a.bottom-pad)}).map(e=>e.className||e.tagName)});
  check(hit.length===0,`the mark clear of the headline, buttons and labels at ${w}px${hit.length?' (touches '+hit.join(', ')+')':''}`)}
 // the old Learn & create page keeps its address and lands in the story
 await page.goto('http://127.0.0.1:8341/discover/#learn');await page.waitForURL(/\/#study$/);
 check(page.url().endsWith('/#study'),'/discover/#learn lands on the study machines');
 check(errors.length===0,'no page errors: '+errors.join(' | '));
 return checks;
}
