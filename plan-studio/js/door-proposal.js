// Narrow, deterministic commands over the canonical Plan Studio model. No agent scripts run,
// no file leaves the browser, and preview operates only on a snapshot.
import { openingRooms, openingSpan, snapshot } from "./model.js";

const door = o => o && ["door","door-double"].includes(o.kind);
const pos = o => [o.at-o.w/2,o.at+o.w/2];
const length = w => Math.hypot(w.b[0]-w.a[0],w.b[1]-w.a[1]);
const cross=(a,b)=>a[0]*b[1]-a[1]*b[0];
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1]];
const scale=(a,s)=>a.map(x=>x*s);
export function distanceMm(raw,unit) {
  const val=String(raw??"").trim();
  if(!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(val)||!["m","mm"].includes(unit))return null;
  const m=Number(val)*(unit==="m"?1000:1);
  return Number.isSafeInteger(Math.round(m)) && Math.abs(m-Math.round(m))<1e-5 ? Math.round(m):null;
}
export const doorModelStamp=P=>JSON.stringify([P.revisions?.length??0,P.revisions?.at(-1)?.rev??"",snapshot(P)]);
const rooms=(P,o)=>openingRooms(P,o).map(r=>r?.name||"Outside / unlabelled").join(" ↔ ");

function fit(P,opening,wall,nextAt) {
  const L=length(wall), [lo,hi]=pos({...opening,at:nextAt}), end=wall.t/2;
  if(!Number.isSafeInteger(nextAt)||!Number.isFinite(end)||end<=0||!Number.isFinite(L)||!Number.isFinite(opening.w)||opening.w<=0||lo<end||hi>L-end)
    throw Error("That door does not fit inside the usable wall span.");
  for(const other of P.openings.filter(o=>o.wall===wall.id&&o.id!==opening.id)){
    const [a,b]=pos(other);
    if(!Number.isFinite(a)||!Number.isFinite(b))throw Error("Another opening on this wall needs checking before making a proposal.");
    if(lo<=b&&hi>=a)throw Error("The new position overlaps or touches opening "+other.id+".");
  }
  // Do not cut through a modelled wall junction. This is a geometric guard only.
  const u=scale(sub(wall.b,wall.a),1/L);
  for(const other of P.walls.filter(w=>w.id!==wall.id)){
    const n=length(other); if(!(n>0))continue;
    const v=scale(sub(other.b,other.a),1/n), det=cross(u,v);
    if(Math.abs(det)<.001)continue;
    const d=sub(other.a,wall.a), hit=cross(d,v)/det, along=cross(d,u)/det;
    const footprint=other.t/(2*Math.abs(det)), endTolerance=wall.t/2;
    if(along>=-endTolerance&&along<=n+endTolerance&&hi>hit-footprint&&lo<hit+footprint)
      throw Error("The new position cuts through a junction with wall "+other.id+".");
  }
}

export function proposeDoorMove(P,id,at) {
  const o=P.openings.find(e=>e.id===id);
  if(!door(o))throw Error("Choose a real door, not a window or an empty opening.");
  const w=P.walls.find(w=>w.id===o.wall);
  if(!w)throw Error("This door has no host wall.");
  if(at===o.at)throw Error("Enter a new position to see a change.");
  fit(P,o,w,at);
  const edit=Object.freeze({type:"move-door-on-wall",door:o.id,wall:w.id,from:o.at,to:at});
  const proposed=snapshot(P), o2=proposed.openings.find(x=>x.id===id);o2.at=at;
  return {edit, base:doorModelStamp(P), revision:P.revisions?.at(-1)?.rev||"Unissued",
    before:snapshot(P), after:proposed, roomsBefore:rooms(P,o), roomsAfter:rooms(proposed,o2)};
}

