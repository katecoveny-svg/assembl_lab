// Narrow, deterministic commands over the canonical Plan Studio model. No agent scripts run,
// no file leaves the browser, and preview operates only on a snapshot.
import { openingRooms, snapshot } from "./model.js";

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
// Both lanes use the same local window, in canonical wall millimetres.
// Keep the selected change large enough to see without implying it is the whole wall.
export function doorDetail(P,id,nextAt) {
  const o=P.openings.find(x=>x.id===id),w=o&&P.walls.find(x=>x.id===o.wall);
  if(!o||!w)return null;
  const total=length(w), at=Number.isFinite(nextAt)?nextAt:o.at;
  if(!Number.isFinite(total)||total<=0)return null;
  const size=Math.min(total,Math.max(2800,o.w*3.5,Math.abs(at-o.at)+o.w*2.25)),mid=(o.at+at)/2;
  const start=Math.max(0,Math.min(total-size,mid-size/2)), end=start+size;
  return {w,o,total,start,end,at};
}

export function doorCompareSvg(P,id,nextAt) {
  const detail=doorDetail(P,id,nextAt);if(!detail)return "";
  const {w,o,start,end,at}=detail,active=Number.isFinite(nextAt)&&nextAt!==o.at;
  const x=d=>+(28+(d-start)/(end-start)*584).toFixed(2),from=x(o.at),to=x(at),direction=Math.sign(at-o.at),distance=Math.abs(at-o.at);
  const lane=(y,where,proposed)=>{
    const gaps=P.openings.filter(a=>a.wall===o.wall).map(a=>[...pos(a.id===id?{...a,at:where}:a),a.id]).sort((a,b)=>a[0]-b[0]);
    let segments="",from=start;
    const slab=(a,b)=>`<rect x="${x(a)}" y="${y-11}" width="${Math.max(0,x(b)-x(a))}" height="22" rx="2" fill="url(#doorWallFill)" />`;
    for(const [a,b,who] of gaps){
      if(b<=start||a>=end)continue;
      const lo=Math.max(start,a),hi=Math.min(end,b);
      if(lo>from)segments+=slab(from,lo);
      if(who!==o.id)segments+=`<path d="M${x(lo)},${y}H${x(hi)}" stroke="#8b7079" stroke-width="2" stroke-dasharray="3 4"/>`;
      from=Math.max(from,hi);
    }
    if(from<end)segments+=slab(from,end);
    const [a,b]=pos({...o,at:where}),ink=proposed?"#654a4e":"#a87c89";
    const outline=a<start||b>end?"":`<rect x="${x(a)}" y="${y-12}" width="${x(b)-x(a)}" height="24" rx="3" fill="${proposed?"#dcc2c7":"#f1e1e4"}" stroke="${ink}" stroke-width="2" ${proposed?"":'stroke-dasharray="4 3"'} />`;
    return segments+outline+`<circle cx="${x(where)}" cy="${y}" r="7" fill="${ink}" stroke="#fffdfb" stroke-width="2"/>`;
  };
  const arrow=active?`<path d="M${from},74V100H${to}V126" stroke="#654a4e" fill="none" stroke-width="1.5" stroke-dasharray="3 3"/><path d="M${to-7*direction},96L${to},100L${to-7*direction},104" stroke="#654a4e" stroke-width="2" fill="none"/>`:"";
  return `<svg viewBox="0 0 640 191" role="img" aria-label="Wall ${safe(w.id)} detail, door ${safe(id)}: original ${o.at} millimetres${active?", proposed "+at+" millimetres, move "+distance+" millimetres "+(direction>0?"toward wall end":"toward wall start"):""}.">
    <defs><pattern id="doorWallFill" width="7" height="7" patternUnits="userSpaceOnUse"><rect width="7" height="7" fill="#a48c97"/><path d="M0,7L7,0" stroke="#b49ca6" stroke-width="1.3"/></pattern></defs>
    <rect width="640" height="191" fill="#fffdfb"/><path d="M28,61H612M28,141H612" stroke="#e6d3d7" stroke-dasharray="2 3"/>
    <text x="28" y="30" fill="#654a4e" font-size="20" font-family="system-ui" font-weight="600">Original</text>
    <text x="612" y="30" fill="#654a4e" text-anchor="end" font-size="20" font-family="system-ui">${o.at.toLocaleString("en-NZ")} mm</text>
    ${lane(62,o.at,false)}
    <text x="28" y="112" fill="#654a4e" font-size="20" font-family="system-ui" font-weight="600">${active?"Proposed":"Choose a position"}</text>
    ${active?`<text x="612" y="112" fill="#654a4e" text-anchor="end" font-size="20" font-family="system-ui">${at.toLocaleString("en-NZ")} mm</text>`:""}
    ${lane(142,at,true)}${arrow}
    <path class="door-guide" d="M0,121V163" stroke="#654a4e" stroke-width="2" opacity="0" transform="translate(0 0)"/>
    <text x="28" y="178" fill="#654a4e" font-size="15" font-family="system-ui">WALL DETAIL · ${Math.round(start).toLocaleString("en-NZ")}–${Math.round(end).toLocaleString("en-NZ")} mm</text>
  </svg>`;
}

export function detailPosition(detail,svgX) {
  if(!detail||!Number.isFinite(svgX))return null;
  const x=Math.max(0,Math.min(1,(svgX-28)/584));
  return Math.round((detail.start+x*(detail.end-detail.start))/50)*50;
}
