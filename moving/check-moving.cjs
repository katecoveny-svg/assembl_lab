async (page) => {
 // The Moving house sim (/moving/). Same harness as scripts/check-lab-home.cjs: a page function run against the repo served at
 // http://127.0.0.1:8341/ (LAB_URL overrides it, e.g. LAB_URL=http://127.0.0.1:8342 when a sibling is on 8341).
 const BASE=(typeof process!=='undefined'&&process.env&&process.env.LAB_URL)||'http://127.0.0.1:8341';
 const checks=[];const check=(ok,label)=>{if(!ok)throw new Error(label);checks.push(label)};
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:1440,height:900});await page.goto(BASE+'/moving/');
 await page.waitForFunction(()=>window.MovingJourney&&document.querySelectorAll('#mv-dots button').length===9,null,{timeout:20000});
 check(await page.locator('h1').count()===1,'one h1');
 check(await page.locator('#al-nav .v2-wordmark').count()===1&&await page.locator('#al-nav .v2-wordmark-a').count()===0,'the shared experiment nav, wordmark text only (no "a." mark)');
 check(await page.locator('#mv-play').getAttribute('aria-label')==='Pause motion','the pause button is labelled "Pause motion"');
 // the stages advance: by themselves while playing, and by hand
 const at=()=>page.evaluate(()=>({s:window.MovingJourney.state.stage,b:window.MovingJourney.state.beat}));
 const a0=await at();await page.waitForFunction(([s,b])=>{const t=window.MovingJourney.state;return t.stage!==s||t.beat!==b},[a0.s,a0.b],{timeout:15000});
 check(true,'the journey plays on its own (a beat or a stage advances)');
 await page.click('#mv-play');check(await page.locator('#mv-play').getAttribute('aria-label')==='Play motion','pausing stops the journey and the motion');
 await page.click('#mv-dots button >> nth=0');
 const seen=[];for(let i=0;i<9;i++){seen.push(await page.locator('#mv-stage-card .mv-stage-t').textContent());if(i<8)await page.click('#mv-next')}
 check(new Set(seen).size===9&&await page.locator('#mv-dots button[aria-current="step"]').getAttribute('aria-label')==='Stage 9: Proof','Next steps through all nine stages to Proof ('+seen.join(' → ')+')');
 for(const t of ['Searching','Viewing booked','Application','Tenancy agreed','Moving day booked','Power and internet','Change of address','Settling in','Proof'])check(seen.some(s=>s.startsWith(t)),'stage: '+t);
 // every outbound step is a draft or an approval, in both versions of the journey, and nothing claims to be sent, lodged, booked or connected
 for(const wrong of [false,true]){
  const r=await page.evaluate(w=>{const J=window.MovingJourney;J.setWrong(w);const out=[];for(const s of J.state.J.stages)for(const b of s.beats){if(b.k==='draft'||b.k==='consent'||(b.k==='list'&&b.approve))out.push({stage:s.id,k:b.k,to:b.to||'',approve:!!b.approve,state:b.state||''})}return out},wrong);
  check(r.length>=10&&r.every(x=>x.approve),`${wrong?'gone wrong':'to plan'}: all ${r.length} outbound messages and forms wait for Sam's yes`);
  check(r.every(x=>!x.state||/Nothing is (sent|booked|shared)|Not lodged|Waiting on/.test(x.state)),'every stated outcome says nothing was sent, booked, shared or lodged');
  check(r.some(x=>/Bond-holding step/.test(x.to)&&/Not lodged/.test(x.state)),'the bond goes to the bond-holding step as an approval, never lodged');
  for(let i=0;i<9;i++){await page.evaluate(i=>window.MovingJourney.go(i,{whole:true}),i);
   const cards=await page.locator('#mv-stage-card .mv-draft, #mv-stage-card .mv-list .mv-status').evaluateAll(xs=>xs.map(x=>x.textContent));
   if(cards.some(t=>!/Approved by Sam|Agreed by Sam|Consent given by Sam|Approval given by Sam/.test(t)||!/Nothing is (sent|booked|shared)|Not lodged/.test(t)))throw new Error(`stage ${i+1}: a draft card without Sam's yes and a "nothing sent" line`);}
  check(true,`${wrong?'gone wrong':'to plan'}: every draft card on screen shows Sam's yes and that nothing was sent`);
  const txt=await page.evaluate(()=>document.body.innerText);
  check(!/(?<!\b(?:nothing|none) )\b(has been|was|were|is now|now) (sent|lodged|booked|connected|submitted)\b|\bbond (is |was )?lodged\b/i.test(txt),'no copy claims anything was sent, lodged, booked or connected');
  if(wrong){check(/Declined/.test(txt)&&/Haydn Avenue/.test(txt),'make it go wrong: the application is declined and the next option taken');check(/Clash/.test(txt)&&/Re-plan/.test(txt),'make it go wrong: the connection date clashes and is re-planned')}
 }
 await page.evaluate(()=>window.MovingJourney.setWrong(false));
 // agents and their authority (IBM Plex Mono labels)
 const auth=await page.locator('#agents .mv-auth').evaluateAll(xs=>xs.map(x=>[x.textContent,getComputedStyle(x).fontFamily]));
 check(auth.length>=14&&auth.every(([t,f])=>/^(observe|draft|recommend|act with approval)$/.test(t)&&/Plex Mono/.test(f)),'seven agents, each authority in IBM Plex Mono (observe / draft / recommend / act with approval)');
 for(const a of ['Intent','Search','Application','Tenancy','Utilities','Moving','Resolution'])check(await page.locator('#agents strong',{hasText:a}).count()===1,'agent: '+a);
 // truth labels, published data and credits
 const all=await page.evaluate(()=>document.body.innerText);
 for(const t of ['Simulated','Shadow','Live','Illustrative','Latest published','Estimate'])check(all.includes(t),'truth label present: '+t);
 check(/Example house, drawn/.test(all)&&/Example tenant/.test(all),'the house is an Example, drawn; the tenant is an Example');
 check(/\$570/.test(all)&&/\$650/.test(all)&&/Sandringham East/.test(all)&&/Ellerslie Central/.test(all)&&/April to June 2026/.test(all),'published median rents with their areas and quarter');
 check(await page.locator('a[href^="https://www.tenancy.govt.nz/"]').count()>=2,'links to Tenancy Services for the real rules and the rent data');
 const credit=await page.locator('#mv-credit').textContent();
 check(credit.includes('Elevation: LINZ (CC BY 4.0) via AWS Terrain Tiles.')&&credit.includes('Map data © OpenStreetMap contributors, via OpenFreeMap.')&&/Tenancy Services/.test(credit),'credits: LINZ, OpenStreetMap via OpenFreeMap, and the rent data');
 // no real business names (property managers, movers, power retailers, internet providers, banks), no house numbers
 const NAMES=/\b(Barfoot|Harcourts|Ray White|Bayleys|LJ Hooker|Quinovic|Crockers|Tall Poppy|Property Brokers|Allied Pickfords|Crown Relocations|Mainfreight|Contact Energy|Mercury|Genesis|Meridian|Trustpower|Electric Kiwi|Flick|Nova Energy|Powershop|Octopus|Frank Energy|Spark|One NZ|Vodafone|2degrees|Slingshot|Orcon|Skinny|Chorus|Vector|ANZ|ASB|Westpac|Kiwibank|BNZ|AA Insurance|Tower|NZ Post|Trade Me|realestate\.co\.nz|OneRoof)\b/;
 const both=all+(await page.evaluate(()=>{const J=window.MovingJourney;J.setWrong(true);const t=document.body.innerText;J.setWrong(false);return t}));
 check(!NAMES.test(both),'no real business names'+((both.match(NAMES)||[])[0]?' (found '+both.match(NAMES)[0]+')':''));
 check(!/\b\d+[A-Za-z]?[ \u00a0]+(Calgary Street|Lonsdale Street|Haydn Avenue)\b/.test(both),'no house numbers on the streets');
 check(!/\bAssembl\b|\bASSEMBL\b/.test(all),'brand word is lowercase assembl');
 check(!/ — /.test(all),'no em dashes in the copy');
 const css=await page.evaluate(async()=>(await (await fetch('/moving/moving.css')).text())+document.documentElement.outerHTML);
 check(!/#(8b5cf6|a78bfa|c4b5fd|7c3aed|ddd6fe|c7b4f0|d7b3f0|6a50be|c99bda|f2dc7c|000000)\b|violet|lavender/i.test(css.replace(/\/\*[\s\S]*?\*\//g,'')),'no violet, lavender, canary or black');
 // the cloud (when this browser has WebGL): callouts are real DOM text tied to anchors on screen; the page never paints a dark box first
 check(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor==='rgb(33, 18, 31)'),'plum ground (#21121F) behind everything');
 if(await page.evaluate(()=>document.documentElement.classList.contains('mv-on'))){
  await page.evaluate(()=>window.MovingJourney.go(4,{whole:true}));
  await page.waitForFunction(()=>document.querySelectorAll('.mv-callout.on').length>=1,null,{timeout:30000});
  const dots=await page.evaluate(()=>{const s=document.querySelector('.mv-world').getBoundingClientRect();return [...document.querySelectorAll('.mv-leaders circle.ring')].every(c=>{const x=+c.getAttribute('cx'),y=+c.getAttribute('cy');return x>0&&y>0&&x<s.width&&y<s.height})});
  check(dots&&await page.locator('.mv-leaders path').count()>=await page.locator('.mv-callout.on').count(),'every callout has a leader line to an anchor on screen');
  const over=await page.evaluate(()=>{const p=document.querySelector('.mv-panel').getBoundingClientRect();return [...document.querySelectorAll('.mv-callout.on')].filter(e=>{const b=e.getBoundingClientRect();return !(b.right<p.left||b.left>p.right||b.bottom<p.top||b.top>p.bottom)}).length});
  check(over===0,'no callout covers the panel');
 }
 for(const w of [320,390]){await page.setViewportSize({width:w,height:844});await page.waitForTimeout(200);check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`no horizontal scroll at ${w}px`)}
 // reduced motion: the whole journey as one still, every callout on the map
 await page.setViewportSize({width:1440,height:900});await page.emulateMedia({reducedMotion:'reduce'});await page.goto(BASE+'/moving/');
 await page.waitForFunction(()=>window.MovingJourney,null,{timeout:20000});
 check(await page.evaluate(()=>window.MovingJourney.state.stage===8&&!window.MovingJourney.state.playing),'reduced motion: the journey is shown whole (Proof), not played');
 if(await page.evaluate(()=>document.documentElement.classList.contains('mv-on'))){
  await page.waitForFunction(()=>document.querySelectorAll('.mv-callout').length>=6&&[...document.querySelectorAll('.mv-callout')].every(e=>e.classList.contains('on')),null,{timeout:40000});
  check(true,'reduced motion: every callout of the still is on the map');
 }
 await page.emulateMedia({reducedMotion:'no-preference'});
 check(errors.length===0,'no page errors: '+errors.join(' | '));
 return checks;
}
