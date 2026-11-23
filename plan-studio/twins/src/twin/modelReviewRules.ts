/** Private presentation data; no project IDs, geometry edits or network in these rules. */
export const REVIEW_SCHEMA = 'assembl.model-review.v1';
export const REVIEW_SLOTS = ['walk_review', 'design_interior', 'design_exterior'] as const;
export const GLASS = [
  { id:'studio', label:'Studio finish', tint:null },
  { id:'authored', label:'As authored', tint:null },
  { id:'clear', label:'Clear daylight', tint:[0.86, 0.93, 0.95] as [number,number,number] },
  { id:'bronze', label:'Warm bronze', tint:[0.66, 0.50, 0.34] as [number,number,number] },
  { id:'smoke', label:'Soft smoke', tint:[0.46, 0.50, 0.54] as [number,number,number] },
] as const;
export type GlassMode = typeof GLASS[number]['id'];
export type V3 = [number,number,number];
export type Point = { id:string; label:string; eye:V3; look:V3; note:string };
type Layer = { sha256:string; credit:string; approvedBy:string };
export type Review = { modelSha256:string; points:Point[]; layers:Partial<Record<'interior'|'exterior', Layer>> };
const fingerprint = /^[a-f\d]{64}$/;
const vector = (v: unknown): v is V3 => Array.isArray(v) && v.length===3 && v.every(n=>typeof n==='number' && Number.isFinite(n) && Math.abs(n)<1e9);
const plain = (x:unknown): x is Record<string,unknown> => !!x && typeof x==='object' && !Array.isArray(x);
const word = (a:unknown,n:number):string => typeof a==='string' && a.trim().length<=n ? a.trim() : '';

export function readReview(a:unknown, modelSha256:string): Review {
  if (!plain(a) || a.schema!==REVIEW_SCHEMA) throw Error('Use an assembl.model-review.v1 file.');
  if (typeof a.modelSha256!=='string' || !fingerprint.test(a.modelSha256) || a.modelSha256!==modelSha256) throw Error('Walkthrough setup belongs to a different model file.');
  if (!Array.isArray(a.points) || a.points.length>32) throw Error('Walkthrough setup needs a points list (up to 32).');
  const seen = new Set<string>();
  const points = a.points.map((p:unknown): Point => {
    if (!plain(p)) throw Error('Invalid walkthrough point.');
    const id=word(p.id,64), label=word(p.label,80), eye=p.eye, look=p.look;
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(id) || seen.has(id) || !label ||
        !vector(eye) || !vector(look) || Math.hypot(...eye.map((v,i)=>v-look[i]))<0.1) throw Error('Invalid or duplicate walkthrough point.');
    seen.add(id);
    return {id,label,eye:[...eye],look:[...look],note:word(p.note,320)};
  });
  const layers:Review['layers']={};
  if (a.layers!==undefined && !plain(a.layers)) throw Error('Invalid design-layer list.');
  const supplied=plain(a.layers)?a.layers:{};
  for (const k of ['interior','exterior'] as const) {
    const d=supplied[k]; if(d===undefined)continue;
    if(!plain(d)||typeof d.sha256!=='string'||!fingerprint.test(d.sha256)||!word(d.credit,180)||!word(d.approvedBy,100))
      throw Error('Each layer needs its exact file hash, source and named approval.');
    layers[k]={sha256:d.sha256,credit:word(d.credit,180),approvedBy:word(d.approvedBy,100)};
  }
  return { modelSha256:a.modelSha256, points, layers };
}

export async function sha256(bytes:ArrayBuffer):Promise<string>{
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
}
/** Only self-contained binary glTF. Reject URIs (even embedded data URIs) and unknown loader extensions. */
export function safeLayer(bytes:ArrayBuffer):boolean{
  if(bytes.byteLength<20||bytes.byteLength>24*1024*1024)return false;
  const v=new DataView(bytes), end=20+v.getUint32(12,true);
  if(v.getUint32(0,true)!==0x46546c67||v.getUint32(4,true)!==2||v.getUint32(8,true)!==bytes.byteLength||
     v.getUint32(16,true)!==0x4e4f534a||end>bytes.byteLength)return false;
  try {
    const a=JSON.parse(new TextDecoder().decode(new Uint8Array(bytes,20,end-20)));
    const extensions=new Set(['EXT_meshopt_compression','EXT_mesh_gpu_instancing','KHR_mesh_quantization','KHR_texture_transform','EXT_texture_webp','KHR_materials_unlit','KHR_materials_transmission','KHR_materials_ior','KHR_materials_clearcoat','KHR_materials_specular','KHR_materials_emissive_strength','KHR_materials_volume']);
    if (!plain(a)||!Array.isArray(a.meshes)||!a.meshes.length) return false;
    if ([a.extensionsUsed,a.extensionsRequired].some(l=>l!==undefined&&(!Array.isArray(l)||l.some(x=>!extensions.has(x))))) return false;
    return !/"(?:uri|url)"\s*:/i.test(JSON.stringify(a));
  }catch{return false}
}

/** The named authored treatment must not turn into a generic clear sheet. */
export function unalteredGlass(material:string, text:string): boolean {
  return /\b(frost(?:ed)?|obscure|frit(?:ted)?|pattern(?:ed)?|printed|etched|opaque|stained)\b/i.test(material.replace(/\b(?:no|without)\s+pattern\b/gi, '')) ||
    /\b(frosted|patterned|fritted|printed|etched|stained)\s+(glass|glazing)\b/i.test(text);
}