export function applyDoorMove(P,draft) {
  if(draft?.edit?.type!=="move-door-on-wall"||draft.base!==doorModelStamp(P))
    throw Error("The model or issued revision changed. Preview a new proposal before applying.");
  const o=P.openings.find(e=>e.id===draft.edit.door), w=P.walls.find(w=>w.id===draft.edit.wall);
  if(!door(o)||!w||o.wall!==w.id||o.at!==draft.edit.from)
    throw Error("The proposed door no longer matches the model.");
  fit(P,o,w,draft.edit.to);
  if(draft.edit.from===draft.edit.to)throw Error("There is no position change to apply.");
  const before={at:o.at,position_ev:o.position_ev};
  o.at=draft.edit.to;
  o.position_ev={src:"user",conf:1,note:"Person approved move along "+w.id+": "+before.at+" to "+o.at+" mm from wall start. Other drawing evidence was retained."};
  return {door:o.id,before,applied:doorModelStamp(P)};
}

export function undoDoorMove(P,receipt) {
  if(receipt?.applied!==doorModelStamp(P))throw Error("The model or issued revision has changed. Undo cannot overwrite that work.");
  const o=P.openings.find(e=>e.id===receipt.door);
  if(!o||!receipt.before)throw Error("No door move is available to undo.");
  o.at=receipt.before.at;
  if(receipt.before.position_ev===undefined)delete o.position_ev;else o.position_ev=receipt.before.position_ev;
}

const safe=s=>String(s).replace(/[<>"&]/g,c=>({"<":"&lt;",">":"&gt;",'"':"&quot;","&":"&amp;"})[c]);
export function wallPreviewSvg(P,edit,label) {
  const w=P.walls.find(w=>w.id===edit.wall),o=P.openings.find(o=>o.id===edit.door), span=openingSpan(P,o);
  const L=length(w), px=mm=>+((mm/L)*430+25).toFixed(2);
  const project=p=>(p[0]-w.a[0])*span.d[0]+(p[1]-w.a[1])*span.d[1];
  const gaps=P.openings.filter(a=>a.wall===w.id).map(a=>[...pos(a),a.id]).sort((a,b)=>a[0]-b[0]);
  let mat="",start=0;
  for(const [a,b,id] of [...gaps,[L,L,undefined]]) {
    if(a>start)mat+=`<rect x="${px(start)}" y="38" width="${px(a)-px(start)}" height="11" rx="1" fill="#a69195"/>`;
    if(id && id!==o.id)mat+=`<line x1="${px(a)}" x2="${px(b)}" y1="44" y2="44" stroke="#785c64" stroke-dasharray="2 3"/>`;
    start=Math.max(start,b);
  }
  return `<svg viewBox="0 0 480 106" role="img" aria-label="${safe(label)}, door ${safe(o.id)} on wall ${safe(w.id)}, centre ${o.at} millimetres from start">
    <rect width="480" height="106" fill="#fffdfb"/>
    <line x1="25" x2="455" y1="76" y2="76" stroke="#a69195"/>
    <line x1="25" x2="25" y1="72" y2="81" stroke="#a69195"/><line x1="455" x2="455" y1="72" y2="81" stroke="#a69195"/>
    ${mat}
    <line x1="${px(project(span.a))}" x2="${px(project(span.b))}" y1="43.5" y2="43.5" stroke="#654a4e" stroke-width="6"/>
    <circle cx="${px(o.at)}" cy="43.5" r="5" fill="#fffdfb" stroke="#654a4e" stroke-width="2"/>
    <line x1="${px(o.at)}" x2="${px(o.at)}" y1="50" y2="79" stroke="#654a4e" stroke-dasharray="2 2"/>
    <text x="25" y="94" fill="#654a4e" font-size="11" font-family="system-ui">START · 0</text>
    <text x="455" y="94" text-anchor="end" fill="#654a4e" font-size="11" font-family="system-ui">END · ${Math.round(L)} mm</text>
    <text x="${Math.max(61,Math.min(418,px(o.at)))}" y="25" text-anchor="middle" fill="#654a4e" font-size="13" font-family="system-ui" font-weight="600">${safe(o.id)} · ${o.at} mm</text>
  </svg>`;
}
