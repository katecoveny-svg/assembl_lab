// Public map data for an address already chosen in Drop a Plan. Coordinates are NZTM (east/north metres).
import * as THREE from 'three/webgpu';

type EN = [number, number];
type Polys = { type: 'Polygon'; coordinates: EN[][] } | { type: 'MultiPolygon'; coordinates: EN[][][] };
type Lines = { type: 'LineString'; coordinates: EN[] } | { type: 'MultiLineString'; coordinates: EN[][] };
type Road = { name: string; geometry: Lines };
export type SiteContext = { fetched: string; parcel: EN[][]; parcelStatus: 'read' | 'unavailable'; roofs: EN[][]; property: EN[][]; roads: Road[]; roadStatus: 'read' | 'unavailable'; roofStatus: 'read' | 'unavailable' };

const finitePair = (v: unknown): v is EN => Array.isArray(v) && v.length >= 2 && typeof v[0] === 'number' && typeof v[1] === 'number' && Number.isFinite(v[0]) && Number.isFinite(v[1]) && v[0] > 800000 && v[0] < 2900000 && v[1] > 3500000 && v[1] < 7000000;
const line = (a: unknown): a is EN[] => Array.isArray(a) && a.length >= 2 && a.length <= 16000 && a.every(finitePair);
function polygonRings(p: Polys | null | undefined): EN[][] {
  if (!p || !Array.isArray(p.coordinates)) return [];
  return (p.type === 'Polygon' ? p.coordinates : p.type === 'MultiPolygon' ? p.coordinates.flat(1) : []).filter(line);
}
export async function readSiteContext(lat: number, lon: number, signal: AbortSignal, fetcher: typeof fetch = fetch): Promise<SiteContext | null> {
  try {
    const r = await fetcher('/api/garden-site', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.any([signal, AbortSignal.timeout(14000)]), cache: 'no-store', body: JSON.stringify({ mode: 'context', lat, lon }) });
    if (!r.ok) return null;
    const a = await r.json();
    if (a.crs !== 'EPSG:2193' || !('roads' in a)) return null;
    const roads: Road[] = [];
    for (const row of Array.isArray(a.roads?.lines) ? a.roads.lines.slice(0, 50) : []) {
      const name = typeof row?.name === 'string' ? row.name.trim().slice(0, 100) : '', g = row?.geometry;
      if (name && g?.type === 'LineString' && line(g.coordinates)) roads.push({ name, geometry: g });
      else if (name && g?.type === 'MultiLineString' && Array.isArray(g.coordinates)) roads.push({ name, geometry: { type: 'MultiLineString', coordinates: g.coordinates.filter(line).slice(0, 30) } });
    }
    return { fetched: new Date().toISOString().slice(0, 10), parcel: polygonRings(a.parcel), parcelStatus:a.parcelStatus==='unavailable'?'unavailable':'read',
      roofs: (Array.isArray(a.buildings) ? a.buildings : []).slice(0, 60).flatMap(polygonRings),
      property: (Array.isArray(a.property?.outlines) ? a.property.outlines : []).slice(0, 8).flatMap(polygonRings),
      roads, roadStatus: a.roads?.status === 'available' ? 'read' : 'unavailable', roofStatus: Array.isArray(a.buildings) ? 'read' : 'unavailable' };
  } catch (e) { if (signal.aborted) throw e; return null; }
}
export function siteContextStatus(c: SiteContext | null | undefined): string {
  if (!c) return 'The combined LINZ parcel, roof and road view was unavailable. None of those layers is guessed.';
  return `Read ${c.fetched} (lookup date): ${c.parcel.length ? 'primary parcel (50772)' : c.parcelStatus==='unavailable'?'primary parcel unavailable':'no primary parcel mapped here'}, ${c.roofStatus === 'read' ? c.roofs.length + ' roof outline rings (101290)' : 'roof outlines unavailable'}, ${c.roadStatus === 'read' ? [...new Set(c.roads.map(r => r.name))].length + ' named road(s) (123110)' : 'named roads unavailable'}${c.property.length ? ', property outlines (122657)' : ''}. LINZ Data Service, CC BY 4.0. Mapped context, not a survey, current building height, road formation or legal access.`;
}

