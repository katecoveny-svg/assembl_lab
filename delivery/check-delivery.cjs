async (page) => {
 // Supermarket order to doorstep (/delivery/). Same harness as scripts/check-lab-home.cjs: a page function run against the repo
 // served at http://127.0.0.1:8341/. Checks the stages advance, every message is a draft, the truth line and the credits are
 // there, no business is named anywhere (the page or the baked map data), and nothing throws.
 const checks=[];const check=(ok,label)=>{if(!ok)throw new Error(label);checks.push(label)};
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:1440,height:900});await page.goto('http://127.0.0.1:8341/delivery/');
 await page.waitForFunction(()=>window.__delivery&&window.__delivery.stage>=0,null,{timeout:30000});
 check(await page.locator('h1').count()===1,'one h1');
 check(await page.locator('#al-nav .v2-wordmark').count()===1&&await page.locator('#al-nav img, #al-nav svg.v2-mark').count()===0,'the shared experiment nav, wordmark text only');
 // the truth line and the data credits
 check(await page.locator('.co[data-anchor="store"]').filter({hasText:'Supermarket twin'}).filter({hasText:'Example, not a model of this site'}).count()===1,'the store says "Supermarket twin · Example, not a model of this site"');
 const text=await page.evaluate(()=>document.body.innerText);
 check(/Elevation: LINZ \(CC BY 4\.0\) via AWS Terrain Tiles\. Map data © OpenStreetMap contributors, via OpenFreeMap\./.test(text),'the credits line is on the page');
 check(await page.locator('.map-credit').filter({hasText:'OpenStreetMap contributors'}).count()===1,'the map carries its own credit');
 // no business named: not on the page, not in the baked map data (which carries no name fields at all)
 const BIZ=/woolworths|countdown|pak.?n.?save|new world|four square|freshchoice|fresh choice|supervalue|foodstuffs|costco|farro|huckleberry|nosh|moore wilson|gilmours|bin inn|night ?'?n'? ?day/i;
 check(!BIZ.test(text)&&!BIZ.test(await page.title()),'no supermarket, chain or business named on the page');
 const hdr=await page.evaluate(async()=>(await fetch('/assets/models/delivery/delivery-points.json')).text());
 check(!/"(name|names|name:[a-z]+|brand|operator)"\s*:/.test(hdr)&&!BIZ.test(hdr),'the baked map data carries no names');
 check(!/\b\d+[a-z]?\s+[A-Z][a-z]+\s+(Street|St|Road|Rd|Avenue|Ave|Crescent|Cres|Drive|Dr|Place|Pl|Terrace|Tce|Lane)\b/.test(text),'no street address with a number anywhere');
 check(await page.locator('.co-home').filter({hasText:/Fictional/}).count()===6,'six households, each labelled fictional');
 // agents and their authority, in IBM Plex Mono
 const auth=await page.locator('#roster .auth').evaluateAll(xs=>xs.map(x=>[x.textContent.trim(),getComputedStyle(x).fontFamily]));
 check(auth.length===6&&auth.every(([a,f])=>['observe','draft','recommend','act with approval'].includes(a)&&/IBM Plex Mono/.test(f)),'six agents, each with its authority in IBM Plex Mono');
 // the pause button
 const playLabel=await page.locator('#play').getAttribute('aria-label');
 check(playLabel==='Pause motion'||playLabel==='Play motion','the motion button is labelled (Pause motion / Play motion)');
 if(!(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches)))check(playLabel==='Pause motion','it says "Pause motion" while the run plays');
 // it plays: story time moves on its own
 const t0=await page.evaluate(()=>window.__delivery.t);await page.waitForTimeout(1500);const t1=await page.evaluate(()=>window.__delivery.t);
 if(playLabel==='Pause motion')check(t1>t0,`the run plays on its own (${t0.toFixed(2)} → ${t1.toFixed(2)} s)`);
 if(await page.locator('#play').getAttribute('aria-pressed')==='false')await page.locator('#play').click();   // pause, then step by hand
 check(await page.locator('#play').getAttribute('aria-label')==='Play motion','paused, the button offers "Play motion"');
 // stages advance with Next; every message on every stage is a draft; the two decisions wait for the customer
 await page.evaluate(()=>window.__delivery.goStage(0));
 const seen=new Set();let msgs=0;
 for(let k=0;k<8;k++){
  const st=await page.evaluate(()=>window.__delivery.stage);
  check(st===k,`stage ${k+1} reached (${st+1})`);
  check(await page.locator(`#steps button[data-stage="${k}"][aria-current="step"]`).count()===1,`stage ${k+1} marked current in the steps`);
  const title=(await page.locator('#pn-title').textContent()).trim();seen.add(title);
  const m=await page.locator('#pn-msgs .msg').evaluateAll(xs=>xs.map(x=>({state:x.querySelector('.msg-state')?.textContent||'',body:x.querySelector('p')?.textContent||''})));
  msgs+=m.length;
  check(m.every(x=>/^Draft · waiting for a person's yes$/.test(x.state.trim())),`stage ${k+1}: every message shown as a draft (${m.length})`);
  check(m.every(x=>!/\b(sent|delivered to your phone|we've texted)\b/i.test(x.body)),`stage ${k+1}: no message claims it was sent`);
  if(k===2){check(await page.locator('#pn-decide .choice').count()===3,'the swap waits for the customer: two swaps or none');
   check(await page.evaluate(()=>window.__delivery.waiting)==='swap','the run holds at the swap');
   await page.locator('#pn-decide .choice[data-v="B"]').click();
   check(/Swap B approved/.test(await page.locator('#pn-decide').textContent())&&/draft until that yes/.test(await page.locator('#pn-decide').textContent()),'the customer approves one swap; it was a draft until then');}
  if(k===6){check(await page.locator('#pn-decide .choice').count()===2,'nobody home: rebook or a safe place');
   await page.locator('#pn-decide .choice[data-v="safe"]').click();
   check(/safe place/i.test(await page.locator('#pn-decide').textContent()),'the customer chooses the safe place');}
  if(k<7)await page.locator('#next').click();
 }
 check(msgs>=7,`messages appear along the way (${msgs})`);
 check(seen.has('Proof'),'the run ends on the proof');
 const proof=await page.locator('#pn-proof').textContent();
 check(/of 6/.test(proof)&&/substitutions accepted/.test(proof)&&/missed delivery recovered/.test(proof)&&/customer effort saved/.test(proof)&&/Simulated/.test(proof),'the proof: windows kept, swaps accepted, the miss recovered, effort saved, all Simulated');
 check(/0 sent/.test(proof),'the proof says nothing was sent');
 check(await page.locator('#proof .truth').filter({hasText:'Simulated'}).count()>=1,'the proof section is labelled Simulated');
 check(/\bsafe place\b/.test(await page.locator('#words').textContent()),'the journey in words follows the choices');
 // make it go wrong, off: nothing out of stock and everyone home
 await page.locator('#wrong').click();await page.evaluate(()=>window.__delivery.goStage(2));
 check(await page.locator('#wrong').getAttribute('aria-pressed')==='false'&&/Nothing out of stock/.test(await page.locator('#pn-title').textContent()),'"make it go wrong" off: nothing out of stock');
 await page.evaluate(()=>window.__delivery.goStage(6));
 check(/Everyone home/.test(await page.locator('#pn-title').textContent()),'"make it go wrong" off: everyone home');
 await page.locator('#wrong').click();
 // prices: Stats NZ, labelled snapshot or Latest published
 check(await page.locator('#bk-body tr').count()>=13&&/Stats NZ/.test(await page.locator('#price-src').textContent()),'the basket is priced from Stats NZ, with its label');
 // callouts on the map with leader lines, when WebGL draws
 if(await page.evaluate(()=>document.documentElement.classList.contains('dl-on'))){
  await page.evaluate(()=>window.__delivery.goStage(4));
  await page.waitForFunction(()=>document.querySelectorAll('.co.on').length>=5,null,{timeout:60000});
  const keys=await page.locator('.co.on').evaluateAll(xs=>xs.map(x=>x.dataset.anchor));
  check(['store','van'].every(k=>keys.includes(k))&&keys.filter(k=>/^[A-F]$/.test(k)).length>=3,`callouts tied to the store, the van and the households (${keys.join(' ')})`);
  check(await page.locator('.leaders path').count()>=keys.length,'every callout has a leader line');
  check(await page.evaluate(()=>[...document.querySelectorAll('.leaders circle.ring')].every(c=>{const b=document.getElementById('stage-box').getBoundingClientRect(),x=+c.getAttribute('cx'),y=+c.getAttribute('cy');return x>=0&&y>=0&&x<=b.width&&y<=b.height})),'every leader line starts on the map');
 } else check(await page.locator('#callouts .co').count()===8&&await page.locator('#stage-still').isVisible(),'without WebGL: the still and the callouts as a list');
 check(await page.locator('#words li').count()===8,'the journey in words: eight stages');
 // phone width: no sideways scroll
 for(const w of [390,320]){await page.setViewportSize({width:w,height:844});await page.waitForTimeout(300);check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`no horizontal scroll at ${w}px`)}
 check(await page.evaluate(()=>!/\bAssembl\b|\bASSEMBL\b/.test(document.body.innerText.replace(/assembly/gi,''))),'brand word is lowercase assembl');
 const css=await page.evaluate(async()=>(await (await fetch('/delivery/delivery.css')).text())+document.documentElement.outerHTML);
 check(!/#(8b5cf6|a78bfa|c4b5fd|7c3aed|ddd6fe|c7b4f0|d7b3f0|6a50be|c99bda|F2DC7C|000000|000)\b|violet|lavender/i.test(css.replace(/\/\*[\s\S]*?\*\//g,'')),'no violet, lavender, canary or black');
 check(errors.length===0,'no page errors: '+errors.join(' | '));
 return checks;
}
