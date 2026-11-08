async (page) => {
 // Friday night on the Viaduct (/viaduct/). Same harness as the other checks: a page function run against the repo served at
 // http://127.0.0.1:8343/ (python3 -m http.server 8343 --bind 127.0.0.1 from the repo root). Chromium with --use-gl=angle
 // --use-angle=swiftshader is enough for the WebGL parts; the no-WebGL part blocks WebGL itself.
 const checks=[];const check=(ok,label)=>{if(!ok)throw new Error(label);checks.push(label)};
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const BASE='http://127.0.0.1:8343/viaduct/';
 const ready=()=>page.waitForFunction(()=>window.__viaduct&&window.__viaduct.ready,null,{timeout:90000});
 await page.setViewportSize({width:1440,height:900});await page.goto(BASE);await ready();
 // the header uses the shared experiment nav: the wordmark text, no "a." mark
 check(await page.locator('#al-nav .v2-wordmark').count()===1&&await page.locator('#al-nav svg.v2-wordmark-a, #al-nav img').count()===0,'the shared experiment nav, wordmark text only');
 check(await page.locator('h1').count()===1&&/Friday night on the Viaduct/.test(await page.locator('h1').textContent()),'one h1: Friday night on the Viaduct');
 // the timeline advances on its own, and stops when motion is paused
 const t0=await page.evaluate(()=>window.__viaduct.t),c0=await page.locator('#clock').textContent();
 await page.waitForFunction(c=>document.getElementById('clock').textContent!==c&&window.__viaduct.t>1,c0,{timeout:20000}).catch(()=>{});
 const t1=await page.evaluate(()=>window.__viaduct.t),c1=await page.locator('#clock').textContent();
 check(t1>t0&&c1!==c0,`the timeline advances on its own (${c0} → ${c1})`);
 check(await page.locator('#pp').getAttribute('aria-label')==='Pause motion','the pause button is labelled "Pause motion"');
 await page.click('#pp');const tp=await page.evaluate(()=>window.__viaduct.t);await page.waitForTimeout(1200);
 check(Math.abs(await page.evaluate(()=>window.__viaduct.t)-tp)<0.01,'Pause motion stops the night');
 // the time-of-night scrubber, speed and chapters
 await page.evaluate(()=>{const s=document.getElementById('scrub');s.value='200';s.dispatchEvent(new Event('input',{bubbles:true}));s.dispatchEvent(new Event('change',{bubbles:true}))});
 check((await page.locator('#clock').textContent()).trim()==='8:20 pm','the scrubber moves the night (8:20 pm)');
 check(await page.locator('.speed [role="radio"]').count()===3,'speed control');
 check(await page.locator('#ticks button').count()===8,'eight moments to jump to: bookings, walk-ins, waitlist, kitchen, weather, no-show, close-out, proof');
 // guest messages: sent only within the limits staff set, or after a named role approved them; everything else is a draft
 const msgCheck=()=>page.evaluate(()=>{const n=window.__viaduct.night,L=n.LIMITS,bad=[];
  for(const m of n.messages){
   if(m.status==='limits'){if(!(m.sentAt===m.t&&m.t>=L.from&&m.t<=L.until&&!m.approvedBy))bad.push('limits '+m.id)}
   else if(m.status==='approved'){if(!(['host','duty manager'].includes(m.approvedBy)&&m.approvedAt>=m.t&&m.sentAt===m.approvedAt))bad.push('approved '+m.id)}
   else if(m.status==='draft'){if(m.sentAt!==null)bad.push('draft sent '+m.id)}
   else bad.push('status '+m.status)}
  for(const e of n.events)if(e.status.kind==='approved'&&!['host','duty manager'].includes(e.status.by))bad.push('event '+e.text.slice(0,40));
  return {n:n.messages.length,drafts:n.messages.filter(m=>m.status==='draft').length,bad}});
 let mc=await msgCheck();check(mc.n>10&&mc.bad.length===0,`every guest message is within limits, approved by a named role, or a draft (${mc.n} messages${mc.bad.length?': '+mc.bad.join(', '):''})`);
 check(mc.drafts>=1,'at least one message stays a draft (nothing sent without approval)');
 // in the page's words: no line says a message was sent unless it was within limits or approved
 const sentLines=()=>page.evaluate(()=>{const out=[];const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let x;while((x=w.nextNode()))if(/\bsent\b/i.test(x.textContent))out.push(x.textContent.trim());return out.filter(s=>!/within limits|Approved by the (host|duty manager)|not sent|nothing sent|unsent|Sent to the kitchen|only goes to a guest/i.test(s))});
 let sl=await sentLines();check(sl.length===0,'no text claims a message was sent without limits or approval'+(sl.length?' ('+sl.slice(0,3).join(' | ')+')':''));
 // make it go wrong: a rainstorm, a big walk-in group and the kitchen behind; the same rules hold
 await page.click('#wrong');check(await page.locator('#wrong').getAttribute('aria-pressed')==='true','"Make it go wrong" switches on');
 check(await page.evaluate(()=>{const o=window.__viaduct.night.opts;return o.rain&&o.group&&o.kitchen}),'it brings a rainstorm, a big walk-in group and the kitchen behind');
 mc=await msgCheck();check(mc.bad.length===0,`the gone-wrong night keeps the message rules (${mc.n} messages)`);
 for(const t of [60,180,260,330,415]){await page.evaluate(t=>window.__viaduct.setT(t),t);sl=await sentLines();check(sl.length===0,`no unapproved "sent" at minute ${t} of the gone-wrong night`)}
 await page.click('#wrong');
 // the night's beats all happen
 const beats=await page.evaluate(()=>{const n=window.__viaduct.night;return {ch:n.chapters.map(c=>c.id),comp:n.events.some(e=>e.slow),rain:n.events.some(e=>e.agent==='weather'),noshow:n.events.some(e=>e.noShow),quote:n.events.some(e=>e.quote),close:n.events.some(e=>e.closeout)}});
 check(['book','walk','wait','kitchen','rain','noshow','close','proof'].every(c=>beats.ch.includes(c))&&beats.comp&&beats.rain&&beats.noshow&&beats.quote&&beats.close,'the night has every beat: bookings, walk-ins, the waitlist, a slow table and a comp, rain, a no-show, the close-out and proof');
 // agents: six specialists, each with its authority in IBM Plex Mono
 const AUTH=['observe','draft','recommend','act with approval','act within limits'];
 const ag=await page.locator('#agent-grid li').evaluateAll(xs=>xs.map(x=>({h:x.querySelector('h3').textContent,a:x.querySelector('.auth').textContent,f:getComputedStyle(x.querySelector('.auth')).fontFamily})));
 check(ag.length===6&&['Booking','Waitlist','Wait','Kitchen','Weather','Resolution'].every(n=>ag.some(a=>a.h===n))&&ag.every(a=>AUTH.includes(a.a)&&/IBM Plex Mono/.test(a.f)),'six agents, each with its authority in IBM Plex Mono');
 check(await page.locator('#feed li .auth').count()>=2,'the live feed shows each action\'s authority');
 // truth labels
 const truth=await page.locator('.truth').allTextContents();
 check(truth.some(s=>/Simulated/.test(s))&&truth.some(s=>/Example restaurant, drawn/.test(s))&&truth.some(s=>/Fictional guest/.test(s)),'truth labels: Simulated, Example restaurant drawn, Fictional guest');
 check(await page.locator('#data .truth[data-k="ill"]').count()>=1&&/Illustrative/.test(await page.locator('#data').textContent()),'Illustrative label on the drawn restaurant');
 check(await page.locator('.src-stage[data-stage="model"]').count()===1,'maturity stage shown: Model');
 await page.waitForTimeout(500);
 const wx=await page.locator('#feed-weather').textContent(),hol=await page.locator('#feed-holiday').textContent();
 check(/Live|Latest published|didn't answer|Checking/.test(wx)&&/Live|Latest published|didn't answer|Checking/.test(hol),'the weather and holiday feeds are labelled (Live, Latest published, or not answering)');
 check(/Sunset \d{1,2}:\d{2} pm · calculated/.test(await page.locator('#sun').textContent()),'sunset is shown as calculated');
 check(await page.locator('.proof .truth[data-k="sim"]').count()>=1&&(await page.locator('.metric .cmp').allTextContents()).every(s=>/Simulated/.test(s)),'every proof figure is labelled Simulated');
 // no business names: no capitalised name before a hospitality word, the map's labels are landmarks only, the baked data holds no names
 const text=await page.evaluate(()=>document.body.innerText);
 const named=(text.match(/\b[A-Z][\w’'&-]+(?:[ \u00a0]+[A-Z][\w’'&-]+)*[ \u00a0]+(?:Restaurant|Bar|Café|Cafe|Bistro|Brasserie|Grill|Eatery|Kitchen|Tavern|Pub|Hotel|Lounge|Diner|Brewery|Club)\b/g)||[]).filter(m=>!/^(The|A|An|Example|Our|Your)[ \u00a0]+\S+$/.test(m));
 check(named.length===0,'no business names in the page'+(named.length?' ('+named.join(', ')+')':''));
 const marks=await page.locator('.callout.mark strong').allTextContents();
 check(marks.length===3&&marks.every(m=>['Viaduct Harbour','Wynyard Quarter','Sky Tower'].includes(m)),'landmark labels are factual: Viaduct Harbour, Wynyard Quarter, Sky Tower');
 const hdr=await page.evaluate(async()=>(await fetch('/assets/models/viaduct/viaduct-points.json')).text());
 check(!/"name"\s*:|"names"\s*:/.test(hdr)&&/Example restaurant, drawn/.test(hdr),'the baked waterfront carries no names, and its restaurant is the drawn Example');
 check(!/\b(beer|wine|cocktail|spirits|happy hour|shots?)\b/i.test(text),'no alcohol promotion: drinks are neutral');
 // credits
 check(text.includes('Elevation: LINZ (CC BY 4.0) via AWS Terrain Tiles. Map data © OpenStreetMap contributors, via OpenFreeMap.'),'the data is credited');
 // with WebGL: the callouts are real DOM text with leader lines to anchors on the map, clear of the words and panels
 if(await page.evaluate(()=>document.documentElement.classList.contains('pc-on'))){
  await page.evaluate(()=>window.__viaduct.setT(200));await page.waitForFunction(()=>document.querySelectorAll('.callout.on').length>=3,null,{timeout:30000});
  const on=await page.locator('.callout.on').evaluateAll(xs=>xs.map(x=>x.dataset.anchor));
  check(['restaurant','wait','wharf'].every(k=>on.includes(k)),'callouts with leader lines to the restaurant, the waitlist crowd and the wharf ('+on.join(', ')+')');
  const over=await page.evaluate(()=>{const keep=[...document.querySelectorAll('.intro h1, .intro .lede, .controls, .phone .device, .plan, #al-nav')].map(e=>e.getBoundingClientRect());
   return [...document.querySelectorAll('.callout.on')].filter(e=>{const b=e.getBoundingClientRect();return keep.some(a=>!(b.right<a.left||b.left>a.right||b.bottom<a.top||b.top>a.bottom))}).map(e=>e.dataset.anchor)});
  check(over.length===0,'no callout covers the headline, the controls, the phone or the plan'+(over.length?' ('+over.join(', ')+')':''));
  const dots=await page.evaluate(()=>[...document.querySelectorAll('#leaders circle.ring')].map(c=>[+c.getAttribute('cx'),+c.getAttribute('cy')]));
  const vp=page.viewportSize();check(dots.length>=on.length&&dots.every(([x,y])=>x>0&&y>0&&x<vp.width&&y<vp.height),'every leader line reaches an anchor on screen');
 }
 // phone width: nothing scrolls sideways
 for(const w of [390,320]){await page.setViewportSize({width:w,height:844});await page.waitForTimeout(400);check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`no horizontal scroll at ${w}px`)}
 // reduced motion: one complete still moment (8:20 pm) with every callout, and the clock stays put
 await page.setViewportSize({width:1440,height:900});await page.emulateMedia({reducedMotion:'reduce'});await page.goto(BASE);await ready();
 await page.waitForFunction(()=>document.querySelectorAll('.callout.on').length===6,null,{timeout:30000}).catch(()=>{});
 const rm=await page.evaluate(()=>({t:window.__viaduct.t,on:document.querySelectorAll('.callout.on').length,playing:window.__viaduct.playing}));
 await page.waitForTimeout(1500);
 check(rm.t===200&&!rm.playing&&await page.evaluate(()=>window.__viaduct.t)===200,'reduced motion opens on one still moment (8:20 pm) and does not move on its own');
 check(rm.on===6||!(await page.evaluate(()=>window.__viaduct.gl)),`reduced motion shows every callout (${rm.on} of 6)`);
 // no WebGL: the still, the callouts as a list, and the night as text
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.addInitScript(()=>{const g=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...a){return /webgl/i.test(t)?null:g.call(this,t,...a)}});
 await page.goto(BASE+'?t=20:20');await ready();
 const ng=await page.evaluate(()=>({gl:window.__viaduct.glReady,pc:document.documentElement.classList.contains('pc-on'),still:(()=>{const i=document.getElementById('map-still');return i.complete&&i.naturalWidth>0&&getComputedStyle(i).opacity==='1'})(),callouts:[...document.querySelectorAll('.callout')].filter(c=>getComputedStyle(c).visibility==='visible'&&c.offsetWidth>0).length,night:document.querySelectorAll('#night-list li').length}));
 check(ng.gl===false&&!ng.pc&&ng.still,'without WebGL the still of the waterfront shows');
 check(ng.callouts===6,'without WebGL every callout is still there, as a list');
 check(ng.night>40,`without WebGL the night is there as text (${ng.night} lines)`);
 check(errors.length===0,'no page errors'+(errors.length?': '+errors.join(' | '):''));
 return checks;
}
