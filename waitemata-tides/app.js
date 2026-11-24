const el = id => document.getElementById(id);
const dateFormat = new Intl.DateTimeFormat('en-NZ', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const localFormat = new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland', year:'numeric', month:'2-digit', day:'2-digit' });
const inAuckland = () => {
  const parts = Object.fromEntries(localFormat.formatToParts(new Date()).map(p => [p.type,p.value]));
  return [parts.year, parts.month, parts.day].join('-');
};
const dateText = date => dateFormat.format(new Date(date + 'T12:00:00Z'));
const stepDay = (day, n) => new Date(Date.parse(day+'T12:00:00Z') + n*86400000).toISOString().slice(0,10);
const wave = '<svg class="icon" aria-hidden="true" viewBox="0 0 64 32" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M1 14Q9 5 17 14T33 14T49 14T65 14M1 21Q9 12 17 21T33 21T49 21T65 21"/></svg>';
let days, dates, all, selectedDate, selectedIndex = 0, scene, sceneTask, sceneOpen = false;
let settledDay = inAuckland();
function showNext() {
  const now = Date.now()/1000;
  if (now < all[0].epoch && inAuckland() < dates[0] || now >= all.at(-1).epoch) {
    el('nextcards').innerHTML = '<p>No upcoming predictions in the published coverage. <a href="tables/">Browse the archive</a> or check the original LINZ tables.</p>';
    return;
  }
  el('nextcards').innerHTML = ['High','Low'].map(kind => {
    const next = all.find(event => event.kind === kind && event.epoch > now);
    if (!next) return '<article class="card"><strong>Next '+kind.toLowerCase()+'</strong><p>No further published event.</p></article>';
    return '<article class="card '+kind.toLowerCase()+'">'+wave+'<span class="dir">Next '+kind.toLowerCase()+' tide</span><div class="cardtime"><span class="clock">'+next.clock+'</span><small>'+next.zone+'</small></div><p class="cardline"><b>'+next.height+' m</b> '+dateText(next.date)+'</p></article>';
  }).join('');
}
function drawGraph(records) {
  const x = clock => { const [h,m] = clock.split(':').map(Number); return 40+(h+m/60)*24; };
  const y = height => 143 - Number(height)*28;
  const points = records.map(([clock,height])=>[x(clock),y(height)]);
  const grid = [0,1,2,3,4].map(m => '<path d="M40 '+y(m)+'h576" stroke="#dce5df"/><text x="25" y="'+(y(m)+4)+'" text-anchor="end">'+m+'</text>').join('');
  const axis = [0,6,12,18,24].map(h=>'<text x="'+(40+h*24)+'" y="167" text-anchor="middle">'+String(h).padStart(2,'0')+'</text>').join('');
  let curve = 'M'+points[0].join(' ');
  for (let i=1; i<points.length; i++) {
    const [x0,y0]=points[i-1], [x1,y1]=points[i], half=(x1-x0)/2;
    curve+=' C'+(x0+half)+' '+y0+' '+(x1-half)+' '+y1+' '+x1+' '+y1;
  }
  el('chart').innerHTML = '<g fill="#48636b" font-family="Arial,sans-serif" font-size="15">'+grid+axis+'</g><path fill="#dcece6" opacity=".65" d="'+curve+' L'+points.at(-1)[0]+' 143 L'+points[0][0]+' 143 Z"/><path fill="none" stroke="#187665" stroke-width="2.5" stroke-dasharray="5 4" d="'+curve+'"/>'+points.map(([x,y])=>'<circle cx="'+x+'" cy="'+y+'" r="5" fill="#00685c" stroke="white" stroke-width="1.5"/>').join('');
}
function updateScene() {
  const event = days[selectedDate]?.[selectedIndex];
  if (!event || !scene || !sceneOpen) return;
  scene.setHeight(Number(event[1]));
  el('sceneNote').textContent = event[4]+' tide · '+event[0]+' '+event[3]+' · '+event[1]+' m above Auckland chart datum. Illustrative wharf and shoreline.';
}
function showDay(day) {
  if (!days[day]) {
    el('status').textContent = 'Choose a date between '+dates[0]+' and '+dates.at(-1)+'.';
    el('day').value = selectedDate || dates.at(-1);
    return;
  }
  const records = days[day];
  selectedDate = day;
  selectedIndex = 0;
  el('day').value = day;
  el('prev').disabled = day === dates[0];
  el('next').disabled = day === dates.at(-1);
  el('today').disabled = !days[inAuckland()];
  el('dateLabel').textContent = dateText(day);
  el('rows').innerHTML = records.map(([t,h,_,zone,kind])=>'<tr><td>'+kind+'</td><td>'+t+' '+zone+'</td><td class="num">'+h+' m</td></tr>').join('');
  el('eventChoice').innerHTML = records.map(([t,h,_,zone,kind],i)=>'<option value="'+i+'">'+kind+' · '+t+' '+zone+' · '+h+' m</option>').join('');
  el('status').textContent = dateText(day)+', '+records.length+' published events.';
  drawGraph(records);
  updateScene();
}
function pick(day) {
  if (days[day]) {
    const url = new URL(location.href);
    url.searchParams.set('date',day);
    history.replaceState(null,'',url);
  }
  showDay(day);
}
async function toggleScene() {
  sceneOpen = !sceneOpen;
  el('toggle').setAttribute('aria-expanded', String(sceneOpen));
  el('toggle').textContent = sceneOpen ? 'Close harbour view' : 'Open harbour view ↗';
  el('sceneBox').hidden = !sceneOpen;
  if (!sceneOpen) return;
  el('sceneNote').textContent = 'Opening harbour view…';
  try {
    sceneTask ??= import('./harbour.js').then(mod => mod.createHarbour(el('canvasHolder')));
    scene = await sceneTask;
    updateScene();
  } catch {
    sceneTask = null;
    el('sceneNote').textContent = '3D is unavailable in this browser. The selected tide is listed above.';
  }
}
try {
  const response = await fetch('./data/events.json');
  if (!response.ok) throw new Error();
  days = await response.json();
  dates = Object.keys(days);
  all = dates.flatMap(date => days[date].map(([clock,height,epoch,zone,kind])=>({date,clock,height,epoch,zone,kind})));
  const requested = new URL(location.href).searchParams.get('date');
  const initial = days[requested] ? requested : days[settledDay] ? settledDay : settledDay < dates[0] ? dates[0] : dates.at(-1);
  showDay(initial);
  showNext();
  el('prev').onclick = ()=>pick(stepDay(selectedDate,-1));
  el('next').onclick = ()=>pick(stepDay(selectedDate,1));
  el('today').onclick = ()=>pick(inAuckland());
  el('day').onchange = event=>pick(event.target.value);
  el('toggle').onclick = toggleScene;
  el('eventChoice').onchange = event=>{selectedIndex=Number(event.target.value);updateScene();};
  function refresh() {
    const today = inAuckland();
    if (today !== settledDay && !new URL(location.href).searchParams.has('date') && days[today]) showDay(today);
    settledDay = today;
    showNext();
  }
  setInterval(refresh, 15000);
  document.addEventListener('visibilitychange',()=>{ if (!document.hidden) refresh(); });
} catch {
  el('nextcards').innerHTML = '<p>Daily predictions could not load. <a href="tables/">Open the monthly tide tables</a>.</p>';
  document.querySelector('.datectrl').hidden = true;
  el('toggle').disabled = true;
}
