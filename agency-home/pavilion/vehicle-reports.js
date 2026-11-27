// Share one public feed between the lightweight homepage report and the visible city.
const lab='https://lab.assembl.co.nz/auckland/live/';
const endpoint='https://wurwcrgxjjwqdaxqceey.supabase.co/functions/v1/bus-positions';
const colours={bus:'#b66143',train:'#52736f',ferry:'#507c98'};
// Public station points from the same Auckland Transport GTFS catalogue (23 Nov 2026, CC BY 4.0).
const stationPoints=[
  ["Grafton Bridge", -36.85899, 174.76336],
  ["Newmarket Station", -36.86972, 174.77883],
  ["Kingsland Station", -36.8725, 174.74453],
  ["Te Waihorotiu Station", -36.84961, 174.76299],
  ["Karanga-a-Hape Station", -36.85816, 174.75879],
  ["Waitematā Station", -36.84431, 174.76869],
  ["Maungawhau Station", -36.86746, 174.75838],
  ["Parnell Station", -36.85472, 174.77739],
  ["Takapuna", -36.78737, 174.77076],
  ["Akoranga Bus Station", -36.79723, 174.7608],
  ["Downtown Ferry Terminal", -36.84269, 174.76704],
  ["Bayswater Wharf", -36.8222, 174.76633],
  ["Birkenhead Wharf", -36.82281, 174.73393],
  ["Devonport Wharf", -36.83317, 174.7954],
  ["Hamer Street Ferry Terminal", -36.83816, 174.75538],
];
let catalogue, last, timer, running=false;
const readers=new Map();
async function loadCatalogue() {
  if(!catalogue) {
    catalogue=Promise.all([
      import(lab+'transit.js'),
      fetch(lab+'data/routes.json',{signal:AbortSignal.timeout(15000)}).then(r=>{
        if(!r.ok)throw Error('Route catalogue unavailable');
        return r.json();
      })
    ]).then(([logic,data])=>({logic,routes:new Map(data.routes.map(r=>[r.id,r])),
      places:stationPoints.map(([name,lat,lon])=>({name,...logic.toWorld(lat,lon)}))}))
      .catch(error=>{catalogue=null;throw error;});
  }
  return catalogue;
}
function delay() {return Math.min(...readers.values());}
function queue() {
  clearTimeout(timer);
  if(!readers.size||running)return;
  timer=setTimeout(refresh,Math.max(0,delay()-(Date.now()-(last?.checked||0))));
}
async function refresh() {
  if(running||!readers.size)return;
  running=true;
  try {
    const [{logic,routes,places},response]=await Promise.all([
      loadCatalogue(),fetch(endpoint,{cache:'no-store',signal:AbortSignal.timeout(15000)})
    ]);
    if(!response.ok)throw Error('No position report');
    const now=Date.now()/1000;
    const vehicles=[];
    for(const v of logic.parsePositions(await response.json()).vehicles){
      const age=now-v.ts, route=routes.get(v.routeId);
      if(!route||!v.id||!v.ts||age>=180||age< -30||!logic.inArea(v.lat,v.lon))continue;
      const mode=logic.modeOf(route.type);
      const position=logic.toWorld(v.lat,v.lon);
      let nearby=null,closest=300;
      for(const place of places){
        const metres=Math.hypot(place.x-position.x,place.z-position.z);
        if(metres<closest){nearby=place.name;closest=metres;}
      }
      vehicles.push({...v,...position,nearby,mode,route:route.short||v.routeId,
        heading:v.bearing===null?null:v.bearing*Math.PI/180,colour:colours[mode]});
    }
    last={checked:Date.now(),available:true,vehicles};
  }catch{
    last={checked:Date.now(),available:false,vehicles:[]};
  }finally{
    running=false;
    for(const receive of readers.keys())receive(last);
    queue();
  }
}
export function subscribeReports(receive,interval=30000) {
  readers.set(receive,interval);
  if(last && Date.now()-last.checked < interval)receive(last);
  queue();
  return ()=>{readers.delete(receive);queue();};
}
