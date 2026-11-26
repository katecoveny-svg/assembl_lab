// Transverse Mercator on GRS80, as LINZ defines NZTM: central meridian 173°E, scale 0.9996, false E 1 600 000, false N 10 000 000.
const A = 6378137, F = 1 / 298.257222101, K0 = 0.9996, LON0 = 173, FE = 1600000, FN = 10000000;
const E2 = F * (2 - F), EP2 = E2 / (1 - E2), RAD = Math.PI / 180;
function arc(phi) {
  const e4 = E2 * E2, e6 = e4 * E2;
  return A * ((1 - E2 / 4 - 3 * e4 / 64 - 5 * e6 / 256) * phi - (3 * E2 / 8 + 3 * e4 / 32 + 45 * e6 / 1024) * Math.sin(2 * phi)
    + (15 * e4 / 256 + 45 * e6 / 1024) * Math.sin(4 * phi) - (35 * e6 / 3072) * Math.sin(6 * phi));
}
function toNZTM(lat, lon) {
  const phi = lat * RAD, s = Math.sin(phi), c = Math.cos(phi), t = Math.tan(phi);
  const n = A / Math.sqrt(1 - E2 * s * s), T = t * t, C = EP2 * c * c, Aa = (lon - LON0) * RAD * c, M = arc(phi);
  const E = FE + K0 * n * (Aa + (1 - T + C) * Aa ** 3 / 6 + (5 - 18 * T + T * T + 72 * C - 58 * EP2) * Aa ** 5 / 120);
  const N = FN + K0 * (M + n * t * (Aa * Aa / 2 + (5 - T + 9 * C + 4 * C * C) * Aa ** 4 / 24 + (61 - 58 * T + T * T + 600 * C - 330 * EP2) * Aa ** 6 / 720));
  return [E, N];
}

const map = document.querySelector('.ak-map');
const fixes = map.querySelector('.ak-fixes');
const status = document.querySelector('#ak-status');
const trip = document.querySelector('#ak-trip');
const liveURL = 'https://lab.assembl.co.nz/auckland/live/';
const endpoint = 'https://wurwcrgxjjwqdaxqceey.supabase.co/functions/v1/bus-positions';
let next, controller, inView = false, selected = '';
const board = document.createElement('div');
board.className = 'ak-board';
board.append(map.firstElementChild, fixes);
map.append(board);

function report(rows) {
  const active = document.activeElement?.dataset.vehicle;
  const buttons = rows.map(({vehicle, x, y}) => {
    const btn = document.createElement('button');
    const route = vehicle.route_id.split('-')[0];
    const been = new Intl.DateTimeFormat('en-NZ',{timeZone:'Pacific/Auckland',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(vehicle.timestamp * 1000);
    btn.type = 'button';
    btn.dataset.vehicle = vehicle.vehicle_id;
    btn.textContent = route;
    btn.style.left = x*100+'%';
    btn.style.top = y*100+'%';
    btn.setAttribute('aria-label', 'Route '+route+', reported '+been);
    btn.setAttribute('aria-pressed', String(selected === vehicle.vehicle_id));
    btn.onclick = () => {
      selected = vehicle.vehicle_id;
      for (const mark of fixes.children) mark.setAttribute('aria-pressed',String(mark === btn));
      status.textContent = 'Route '+route+' · last reported at '+been+' Auckland time';
      const url = new URL(liveURL);
      url.searchParams.set('route',route);
      trip.href = url.href;
      trip.textContent = 'See route '+route+' ↗';
    };
    return btn;
  });
  fixes.replaceChildren(...buttons);
  if(active) buttons.find(b=>b.dataset.vehicle===active)?.focus({preventScroll:true});
  const current = buttons.find(b=>b.dataset.vehicle===selected);
  if(current){current.click();return}
  selected = '';
  trip.href = liveURL;
  trip.textContent = 'Open Auckland Live ↗';
  status.textContent = rows.length ? rows.length+' recent vehicle reports · select a route on the aerial.' : 'No recent vehicle reports in this part of the waterfront.';
}

async function refresh() {
  if(!inView || document.hidden)return;
  controller = new AbortController();
  const request = controller;
  const timeout = setTimeout(()=>request.abort(),8500);
  try{
    const res = await fetch(endpoint,{cache:'no-store',signal:request.signal});
    if(!res.ok)throw Error('Feed unavailable');
    const {vehicles} = await res.json();
    const now = Date.now()/1000;
    const rows = [];
    for(const vehicle of vehicles){
      const age = now-vehicle.timestamp;
      if(!vehicle.route_id || !(age>=-30 && age<=180))continue;
      const [e,n] = toNZTM(vehicle.latitude,vehicle.longitude);
      const x = (e-1756960)/1440, y = (5921520-n)/1440;
      const edge=Math.max(.03,(1-map.clientHeight/map.clientWidth)/2+.025);
      if(x>.03 && x<.97 && y>edge && y<1-edge) rows.push({vehicle,x,y});
    }
    if(request===controller)report(rows);
  }catch{
    if(request===controller){report([]);status.textContent='Vehicle feed unavailable. Search by route to open Auckland Live.'}
  }finally{
    clearTimeout(timeout);
    if(request===controller && inView && !document.hidden)next=setTimeout(refresh,20000);
  }
}
function visibility(){
  clearTimeout(next);
  const previous=controller;controller=null;previous?.abort();
  if(inView&&!document.hidden)refresh();
}
new IntersectionObserver(([entry])=>{inView=entry.isIntersecting;visibility()}).observe(map);
document.addEventListener('visibilitychange',visibility);

const motion = matchMedia('(prefers-reduced-motion: reduce)');
const heads = document.querySelectorAll('#homes-title,#garden-title,.transport h3,#tides h3,#contact h2');
const reveals = new IntersectionObserver(entries=>{
  for(const entry of entries){
    if(!entry.isIntersecting)continue;
    if(!motion.matches)entry.target.animate([
      {clipPath:'inset(0 0 100% 0)',transform:'translateY(.24em)'},
      {clipPath:'inset(-12% 0 -12% 0)',transform:'translateY(0)'}
    ],{duration:760,easing:'cubic-bezier(.18,.72,.24,1)'});
    reveals.unobserve(entry.target);
  }
});
heads.forEach(el=>reveals.observe(el));
