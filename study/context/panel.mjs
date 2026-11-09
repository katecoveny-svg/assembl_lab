import {CITIES,createWeatherAdapter,syntheticWeather,manualWeather,freshness} from './weather.mjs';
let serial=0;
/** Reusable contextual display. It never writes into a lesson or AR model. */
export function mountWeatherContext(host,{adapter=createWeatherAdapter(),clock=Date.now}={}){
 const id='context-'+(++serial);let record=null,generation=0;
 host.classList.add('study-context');host.setAttribute('aria-label','Weather context for cooling');
 host.innerHTML=`<h2>Would a hot drink cool differently outside?</h2><p>The model starts the drink at <b>92°C</b> in an <b>18°C</b> room. Outdoor weather is not a classroom measurement.</p>
 <div class="context-grid"><label>Public reference city<select data-city>${Object.entries(CITIES).map(([key,name])=>`<option value="${key}">${name}</option>`).join('')}</select></label><div><button type="button" data-live aria-describedby="${id}-live">Check shared weather</button><p class="context-note" id="${id}-live"></p></div></div>
 <p class="context-note">City only: no device location or names. Weather does not change the model.</p>
 <details><summary>Use a synthetic example</summary><p>Invented values for practising source checks. These are not Google data or live weather.</p><label>Example type<select data-scenario><option value="current">Current-type example</option><option value="forecast">Forecast example</option><option value="stale">Stale example</option><option value="unavailable">Unavailable example</option></select></label><button type="button" data-example>Show example</button></details>
 <details><summary>Enter a value manually</summary><form><div class="context-grid"><label>Temperature (°C)<input name="temperature" type="number" min="-50" max="60" step="0.1" required></label><label>Value describes<select name="kind"><option value="current">Current-type conditions</option><option value="forecast">A forecast</option></select></label><label>Value date and time (device timezone)<input name="time" type="datetime-local" required></label></div><p class="context-note">Use a teacher-supplied value or your own thermometer reading. Manual entries are unverified. Do not enter names or precise locations.</p><button type="submit">Use manual value</button></form></details>
 <div class="context-data" role="status" aria-live="polite" data-output></div>
 <details class="context-investigation"><summary>Try a cooling comparison</summary><p><b>Predict:</b> If the air around the same mug is cooler than 18°C, what would you expect at the start, with other conditions held the same?</p><fieldset><legend>Choose an explanation</legend><label><input type="radio" name="${id}-reason" value="gap">A larger temperature difference tends to increase the initial cooling rate.</label><label><input type="radio" name="${id}-reason" value="forecast">The weather value gives the exact cooling time.</label></fieldset><button type="button" data-check>Check explanation</button><p role="status" data-feedback></p>
 <p class="context-note">This is a conditional comparison, not a weather-calibrated experiment. Wind, the container, its lid and evaporation also matter. A forecast is a prediction, and modelled current conditions need not be a weather-station observation.</p></details>`;
 const q=s=>host.querySelector(s),city=()=>q('[data-city]').value,output=q('[data-output]');
 q('[data-live]').disabled=!adapter.enabled;q('#'+id+'-live').textContent=adapter.enabled?'At most two explicit requests per page, at least 60 seconds apart. No automatic refresh.':'Live weather is not connected. Examples and manual entry work below.';
 const stamp=x=>new Intl.DateTimeFormat('en-NZ',{dateStyle:'medium',timeStyle:'short',timeZone:'Pacific/Auckland'}).format(new Date(x))+' (Pacific/Auckland)';
 function message(value){record=null;output.replaceChildren();const p=document.createElement('p');p.textContent=value;output.append(p)}
 function render(){if(!record)return;output.replaceChildren();const add=(text,cls)=>{const p=document.createElement('p');p.textContent=text;if(cls)p.className=cls;output.append(p);return p};
  add(CITIES[record.city]+' · '+record.temperatureC.toFixed(1)+'°C');
  add(record.provider==='synthetic'?'SYNTHETIC EXAMPLE — not live or measured':record.provider==='manual'?'MANUAL ENTRY — unverified':'MODELLED WEATHER — not necessarily a station observation');
  add(freshness(record,clock())+' · value time '+stamp(record.validAt));
  add((record.provider==='google-weather'?'Received':record.provider==='manual'?'Entered':'Example generated')+' '+stamp(record.receivedAt),'context-source');
  if(record.provider==='google-weather'){add('Google Maps','context-google').setAttribute('translate','no');add('Source: Includes weather data from Google.','context-source');record.attributions.forEach(x=>add(x,'context-source'));add(record.issuedAt?'Source issue time '+stamp(record.issuedAt):'Source issue time not provided.','context-source')}
  else add('Source: '+(record.provider==='synthetic'?'Assembl invented teaching fixture.':'Manual classroom value; source issue time unknown.'),'context-source');
 }
 function set(value){if(value.status){message(value.message);return}record=value;render()}
 q('[data-city]').onchange=()=>{generation++;message('City changed. Choose a new example or enter a value; no weather request was sent.')};
 q('[data-example]').onclick=()=>{generation++;set(syntheticWeather(city(),q('[data-scenario]').value,clock()))};
 q('form').onsubmit=e=>{e.preventDefault();generation++;try{set(manualWeather(city(),q('[name=temperature]').value,q('[name=kind]').value,q('[name=time]').value,clock()))}catch(error){message(error.message)}};
 q('[data-live]').onclick=async()=>{const token=++generation;message('Requesting current context…');const result=await adapter.request(city());if(token!==generation)return;if(result.status==='ready')set(result.data);else set(result)};
 q('[data-check]').onclick=()=>{const pick=q('input[type=radio]:checked');q('[data-feedback]').textContent=!pick?'Choose an explanation first.':pick.value==='gap'?'Yes, under the same conditions a larger temperature difference tends to make initial heat transfer faster. Outdoor weather does not establish the temperature around an indoor mug.':'Weather alone cannot determine the cooling time. You would also need the container, surroundings and heat-transfer behaviour; the lesson’s cooling constants are illustrative.'};
 const refresh=()=>{if(record?.provider==='google-weather'&&clock()-Date.parse(record.receivedAt)>300000)message('Weather display expired. Request again if available, or use manual entry.');else render()};
 let timer=setInterval(refresh,60000);
 const resume=()=>{if(!timer)timer=setInterval(refresh,60000)};window.addEventListener('pageshow',resume);
 const clear=()=>{generation++;message('Context cleared. Choose an example or enter a value.');clearInterval(timer);timer=null};window.addEventListener('pagehide',clear,{once:true});
 message('No weather loaded. Choose a labelled example or enter a value.');
 return {destroy(){clear();host.replaceChildren();window.removeEventListener('pagehide',clear);window.removeEventListener('pageshow',resume)}};
}
