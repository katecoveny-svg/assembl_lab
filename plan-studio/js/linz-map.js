import {parseSitePoint,loadLinzContext} from './linz-context.js';
const NS='http://www.w3.org/2000/svg';
const safe=(p)=>Array.isArray(p)&&p.length>=2&&p.slice(0,2).every(Number.isFinite);
const polys=(g)=>g.type==='Polygon'?[g.coordinates]:g.type==='MultiPolygon'?g.coordinates:[];
export function outlinePath(collection,{lat,lon}) {
  const xscale=111320*Math.cos(lat*Math.PI/180),yscale=111320;
  return collection.features.flatMap(f=>polys(f.geometry)).flatMap(p=>
    p.filter(r=>Array.isArray(r)&&r.length>=4&&r.every(safe)).map(r=>r.map(([x,y],i)=>(i?'L':'M')+
      ((x-lon)*xscale).toFixed(2)+','+((lat-y)*yscale).toFixed(2)).join(' ')+' Z')).join(' ');
}
const pane=globalThis.document?.getElementById('linzSitePreview');
if(pane){
  const form=pane.querySelector('form'),out=pane.querySelector('output'),svg=pane.querySelector('svg'),btn=form.querySelector('button');
  const groups=[pane.querySelector('[data-geometry=parcels]'),pane.querySelector('[data-geometry=buildings]')];
  form.onsubmit=async e=>{
    e.preventDefault();btn.disabled=true;svg.setAttribute('hidden','');
    try{
      const point=parseSitePoint(form.elements.point.value);out.textContent='Loading LINZ parcels and roof outlines…';
      const context=await loadLinzContext(point,{radius:75});
      for(const [i,key] of ['parcels','buildings'].entries()){
        groups[i].replaceChildren();
        for(const f of context[key].features){
          const path=document.createElementNS(NS,'path');path.setAttribute('d',outlinePath({features:[f]},point));groups[i].append(path);
        }
      }
      svg.toggleAttribute('hidden',!(context.parcels.features.length||context.buildings.features.length));
      out.textContent=context.parcelStatus+' · '+context.buildingStatus+
        (context.capturedThrough?' · Latest outline imagery '+context.capturedThrough:'')+
        (context.parcelLayerDate?' · Parcel layer edited '+context.parcelLayerDate:'');
    }catch(e){out.textContent=e.message;}
    finally{btn.disabled=false;}
  };
}
