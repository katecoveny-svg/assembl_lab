async (page) => {
 // The Lab home story (index.html, built by scripts/build-lab-home.cjs). Same harness as the other checks:
 // (13 Nov 2026: the hero checks follow the Auckland 3D city hero and the standard of assembl.co.nz's new home page.)
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
 // the hero (9 Nov 2026, restyled 13 Nov): the Auckland city centre as a sourced 3D model. Its finished still shows first and
 // the live city loads over it (a still without WebGL). The first screen says what the lab is and offers three doors.
 check(await page.locator('.hero #hero-world img').count()===1,'the hero shows Auckland (a still without WebGL)');
 check((await page.locator('#hero-world img').getAttribute('alt')||'').length>40&&!!(await page.locator('#city-hero').getAttribute('aria-label')),'the city still has alt text and the live city has a label');
 const doors=await page.locator('.hero .outcomes a').evaluateAll(as=>as.map(a=>a.getAttribute('href')));
 check(doors.length===3&&doors.every(h=>h.startsWith('#'))&&(await Promise.all(doors.map(h=>page.locator(h).count()))).every(n=>n===1),'the hero offers three doors, each landing on a chapter of this page');
 check(await page.locator('.hero .truth-note .truth').count()===3,'the hero shows the three truth labels');
 const views=await page.locator('[data-cloud-view]').evaluateAll(bs=>bs.map(b=>b.getAttribute('aria-pressed')));
 check(views.length===3&&views.filter(v=>v==='true').length===1,'three city views, one pressed');
 check(await page.locator('.city-status').count()===1&&/still|live 3d/i.test(await page.locator(".city-status").innerText()),'the city says whether it is a still or live 3D');
 check(/Height tags are not independently verified/.test(await page.locator('#about').innerText())&&/None of these views predicts hazards/.test(await page.locator('#about').innerText()),'the labels chapter states the limits of the city model');
 check(await page.getByText(/Land Information New Zealand \(CC BY 4\.0\)/).count()>=1&&await page.getByText(/OpenStreetMap contributors/).count()>=1,'open data is credited');
 check(await page.locator('img[src*="glass-a"], link[href*="glass-a"]').count()===0,'no glass "a" image or icon left on the home');
 check(await page.locator('.orb-still, #orb').count()===0,'no DO orb left on the home');
 check(await page.evaluate(()=>[...document.images].every(i=>!/assembl-assembled|logo-tile/.test(i.src))),'no logo with a tile behind it');
 check(await page.evaluate(()=>!/#F2DC7C|cubes\.js|class="still"/i.test(document.documentElement.outerHTML)),'no pastel cube stack and no yellow on the home');
 const css=await page.evaluate(async()=>(await Promise.all(['/lab/story.css','/lab/pc/pc.css','/lab/home.css','/site-v2/lab.css','/site-v2/site-v2.css','/site-v2/standard.css'].map(u=>fetch(u).then(r=>r.text())))).join('\n')+document.documentElement.outerHTML);
 check(!/#(8b5cf6|a78bfa|c4b5fd|7c3aed|ddd6fe|c7b4f0|d7b3f0|6a50be|c99bda)\b|violet-|purple-/i.test(css.replace(/\/\*[\s\S]*?\*\//g,'')),'no violet or lavender colours');
 check(await page.evaluate(()=>!/\bAssembl\b|\bAssemble\b|\bASSEMBL\b/.test(document.body.innerText.replace(/assembly/gi,''))),'brand word is lowercase assembl in the copy');
 // the 13 Nov 2026 standard: inky plum ground, two families only, a footer with depth, a way back to assembl.co.nz, plain words
 check(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor)==='rgb(24, 11, 24)','the ground is inky plum #180B18');
 const fams=await page.evaluate(()=>[...new Set([...document.querySelectorAll('main *, .v2-nav *, .lab-foot *')].filter(e=>e.childNodes.length&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())).map(e=>getComputedStyle(e).fontFamily.split(',')[0].replace(/["']/g,'').trim()))]);
 check(fams.every(f=>f==='Instrument Sans'||f==='IBM Plex Mono'),'only Instrument Sans and IBM Plex Mono are used ('+fams.join(', ')+')');
 check(await page.locator('.lab-foot .lab-foot-mark').count()===1&&/^assembl\.lab$/.test((await page.locator('.lab-foot-mark').innerText()).trim()),'the footer carries the lowercase wordmark');
 check(await page.locator('.v2-nav-actions a[href^="https://assembl.co.nz"]').count()===1&&await page.locator('.lab-foot a[href^="https://assembl.co.nz"]').count()>=4,'the nav and the footer lead back to assembl.co.nz');
 check(/Independent assembl concepts\. Simulated data unless marked live/.test(await page.locator('.lab-foot').innerText()),'the footer keeps the independent-concept note');
 check(await page.evaluate(()=>!/seamless|leverage|supercharge/i.test(document.body.innerText)),'no "seamless", "leverage" or "supercharge"');
 for(const w of [1440,1024,768,390,375,320]){await page.setViewportSize({width:w,height:w<600?812:900});await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(150);
  const hit=await page.evaluate(()=>{const a=document.querySelector('#hero-world').getBoundingClientRect();const pad=4;
   return [...document.querySelectorAll('.hero h1, .hero .lede, .hero .outcomes, .hero .truth-note, .v2-nav')].filter(e=>{const b=e.getBoundingClientRect();return !(b.right<a.left+pad||b.left>a.right-pad||b.bottom<a.top+pad||b.top>a.bottom-pad)}).map(e=>e.className||e.tagName)});
  check(hit.length===0,`the city clear of the headline, the doors and the labels at ${w}px${hit.length?' (touches '+hit.join(', ')+')':''}`);
  // ten seconds: the headline, what the lab is and the three doors are all in the first screen, on a phone as on a desk
  const first=await page.evaluate(()=>({h1:document.querySelector('.hero h1').getBoundingClientRect().bottom,lede:document.querySelector('.hero .lede').getBoundingClientRect().bottom,doors:document.querySelector('.hero .outcomes').getBoundingClientRect().bottom,vh:innerHeight}));
  check(first.h1<first.vh&&first.lede<first.vh&&first.doors<=first.vh,`the headline, the lede and the doors are in the first screen at ${w}px`);
  const box=await page.evaluate(()=>{const a=document.querySelector('#hero-world').getBoundingClientRect();return {w:a.width,cx:a.left+a.width/2}});
  check(w>=960?box.cx>w*0.6&&box.w>=w*0.4:box.w>=w*0.85,`the city is big at ${w}px (${Math.round(box.w)} wide)`)}
 // reduced motion rests on the finished frame: nothing armed, nothing mid-animation, everything visible
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1440,height:900});await page.reload();await page.waitForTimeout(400);
 const rest=await page.evaluate(()=>({armed:document.querySelectorAll('[data-armed]').length,hidden:[...document.querySelectorAll('.lab-stage > *, .v2-wi, .v2-reveal > *')].filter(e=>{const c=getComputedStyle(e);return e.offsetParent!==null&&(+c.opacity<1||c.animationName!=='none')}).length}));
 check(rest.armed===0&&rest.hidden===0,`reduced motion: the page rests on its finished frame (${rest.armed} armed, ${rest.hidden} not at rest)`);
 await page.emulateMedia({reducedMotion:'no-preference'});
 // the old Learn & create page keeps its address and lands in the story
 await page.goto('http://127.0.0.1:8341/discover/#learn');await page.waitForURL(/\/#study$/);
 check(page.url().endsWith('/#study'),'/discover/#learn lands on the study machines');
 check(errors.length===0,'no page errors: '+errors.join(' | '));
 return checks;
}