export function clipLine(a: EN,b: EN, cx: number,cz: number,half: number): [EN, EN] | null {
  const dx=b[0]-a[0], dz=b[1]-a[1]; let t0=0,t1=1;
  for (const [p,q] of [[-dx,a[0]-(cx-half)],[dx,cx+half-a[0]],[-dz,a[1]-(cz-half)],[dz,cz+half-a[1]]]) {
    if (!p) { if (q<0) return null; continue; }
    const t=q/p; if(p<0) t0=Math.max(t0,t); else t1=Math.min(t1,t);
    if(t0>t1) return null;
  }
  return [[a[0]+dx*t0,a[1]+dz*t0],[a[0]+dx*t1,a[1]+dz*t1]];
}
export function clearLinzScene(root: THREE.Group) {
  for (const ob of [...root.children]) {
    root.remove(ob);
    ob.traverse(o=>{
      const x=o as THREE.Mesh | THREE.Sprite; if ('geometry' in x && !(x as THREE.Sprite).isSprite) x.geometry?.dispose();
      if (x.material && !Array.isArray(x.material)) { (x.material as THREE.SpriteMaterial).map?.dispose(); x.material.dispose(); }
    });
  }
}
export function drawLinzScene(root: THREE.Group,c: SiteContext | null | undefined, transform: (e:number,n:number)=>EN, yAt:(x:number,z:number)=>number, square:{ cx:number; cz:number; size:number }, showParcel = false) {
  clearLinzScene(root);
  if(!c) return;
  const {cx,cz,size}=square, half=size/2-1;
  const collected=(rings: EN[][], lift:number)=> {
    const out:number[]=[], marks:Array<{length:number; centre:EN}>=[];
    for(const r of rings) for(let i=1;i<r.length&&out.length<90000;i++) {
      const s=clipLine(transform(...r[i-1]),transform(...r[i]),cx,cz,half); if(!s)continue;
      const [a,b]=s, L=Math.hypot(b[0]-a[0],b[1]-a[1]); if(L<.1)continue;
      const steps=Math.min(140,Math.ceil(L/1.5)); marks.push({length:L,centre:[(a[0]+b[0])/2,(a[1]+b[1])/2]});
      let previous:number[]|null=null;
      for(let j=0;j<=steps;j++){
        const t=j/steps,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t,y=yAt(x,z);
        const v=Number.isFinite(y)?[x,y+lift,z]:null;
        if (v&&previous)out.push(...previous,...v); previous=v;
      }
    }
    return {out,marks};
  };
  const show=(label:string, data:number[], color:number) => {
    if(!data.length)return;
    const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(data,3));
    const ob=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color,transparent:true,opacity:.9}));ob.name=label;root.add(ob);
  };
  if(showParcel)show('Primary parcels · LINZ 50772',collected(c.parcel,.16).out,0xffc184);
  show('Existing roof outlines · LINZ 101290',collected(c.roofs,.18).out,0xffe2a2);
  show('Property boundaries · LINZ 122657',collected(c.property,.24).out,0xb85b75);
  const roadData:number[]=[], labelPositions=new Map<string,{length:number;centre:EN}>();
  for(const road of c.roads) {
    const r=road.geometry, stats=collected(r.type==='LineString'?[r.coordinates]:r.coordinates,.19);
    roadData.push(...stats.out);
    for(const mark of stats.marks) if(mark.length>(labelPositions.get(road.name)?.length??0)) labelPositions.set(road.name,mark);
  }
  show('Named road centrelines · LINZ 123110',roadData,0x9ee7ff);
  for(const [name,m] of [...labelPositions].sort((a,b)=>b[1].length-a[1].length).slice(0,10)) {
    const canvas=document.createElement('canvas'); canvas.height=80; canvas.width=512;
    const x2=canvas.getContext('2d');if(!x2)continue;
    x2.font='bold 36px system-ui'; const w=Math.min(500,Math.ceil(x2.measureText(name).width)+36);
    x2.fillStyle='#221b21ed';x2.beginPath();x2.roundRect((512-w)/2,14,w,52,9);x2.fill();
    x2.fillStyle='#e5f8ff';x2.textAlign='center';x2.textBaseline='middle';x2.fillText(name,256,41,480);
    const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
    const label=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false,toneMapped:false}));
    const [x,z]=m.centre,y=yAt(x,z);if(!Number.isFinite(y)){tex.dispose();label.material.dispose();continue;}
    label.name=name;label.position.set(x,y+2.1,z);label.scale.set(13,2.03,1);root.add(label);
  }
}
