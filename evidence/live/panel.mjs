import {createQuakeSession,liveStatus,MIN_INTERVAL} from './geonet.mjs';
const format=time=>new Date(time).toLocaleString('en-NZ',{timeZone:'Pacific/Auckland',dateStyle:'medium',timeStyle:'short'})+' NZ time';
class GeoNetContext extends HTMLElement {
 connectedCallback(){
  if(this.session)return;
  const root=this.attachShadow({mode:'open'});
  root.innerHTML=`<style>
   :host{display:block;margin:32px 0;font-family:'Instrument Sans',system-ui,sans-serif;text-align:left;color:#f9f6f2;line-height:1.6}*{box-sizing:border-box}section{padding:clamp(20px,4vw,36px);border-radius:20px;background:#21121f;border:1px solid #765461}h2{font-size:clamp(24px,4vw,34px);line-height:1.2;font-weight:500;margin:8px 0 18px}p{margin:12px 0;font-size:15px}button{font:inherit;font-size:15px;border:1px solid #d8a7b1;border-radius:28px;padding:12px 20px;background:#d8a7b1;color:#21121f;cursor:pointer;min-height:44px}button:disabled{opacity:.65;cursor:default}a{color:#e4bbc4;text-underline-offset:3px}a:focus-visible,button:focus-visible{outline:3px solid #f9f6f2;outline-offset:4px}.eyebrow,.status{color:#e4bbc4}.eyebrow{font-size:12px;letter-spacing:.1em}ol{padding:0;list-style:none}li{border-top:1px solid #765461;padding:18px 0;overflow-wrap:anywhere}li p{margin:5px 0}b{font-weight:600}.limits{font-size:13px;color:#e5d7df}.actions{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.status{font-size:14px}details{margin-top:20px}summary{cursor:pointer;min-height:44px;padding:8px 0}
   </style><section aria-label="GeoNet source context"><p class="eyebrow">OBSERVATIONS / SIMULATED MODEL</p><h2>Compare the model with real earthquakes.</h2><p>Check recent potentially felt earthquakes in the New Zealand region. Compare their magnitudes and depths: what else would you need to explain shaking at a particular place?</p><p><b>The model and its scenario results remain simulated.</b> These national records do not establish shaking, damage or safety at this site or in Auckland.</p><div class="actions"><button type="button">Check GeoNet</button><span class="status" role="status">Not requested</span></div><p class="checked">No request yet. No account or location access needed.</p><ol aria-label="Recent earthquake observations"></ol><details><summary>Source, licence and limits</summary><p>Earth Sciences New Zealand / GeoNet and sponsors NHC, LINZ, NEMA and MBIE. <a href="https://www.geonet.org.nz/policy">CC BY 3.0 NZ · policy and disclaimer</a>.</p><p>GeoNet MMI ≥3 query; at most 20 recent valid events from the last year, excluding deleted records. The three newest are shown here. Not a complete catalogue. Magnitude is earthquake size; it is not shaking intensity at your location. Values may be revised.</p><p>Event times are origin times; checked time is retrieval time. This panel becomes stale after five minutes. Requests are manual, at most once per minute, with a 12-second timeout. Leaving the tab cancels an unfinished request. No automatic polling or saved-snapshot fallback.</p><p><a href="https://api.geonet.org.nz/">API documentation</a> · <a href="https://www.geonet.org.nz/earthquake">Read at GeoNet</a>. For learning only, not a warning service. Follow <a href="https://getready.govt.nz/">official emergency guidance</a>.</p></details></section>`;
  this.button=root.querySelector('button');this.status=root.querySelector('.status');this.checked=root.querySelector('.checked');this.list=root.querySelector('ol');this.lastAttempt=-Infinity;
  this.session=createQuakeSession({onChange:()=>this.render()});
  this.button.onclick=()=>{if(document.hidden)return;this.lastAttempt=Date.now();this.session.refresh();};
  this.visibility=()=>{if(document.hidden){this.session.pause();clearInterval(this.timer);}else{this.render();this.startTimer();}};
  document.addEventListener('visibilitychange',this.visibility);this.startTimer();this.render();
 }
 startTimer(){clearInterval(this.timer);if(!document.hidden)this.timer=setInterval(()=>this.render(),1000);}
 render(){
  const state=this.session.state,status=liveStatus(state);if(this.status.textContent!==status)this.status.textContent=status;
  const remaining=Math.max(0,Math.ceil((MIN_INTERVAL-(Date.now()-this.lastAttempt))/1000));
  this.button.disabled=state.loading||remaining>0;this.button.textContent=state.loading?'Checking…':remaining?`Check again in ${remaining}s`:'Check GeoNet';
  this.checked.textContent=state.retrievedAt?`Last successful check: ${format(state.retrievedAt)}. ${state.records.length} non-deleted records in this bounded response.`:'No successful response yet. No replacement values supplied.';
  // Keep links/focus stable while only the freshness clock changes.
  const key=state.retrievedAt;if(this.renderedKey===key)return;this.renderedKey=key;this.list.replaceChildren();
  for(const r of state.records.slice(0,3)){
   const q=r.value,li=document.createElement('li'),title=document.createElement('b'),p=document.createElement('p'),time=document.createElement('p'),a=document.createElement('a');
   title.textContent=`M ${q.mag.toFixed(1)} · ${q.locality}`;p.textContent=`Depth ${q.depth.toFixed(1)} km · quality: ${q.quality}`;time.textContent=`Event: ${format(r.observedAt)}`;a.href=r.source.url;a.textContent='Source earthquake ↗';li.append(title,p,time,a);this.list.append(li);
  }
  if(state.retrievedAt&&!state.records.length){const li=document.createElement('li');li.textContent='No non-deleted events returned in this bounded response. This does not establish absence of earthquakes.';this.list.append(li);}
 }
 disconnectedCallback(){this.session?.pause();clearInterval(this.timer);document.removeEventListener('visibilitychange',this.visibility);}
}
customElements.define('geonet-context',GeoNetContext);
