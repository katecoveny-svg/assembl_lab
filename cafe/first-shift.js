// First Shift adapts the existing venue and deterministic engine; it owns no business model.
export function mountFirstShift(api) {
  document.body.classList.add('first-shift');
  document.title='First Shift · assembl';
  document.querySelector('.top').innerHTML=`<div><div class="eyebrow">assembl / First Shift</div><h1>The morning is yours.</h1></div><p class="shift-intro">An Auckland café. One busy morning.<br> Find the constraint before you buy another machine.</p><a class="shift-back" href="/cafe/">Full model ↗</a>`;
  const scene=document.querySelector('#stagebox');
  scene.dataset.focus='none';
  const toolbar=document.createElement('div');toolbar.className='shift-toolbar';
  toolbar.innerHTML=`<label>Look around <select id="shift-view" aria-label="Explore the café"><option value="hero">The café</option><option value="counter">Coffee & queue</option><option value="kitchen">Kitchen pass</option><option value="office">The roster</option><option value="dining">The tables</option></select></label><div id="shift-ar-entry"></div>`;
  scene.append(toolbar);
  const arCaption=document.createElement("span");arCaption.className="shift-ar-caption";arCaption.textContent="Static tabletop · simulation stays here";scene.append(arCaption);
  const placard=document.createElement('div');placard.className='shift-placard';placard.innerHTML='<span>AUCKLAND · OCTOBER</span><b>The neighbourhood café</b><small id="shift-model">Loading the authored venue…</small>';scene.append(placard);
  const sceneControls=document.createElement('div');sceneControls.className='shift-scene-controls';sceneControls.innerHTML='<span id="shift-clock">08:00</span><button id="shift-scene-pause" disabled>Paused</button><span class="shift-truth">Illustrative venue</span>';scene.append(sceneControls);
  const panel=document.createElement('section');panel.className='shift-panel';panel.setAttribute('aria-label','Plan the morning');
  panel.innerHTML=`<div class="shift-decision"><div class="eyebrow">Your call / before opening</div><h2>People, equipment—or both?</h2><div class="shift-options" role="group" aria-label="Rush plan"><button data-plan="base" aria-pressed="true"><span>01</span>Current setup</button><button data-plan="station" aria-pressed="false"><span>02</span>Another station</button><button data-plan="roster" aria-pressed="false"><span>03</span>Better-timed staff</button><button data-plan="both" aria-pressed="false"><span>04</span>Staff + station</button></div><p id="shift-explain"></p><div class="shift-actions"><button id="shift-run">Watch the rush <span aria-hidden="true">↗</span></button><button id="shift-step">See 10am outcome</button><button id="shift-reset" aria-label="Reset to current setup">Reset</button></div></div><div class="shift-feedback"><p id="shift-status" role="status" aria-live="polite"></p><div id="shift-result"></div></div><details class="shift-notes"><summary>Assumptions, AR & model files</summary><div class="shift-note-grid"><p>Fictional Auckland café. Same Tuesday customers and typical October weather for every plan, replayed from opening. Estimated labour includes the model’s wages and on-costs. Equipment purchase cost is excluded. Not measured savings, payroll advice or certification.</p><div><p>AR is a static tabletop snapshot. Decisions and moving customers stay here. Safari Quick Look on supported iPhone/iPad; WebXR on supported Android Chrome over HTTPS. Physical-device placement is unverified.</p><div id="shift-downloads"></div><p id="shift-export-report" role="status"></p></div></div></details></section>`;
  document.querySelector('.main').append(panel);
  const q=s=>document.querySelector(s);
  const plans={base:[false,false,'Keep the existing roster and one coffee station.'],station:[false,true,'Add capacity. But who will use it? Purchase cost is excluded.'],roster:[true,false,'Put people on when the forecast says they are needed.'],both:[true,true,'Pair the forecast roster with a second coffee station.']};
  let selected='base',running=false,elapsed=0;
  const baseline=api.evaluate(false,false),result=q('#shift-result'),pause=q('#shift-scene-pause');
  function show(){
    const current=api.stats(),complete=api.minutes()>=600;
    q('#shift-run').innerHTML=(running?'Pause rush':complete?'Replay rush':'Watch the rush')+' <span aria-hidden="true">↗</span>';
    pause.disabled=!running;pause.textContent=running?'Pause':'Paused';
    q('#shift-clock').textContent=api.time();
    q('#shift-status').textContent=`${api.time()} · ${running?'Running':complete?'Complete':api.minutes()>480?'Paused':'Ready'} · simulated`;
    if(!complete) result.innerHTML=`<div class="shift-scores"><div><b>${current.inQueue}</b><span>waiting to order</span></div><div><b>${current.walked}</b><span>walked away so far</span></div></div><p class="shift-readout">Watch the queue and coffee orders. Then compare the cost at 10am.</p>`;
    q('#shift-model').textContent=api.graphics()==='model'?'Authored venue · simulated people & orders':api.modelReady()?'Simple maquette':api.modelStatus();
  }
  function finish(){
    running=false;api.play(false);const [roster,station]=plans[selected],outcome=api.evaluate(roster,station),delta=outcome.walked-baseline.walked;
    result.innerHTML=`<div class="shift-scores"><div><b>${outcome.walked}</b><span>walk-aways by 10am</span></div><div><b><small>NZ$</small>${Math.round(outcome.labour)}</b><span>estimated labour</span></div></div><p class="shift-readout">${delta<0?`${-delta} fewer walk-aways`:delta>0?`${delta} more walk-aways`:'No change in walk-aways'} compared with the starting plan. Labour ${outcome.labour>=baseline.labour?'+':'−'}NZ$${Math.round(Math.abs(outcome.labour-baseline.labour))}.</p>`;show();
  }
  function select(key){selected=key;running=false;api.play(false);result.replaceChildren();api.reset(...plans[key]);q('#shift-explain').textContent=plans[key][2];panel.querySelectorAll('[data-plan]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.plan===key)));show();}
  panel.querySelectorAll('[data-plan]').forEach(b=>b.onclick=()=>select(b.dataset.plan));
  q('#shift-reset').onclick=()=>select('base');
  q('#shift-step').onclick=()=>{api.jump(10);finish();};
  q('#shift-run').onclick=()=>{if(api.minutes()>=600)select(selected);running=!running;api.play(running);show();if(running&&innerWidth<=760)scene.scrollIntoView({behavior:'auto',block:'start'});};
  pause.onclick=()=>{running=false;api.play(false);show();};
  q('#shift-view').onchange=e=>{const view=e.target.value;scene.dataset.focus=({counter:'coffee',kitchen:'pass',office:'board',dining:'tables'})[view]||'none';api.view(view);};
  api.onFrame(dt=>{elapsed+=dt;if(running&&api.minutes()>=600){api.jump(10);finish();}if(elapsed>1){elapsed=0;show();}});
  select('base');api.view('hero',true);
  // No shared AR mutations: use its snapshot/export contract, preserving source metres before tabletop scaling.
  import('/ar/embed.js').then(({default:ar})=>{
    const controller=ar.button(q('#shift-ar-entry'),{object:()=>{running=false;api.play(false);show();return api.object();},unitsPerMetre:1,scale:'table',qr:false,maxTriangles:90000,title:'First Shift · illustrative café',label:'Place café in AR',note:false,key:()=>`${api.graphics()}:${selected}:${api.minutes()}`,onReport:report=>{q('#shift-export-report').textContent=`Static tabletop: ${(report.size.x*100).toFixed(1)} × ${(report.size.y*100).toFixed(1)} × ${(report.size.z*100).toFixed(1)} cm. ${report.triangles.toLocaleString('en-NZ')} triangles. Geometry may be simplified.`;}});
    for(const format of ['glb','usdz']){const button=document.createElement('button');button.textContent=`Download ${format.toUpperCase()}`;button.onclick=async()=>{button.disabled=true;button.textContent='Preparing…';try{const blob=await controller.files(format),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`first-shift-illustrative.${format}`;link.click();setTimeout(()=>URL.revokeObjectURL(url),60000);button.textContent=`Download ${format.toUpperCase()}`;}catch{button.textContent='Export unavailable · retry';}finally{button.disabled=false;}};q('#shift-downloads').append(button);}
  }).catch(()=>{q('#shift-ar-entry').textContent='AR unavailable';});
}
