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
 // point cloud (Nov 2026): the hero holds the twins as one small world (a point-cloud diorama, with a still for no WebGL), decorative,
 // never on the words or buttons; its labels are real links to the twin cards; no DO orb, no pastel cubes, no violet or lavender
 // the hero (Nov 2026): Tāmaki Makaurau Auckland from open map data (a still without WebGL), big, decorative, never on the words.
 // Landmark callouts are real DOM text; twins are pinned on real sites of their kind as examples, never named, each saying so.
 check(await page.locator('.hero #hero-world img').count()===1,'the hero shows Auckland (a still without WebGL)');
 check(await page.locator('#hero-world').getAttribute('aria-hidden')==='true','the hero picture is decorative (aria-hidden)');
 check(await page.locator('.hero-tags a[href^="#twin-"]').count()===6,'the hero names its six twins, each linked to its card');
 for(const a of ['rangitoto','waitemata','bridge','skytower','maungawhau'])check(await page.locator(`.hero-callout[data-anchor="${a}"] strong`).count()===1,`landmark callout: ${a}`);
 const pins=await page.locator('.hero-pin').evaluateAll(xs=>xs.map(x=>({site:x.dataset.site,text:x.textContent})));
 check(pins.length>=4&&pins.every(p=>/twin/.test(p.text)&&/Example, not a model of this/.test(p.text)),`every twin pin is a twin plus its truth line (${pins.length} pins)`);
 const akl=await page.evaluate(async()=>(await fetch('/assets/models/auckland/auckland-points.json')).json());
 check(pins.every(p=>akl.sites[p.site])&&!/"names?"\s*:/.test(JSON.stringify(akl.sites)),'pins sit on baked sites, and the sites carry coordinates only (no names)');
 check(await page.locator('#about').getByText('none models the business or institution there').count()===1,'the labels say the twin sites are examples');
 check(await page.getByText(/LINZ \(CC BY 4\.0\)/).count()>=1&&await page.getByText(/OpenStreetMap contributors/).count()>=1,'open data is credited');
 check(await page.locator('img[src*="glass-a"], link[href*="glass-a"]').count()===0,'no glass "a" image or icon left on the home');
 check(await page.locator('.orb-still, #orb').count()===0,'no DO orb left on the home');
 check(await page.evaluate(()=>[...document.images].every(i=>!/assembl-assembled|logo-tile/.test(i.src))),'no logo with a tile behind it');
 check(await page.evaluate(()=>!/#F2DC7C|cubes\.js|class="still"/i.test(document.documentElement.outerHTML)),'no pastel cube stack and no yellow on the home');
 const css=await page.evaluate(async()=>(await Promise.all(['/lab/story.css','/site-v2/lab.css','/site-v2/site-v2.css'].map(u=>fetch(u).then(r=>r.text())))).join('\n')+document.documentElement.outerHTML);
 check(!/#(8b5cf6|a78bfa|c4b5fd|7c3aed|ddd6fe|c7b4f0|d7b3f0|6a50be|c99bda)\b|violet-|purple-/i.test(css.replace(/\/\*[\s\S]*?\*\//g,'')),'no violet or lavender colours');
 check(await page.evaluate(()=>!/\bAssembl\b|\bAssemble\b|\bASSEMBL\b/.test(document.body.innerText.replace(/assembly/gi,''))),'brand word is lowercase assembl in the copy');
 for(const w of [1440,1024,768,390,320]){await page.setViewportSize({width:w,height:900});await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(150);
  const hit=await page.evaluate(()=>{const a=document.querySelector('#hero-world').getBoundingClientRect();const pad=8;
   return [...document.querySelectorAll('.hero h1, .hero .lede, .hero .actions .v2-btn, .hero .truth-note, .v2-nav')].filter(e=>{const b=e.getBoundingClientRect();return !(b.right<a.left+pad||b.left>a.right-pad||b.bottom<a.top+pad||b.top>a.bottom-pad)}).map(e=>e.className||e.tagName)});
  check(hit.length===0,`the map clear of the headline, buttons and labels at ${w}px${hit.length?' (touches '+hit.join(', ')+')':''}`);
  // big, and asymmetric: beside the words on a wide screen (most of the hero), above them on a narrow one
  const box=await page.evaluate(()=>{const a=document.querySelector('#hero-world').getBoundingClientRect(),h=document.querySelector('.hero h1').getBoundingClientRect();return {l:a.left,w:a.width,h:a.height,t:a.top,cx:a.left+a.width/2,h1:h.top}});
  check(w>=960?box.cx>w*0.6&&box.w>=w*0.55&&box.h>=900*0.7:box.t<box.h1&&box.w>=w*0.9,`the map is big at ${w}px (${Math.round(box.w)}×${Math.round(box.h)})`)}
 // with WebGL: the landmark callouts appear, each tied to an anchor on screen, none over the words or the buttons
 await page.setViewportSize({width:1440,height:900});await page.evaluate(()=>scrollTo(0,0));
 if(await page.evaluate(()=>document.documentElement.classList.contains('pc-on'))){
  await page.waitForFunction(()=>document.querySelectorAll('.hero-callout.on').length>=3,null,{timeout:30000});
  const over=await page.evaluate(()=>{const words=[...document.querySelectorAll('.hero h1, .hero .lede, .hero .actions .v2-btn, .hero .truth-note, .hero-tags, .v2-nav')].map(e=>e.getBoundingClientRect());
   return [...document.querySelectorAll('.hero-callout.on, .hero-pin.on')].filter(e=>{const b=e.getBoundingClientRect();return words.some(a=>!(b.right<a.left||b.left>a.right||b.bottom<a.top||b.top>a.bottom))}).map(e=>e.dataset.anchor||e.dataset.site)});
  check(over.length===0,'no callout covers the words or buttons'+(over.length?' ('+over.join(', ')+')':''));
  const dots=await page.evaluate(()=>[...document.querySelectorAll('.pc-leaders circle.ring')].every(c=>{const x=+c.getAttribute('cx'),y=+c.getAttribute('cy');return x>0&&y>0&&x<innerWidth&&y<innerHeight}));
  check(dots&&await page.locator('.pc-leaders path').count()>=await page.locator('.hero-callout.on, .hero-pin.on').count(),'every leader line reaches an anchor on screen');
  // every twin pin shows at 1440×900, on screen, clear of the words and of each other, with the key and its truth line beside the map
  const nPins=await page.locator('.hero-pin').count();
  await page.waitForFunction(n=>document.querySelectorAll('.hero-pin.on').length===n,nPins,{timeout:20000}).catch(()=>{});
  const pinBoxes=await page.evaluate(()=>[...document.querySelectorAll('.hero-pin')].map(e=>{const b=e.querySelector('a').getBoundingClientRect();return {site:e.dataset.site,on:e.classList.contains('on'),l:b.left,t:b.top,r:b.right,b:b.bottom}}));
  const offscreen=pinBoxes.filter(p=>!p.on||p.l<0||p.t<0||p.r>1440||p.b>900).map(p=>p.site);
  check(offscreen.length===0,`all ${nPins} twin pins visible on screen at 1440×900`+(offscreen.length?' (missing '+offscreen.join(', ')+')':''));
  const clash=pinBoxes.some((a,i)=>pinBoxes.some((b,j)=>j>i&&!(a.r<=b.l||a.l>=b.r||a.b<=b.t||a.t>=b.b)));
  check(!clash,'no two twin pins overlap');
  check(await page.locator('.hero-key li[data-site]').count()===nPins&&await page.locator('.hero-key').isVisible()&&/not a model of the business or institution there/.test(await page.locator('.hero-key').innerText()),'the key lists every twin with its truth line');
  check(await page.locator('.hero-pin .pin-truth').evaluateAll(xs=>xs.every(x=>/^Example, not a model of this /.test(x.textContent))),'every pin keeps its own truth line in the page');
  check(await page.locator('.hero-callout.on').count()>=4,'the landmarks stay on the map with the twins');
 }
 // the old Learn & create page keeps its address and lands in the story
 await page.goto('http://127.0.0.1:8341/discover/#learn');await page.waitForURL(/\/#study$/);
 check(page.url().endsWith('/#study'),'/discover/#learn lands on the study machines');
 check(errors.length===0,'no page errors: '+errors.join(' | '));
 return checks;
}
